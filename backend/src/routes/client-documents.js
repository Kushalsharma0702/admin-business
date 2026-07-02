// routes/client-documents.js — OCR document endpoints (PostgreSQL async edition)
const express = require("express");
const multer = require("multer");
const db = require("../db");
const { fail, ok } = require("../helpers");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
router.use(requireAuth("client"));

// 4.1 POST /v3/api/v1/documents/upload
router.post("/upload", upload.single("file"), async (req, res) => {
  const clientId = req.user.sub;
  if (!req.file) return res.status(400).json(fail("file is required"));

  const allowed = ["pdf", "jpg", "jpeg", "png"];
  const ext = req.file.originalname.split(".").pop()?.toLowerCase();
  if (!allowed.includes(ext)) return res.status(400).json(fail(`Invalid file type. Allowed: ${allowed.join(", ")}`));

  const category   = req.body?.category   || "ocr";
  const filing_id  = req.body?.filing_id  || null;
  const name       = req.file.originalname.replace(/\.[^.]+$/, "");
  const s3Key      = `uploads/ocr/${clientId}/${Date.now()}_${req.file.originalname}`;

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

// 4.2 GET /v3/api/v1/documents/ocr-status
router.get("/ocr-status", async (req, res) => {
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

// 4.3 GET /v3/api/v1/documents/:document_id/ocr-result
router.get("/:document_id/ocr-result", async (req, res) => {
  const { rows: [row] } = await db.query(
    "SELECT * FROM documents WHERE id=$1 AND client_id=$2",
    [req.params.document_id, req.user.sub]
  );
  if (!row) return res.status(404).json(fail("Document not found"));
  if (row.ocr_status !== "completed") return res.status(400).json(fail(`OCR not yet completed. Status: ${row.ocr_status}`));

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
