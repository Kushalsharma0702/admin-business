// routes/client-documents.js — OCR document endpoints (PostgreSQL async edition)
const express = require("express");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { fail, ok } = require("../helpers");
const { requireAuth, JWT_SECRET } = require("../middleware/auth");
const { putObject, getDownloadUrl } = require("../config/aws");
const env = require("../config/env");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Accepts both admin tokens (role:"admin") and client tokens (role:"client" / Python access tokens).
// Sets req.isAdmin = true for admin tokens so downstream routes can branch.
function requireAdminOrClient(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }

  req.user = payload;
  req.isAdmin = payload.role === "admin";
  return next();
}

// Helper: build a presigned download URL for a document row (returns null on error).
async function presignDoc(doc) {
  if (!doc.s3_key) return null;
  try {
    return await getDownloadUrl({
      bucket: doc.s3_bucket || env.S3_BUCKET,
      key: doc.s3_key,
    });
  } catch {
    return null;
  }
}

// Map a DB row to the shape the admin frontend expects.
function formatDoc(doc, url) {
  return {
    id:                doc.id,
    clientId:          doc.client_id,
    name:              doc.name || doc.original_filename,
    type:              doc.document_type || "ocr",
    status:            doc.status || "uploaded",
    version:           1,
    uploadedAt:        doc.uploaded_at,
    fileType:          doc.file_type,
    fileSize:          doc.file_size,
    original_filename: doc.original_filename,
    sectionKey:        doc.section_name || null,
    url,
  };
}

// ── 4.0  GET /v3/api/v1/documents ──────────────────────────────────────────
// Admin: pass ?client_id=<uuid> to list documents for any client.
// Client: returns only their own documents (client_id from token).
router.get("/", requireAdminOrClient, async (req, res) => {
  const clientId = req.isAdmin ? req.query.client_id : req.user.sub;
  if (!clientId) {
    return res.status(400).json(fail("client_id query parameter is required"));
  }

  const { rows } = await db.query(
    `SELECT * FROM documents WHERE client_id = $1 ORDER BY uploaded_at DESC`,
    [clientId]
  );

  const docs = await Promise.all(
    rows.map(async (row) => formatDoc(row, await presignDoc(row)))
  );

  return res.json(ok(docs, "Documents fetched"));
});

// ── 4.1  POST /v3/api/v1/documents/upload ──────────────────────────────────
router.post("/upload", requireAuth("client"), upload.single("file"), async (req, res) => {
  const clientId = req.user.sub;
  if (!req.file) return res.status(400).json(fail("file is required"));

  const allowed = ["pdf", "jpg", "jpeg", "png"];
  const ext = req.file.originalname.split(".").pop()?.toLowerCase();
  if (!allowed.includes(ext)) {
    return res.status(400).json(fail(`Invalid file type. Allowed: ${allowed.join(", ")}`));
  }

  const category  = req.body?.category  || "ocr";
  const filing_id = req.body?.filing_id || null;
  const name      = req.file.originalname.replace(/\.[^.]+$/, "");
  const s3Key     = `uploads/ocr/${clientId}/${Date.now()}_${req.file.originalname}`;

  try {
    await putObject({
      bucket:      env.S3_BUCKET,
      key:         s3Key,
      body:        req.file.buffer,
      contentType: req.file.mimetype,
    });
  } catch (s3Err) {
    console.error("S3 upload failed:", s3Err.message);
    return res.status(500).json(fail("Failed to store document. Please try again."));
  }

  const { rows: [doc] } = await db.query(
    `INSERT INTO documents
       (client_id, filing_id, name, original_filename, file_type, file_size, document_type, s3_key, status, ocr_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'uploaded','pending')
     RETURNING *`,
    [clientId, filing_id, name, req.file.originalname, req.file.mimetype, req.file.size, category, s3Key]
  );

  return res.status(201).json(ok({
    id:                doc.id,
    filing_id:         doc.filing_id,
    name:              doc.name,
    original_filename: doc.original_filename,
    file_type:         doc.file_type,
    file_size:         doc.file_size,
    section_name:      null,
    document_type:     doc.document_type,
    status:            "uploaded",
    ocr_status:        "pending",
    uploaded_at:       doc.uploaded_at,
    created_at:        doc.created_at,
  }, "Document uploaded for OCR processing"));
});

// ── 4.2  GET /v3/api/v1/documents/ocr-status ───────────────────────────────
router.get("/ocr-status", requireAuth("client"), async (req, res) => {
  const clientId = req.user.sub;
  const ids = (req.query.document_ids || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!ids.length) return res.status(400).json(fail("document_ids query param is required"));

  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  const { rows } = await db.query(
    `SELECT id, ocr_status, ocr_processed_at FROM documents
     WHERE id IN (${placeholders}) AND client_id=$${ids.length + 1}`,
    [...ids, clientId]
  );

  return res.json(ok(
    rows.map((r) => ({ documentId: r.id, ocrStatus: r.ocr_status, processedAt: r.ocr_processed_at || null })),
    "OCR status fetched"
  ));
});

// ── 4.3  GET /v3/api/v1/documents/:document_id/download ────────────────────
// Returns a short-lived presigned S3 URL. Admin can download any doc; client
// can only download their own.
router.get("/:document_id/download", requireAdminOrClient, async (req, res) => {
  const query = req.isAdmin
    ? "SELECT * FROM documents WHERE id=$1"
    : "SELECT * FROM documents WHERE id=$1 AND client_id=$2";
  const params = req.isAdmin
    ? [req.params.document_id]
    : [req.params.document_id, req.user.sub];

  const { rows: [doc] } = await db.query(query, params);
  if (!doc) return res.status(404).json(fail("Document not found"));
  if (!doc.s3_key) return res.status(404).json(fail("File not yet available"));

  const url = await presignDoc(doc);
  if (!url) return res.status(500).json(fail("Could not generate download link"));

  return res.json(ok({ url, expiresIn: 3600 }, "Download URL generated"));
});

// ── 4.4  GET /v3/api/v1/documents/:document_id/ocr-result ──────────────────
router.get("/:document_id/ocr-result", requireAuth("client"), async (req, res) => {
  const { rows: [row] } = await db.query(
    "SELECT * FROM documents WHERE id=$1 AND client_id=$2",
    [req.params.document_id, req.user.sub]
  );
  if (!row) return res.status(404).json(fail("Document not found"));
  if (row.ocr_status !== "completed") {
    return res.status(400).json(fail(`OCR not yet completed. Status: ${row.ocr_status}`));
  }

  const result = row.ocr_result || {};
  return res.json(ok({
    documentId:      row.id,
    ocrStatus:       row.ocr_status,
    extractedText:   result.extractedText   || "",
    extractedFields: result.extractedFields || {},
    confidence:      row.ocr_confidence     || null,
    processedAt:     row.ocr_processed_at,
  }, "OCR result fetched"));
});

module.exports = router;
