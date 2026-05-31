// routes/client-documents.js — OCR document endpoints
const express = require("express");
const multer = require("multer");
const db = require("../db");
const { fail, ok, genId, nowIso } = require("../helpers");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
router.use(requireAuth("client"));

// 4.1 POST /documents/upload
router.post("/upload", upload.single("file"), (req, res) => {
  const clientId = req.user.sub;
  if (!req.file) return res.status(400).json(fail("file is required"));
  const allowed = ["pdf","jpg","jpeg","png"];
  const ext = req.file.originalname.split(".").pop()?.toLowerCase();
  if (!allowed.includes(ext)) return res.status(400).json(fail(`Invalid file type. Allowed: ${allowed.join(", ")}`));
  const category = req.body?.category || "ocr";
  const filing_id = req.body?.filing_id || null;
  const id = genId("ocr-doc");
  const now = nowIso();
  const name = req.file.originalname.replace(/\.[^.]+$/, "");
  db.prepare(`INSERT INTO documents (id,client_id,filing_id,name,original_filename,file_type,file_size,document_type,storage_path,status,ocr_status,uploaded_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, clientId, filing_id, name, req.file.originalname, req.file.mimetype, req.file.size, category, `uploads/ocr/${clientId}/${id}`, "uploaded", "pending", now, now);
  return res.status(201).json(ok({ id, filing_id, name, original_filename: req.file.originalname, file_type: req.file.mimetype, file_size: req.file.size, section_name: null, document_type: category, status: "uploaded", ocr_status: "pending", uploaded_at: now, created_at: now }, "Document uploaded for OCR processing"));
});

// 4.2 GET /documents/ocr-status
router.get("/ocr-status", (req, res) => {
  const clientId = req.user.sub;
  const ids = (req.query.document_ids || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!ids.length) return res.status(400).json(fail("document_ids query param is required"));
  const placeholders = ids.map(() => "?").join(",");
  const rows = db.prepare(`SELECT id,ocr_status,ocr_processed_at FROM documents WHERE id IN (${placeholders}) AND client_id=?`).all(...ids, clientId);
  return res.json(ok(rows.map(r => ({ documentId: r.id, ocrStatus: r.ocr_status, processedAt: r.ocr_processed_at || null })), "OCR status fetched"));
});

// 4.3 GET /documents/:document_id/ocr-result
router.get("/:document_id/ocr-result", (req, res) => {
  const row = db.prepare("SELECT * FROM documents WHERE id=? AND client_id=?").get(req.params.document_id, req.user.sub);
  if (!row) return res.status(404).json(fail("Document not found"));
  if (row.ocr_status !== "completed") return res.status(400).json(fail(`OCR not yet completed. Status: ${row.ocr_status}`));
  let result = {};
  try { result = JSON.parse(row.ocr_result); } catch {}
  return res.json(ok({ documentId: row.id, ocrStatus: row.ocr_status, extractedText: result.extractedText || "", extractedFields: result.extractedFields || {}, confidence: row.ocr_confidence || null, processedAt: row.ocr_processed_at }, "OCR result fetched"));
});

module.exports = router;
