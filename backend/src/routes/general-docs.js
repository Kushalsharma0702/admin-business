// routes/general-docs.js — General Documentation: admin config + client uploads
const express = require("express");
const multer  = require("multer");
const db      = require("../db");
const { fail, ok } = require("../helpers");
const { requireAuth } = require("../middleware/auth");
const { getDownloadUrl, putObject, buildS3Key } = require("../config/aws");
const env = require("../config/env");

// ── Helpers ───────────────────────────────────────────────────────────────────

const ACCEPTED_TYPES = ["pdf", "jpg", "jpeg", "png", "xls", "xlsx", "doc", "docx", "csv"];

function validateFields(fields) {
  if (!Array.isArray(fields)) return "fields must be an array";
  for (const f of fields) {
    if (!f.key || typeof f.key !== "string") return "Each field must have a string key";
    if (f.maxCount !== undefined && (typeof f.maxCount !== "number" || f.maxCount < 1 || f.maxCount > 50))
      return `Field '${f.key}' maxCount must be 1-50`;
  }
  return null;
}

function normalizeFields(fields) {
  return fields.map((f, idx) => ({
    key:           f.key.trim().toLowerCase().replace(/\s+/g, "_"),
    name:          (f.name || f.key || "").trim(),
    placeholder:   (f.placeholder || "").trim(),
    required:      f.required === true,
    maxCount:      Math.max(1, Math.min(50, Number(f.maxCount) || 1)),
    acceptedTypes: Array.isArray(f.acceptedTypes) && f.acceptedTypes.length
      ? f.acceptedTypes.filter((t) => ACCEPTED_TYPES.includes(t.toLowerCase()))
      : ACCEPTED_TYPES,
    notes:         (f.notes || "").trim(),
    displayOrder:  typeof f.displayOrder === "number" ? f.displayOrder : idx + 1,
  }));
}

async function getConfigForClient(clientId) {
  const { rows: [cfg] } = await db.query(
    "SELECT * FROM general_doc_configs WHERE client_id=$1",
    [clientId]
  );
  return cfg || null;
}

async function getUploadsForClient(clientId) {
  const { rows } = await db.query(
    "SELECT * FROM general_doc_uploads WHERE client_id=$1 ORDER BY field_key, slot_index",
    [clientId]
  );
  return rows;
}

function buildDocStatus(config, uploads) {
  if (!config || !config.enabled) return { enabled: false, fields: [], overall: "not_required" };

  const fields = (config.fields || []).map((f) => {
    const fieldUploads = uploads.filter((u) => u.field_key === f.key);
    const slots = Array.from({ length: f.maxCount }, (_, i) => {
      const slotIdx = i + 1;
      const upload = fieldUploads.find((u) => u.slot_index === slotIdx) || null;
      return {
        slotIndex:    slotIdx,
        uploadedFile: upload ? {
          id:               upload.id,
          fileName:         upload.file_name,
          originalFilename: upload.original_filename,
          fileType:         upload.file_type,
          fileSize:         upload.file_size,
          s3Key:            upload.s3_key,
          uploadedAt:       upload.uploaded_at,
        } : null,
        status: upload ? "uploaded" : "pending",
      };
    });

    return {
      ...f,
      uploadedCount: fieldUploads.length,
      pendingCount:  Math.max(0, f.maxCount - fieldUploads.length),
      slots,
      status: f.required
        ? (fieldUploads.length >= f.maxCount ? "complete" : "pending")
        : (fieldUploads.length > 0 ? "complete" : "optional"),
    };
  });

  const requiredFields = fields.filter((f) => f.required);
  const allRequiredComplete = requiredFields.every((f) => f.status === "complete");
  const anyUploaded = uploads.length > 0;

  const overall = allRequiredComplete
    ? "submitted"
    : anyUploaded ? "partial" : "pending";

  return { enabled: true, fields, overall };
}

// ── Admin Router ──────────────────────────────────────────────────────────────

const adminRouter = express.Router();
adminRouter.use(requireAuth("admin"));

// GET /api/admin/clients/:clientId/general-docs
// Returns the config + upload status for a client
adminRouter.get("/clients/:clientId/general-docs", async (req, res) => {
  const { rows: [client] } = await db.query(
    "SELECT id FROM users WHERE (id::text=$1 OR slug=$1) AND role='client'",
    [req.params.clientId]
  );
  if (!client) return res.status(404).json(fail("Client not found"));

  const [config, uploads] = await Promise.all([
    getConfigForClient(client.id),
    getUploadsForClient(client.id),
  ]);

  const status = buildDocStatus(config, uploads);

  return res.json(ok({
    clientId:    client.id,
    config:      config ? { enabled: config.enabled, fields: config.fields, updatedAt: config.updated_at } : null,
    ...status,
    uploadCount: uploads.length,
    uploads:     uploads.map((u) => ({
      id:               u.id,
      fieldKey:         u.field_key,
      slotIndex:        u.slot_index,
      fileName:         u.file_name,
      originalFilename: u.original_filename,
      fileType:         u.file_type,
      fileSize:         u.file_size,
      s3Key:            u.s3_key,
      uploadedAt:       u.uploaded_at,
    })),
  }, "General documentation status fetched"));
});

// PUT /api/admin/clients/:clientId/general-docs
// Create or update the general doc config for a client
adminRouter.put("/clients/:clientId/general-docs", async (req, res) => {
  const { rows: [client] } = await db.query(
    "SELECT id FROM users WHERE (id::text=$1 OR slug=$1) AND role='client'",
    [req.params.clientId]
  );
  if (!client) return res.status(404).json(fail("Client not found"));

  const { enabled = true, fields = [] } = req.body;

  const validationError = validateFields(fields);
  if (validationError) return res.status(400).json(fail(validationError));

  const normalizedFields = normalizeFields(fields);

  const { rows: [cfg] } = await db.query(
    `INSERT INTO general_doc_configs (client_id, enabled, fields, created_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (client_id) DO UPDATE
       SET enabled=$2, fields=$3, updated_at=NOW()
     RETURNING *`,
    [client.id, enabled, JSON.stringify(normalizedFields), req.user.sub]
  );

  return res.json(ok({
    clientId:  client.id,
    enabled:   cfg.enabled,
    fields:    cfg.fields,
    updatedAt: cfg.updated_at,
  }, "General documentation config saved"));
});

// DELETE /api/admin/general-docs/uploads/:uploadId
// Admin can delete a client's uploaded file
adminRouter.delete("/general-docs/uploads/:uploadId", async (req, res) => {
  const { rows: [upload] } = await db.query(
    "SELECT * FROM general_doc_uploads WHERE id=$1",
    [req.params.uploadId]
  );
  if (!upload) return res.status(404).json(fail("Upload not found"));

  await db.query("DELETE FROM general_doc_uploads WHERE id=$1", [upload.id]);
  return res.json(ok({ id: upload.id, deletedAt: new Date().toISOString() }, "Upload deleted"));
});

// GET /api/admin/general-docs/uploads/:uploadId/download
// Get a presigned download URL for an admin to preview/download
adminRouter.get("/general-docs/uploads/:uploadId/download", async (req, res) => {
  const { rows: [upload] } = await db.query(
    "SELECT * FROM general_doc_uploads WHERE id=$1",
    [req.params.uploadId]
  );
  if (!upload) return res.status(404).json(fail("Upload not found"));
  if (!upload.s3_key) return res.status(400).json(fail("No S3 file associated with this upload"));

  try {
    const url = await getDownloadUrl({ bucket: upload.s3_bucket || env.S3_BUCKET, key: upload.s3_key });
    return res.json(ok({ downloadUrl: url, fileName: upload.original_filename }, "Download URL generated"));
  } catch {
    return res.status(500).json(fail("Could not generate download URL"));
  }
});

// ── Client Router ─────────────────────────────────────────────────────────────

const clientRouter = express.Router();
clientRouter.use(requireAuth("client"));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// GET /v3/api/v1/general-docs
// Client: get their general documentation config + upload status
clientRouter.get("/", async (req, res) => {
  const clientId = req.user.sub;
  const [config, uploads] = await Promise.all([
    getConfigForClient(clientId),
    getUploadsForClient(clientId),
  ]);

  const status = buildDocStatus(config, uploads);
  return res.json(ok({ clientId, ...status }, "General documentation fetched"));
});

// POST /v3/api/v1/general-docs/upload
// Client: upload a file for a specific field + slot
clientRouter.post("/upload", upload.single("file"), async (req, res) => {
  const clientId = req.user.sub;

  const config = await getConfigForClient(clientId);
  if (!config || !config.enabled) {
    return res.status(400).json(fail("General documentation is not enabled for your account"));
  }

  if (!req.file) return res.status(400).json(fail("file is required"));

  const { fieldKey, slotIndex: rawSlot } = req.body;
  if (!fieldKey) return res.status(400).json(fail("fieldKey is required"));

  const fields = config.fields || [];
  const fieldDef = fields.find((f) => f.key === fieldKey);
  if (!fieldDef) return res.status(400).json(fail(`Unknown field key: ${fieldKey}`));

  const slotIndex = Number(rawSlot) || 1;
  if (slotIndex < 1 || slotIndex > fieldDef.maxCount) {
    return res.status(400).json(fail(`slotIndex must be between 1 and ${fieldDef.maxCount} for field '${fieldDef.name}'`));
  }

  const ext = req.file.originalname.split(".").pop()?.toLowerCase() || "";
  const allowed = fieldDef.acceptedTypes || ACCEPTED_TYPES;
  if (!allowed.includes(ext)) {
    return res.status(400).json(fail(`Invalid file type .${ext}. Allowed: ${allowed.join(", ")}`));
  }

  const s3Key = buildS3Key({
    clientId, taskId: "general-docs", fieldId: fieldKey,
    fileName: `slot${slotIndex}_${Date.now()}_${req.file.originalname}`,
  });

  let s3KeyFinal = s3Key;
  try {
    await putObject({ key: s3Key, body: req.file.buffer, contentType: req.file.mimetype });
  } catch {
    s3KeyFinal = null; // local dev fallback
  }

  // Upsert: replace any existing upload for this slot
  const { rows: [existing] } = await db.query(
    "SELECT id FROM general_doc_uploads WHERE client_id=$1 AND field_key=$2 AND slot_index=$3",
    [clientId, fieldKey, slotIndex]
  );
  if (existing) {
    await db.query("DELETE FROM general_doc_uploads WHERE id=$1", [existing.id]);
  }

  const { rows: [doc] } = await db.query(
    `INSERT INTO general_doc_uploads
       (client_id, field_key, slot_index, file_name, original_filename, file_type, file_size, s3_key, s3_bucket)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [clientId, fieldKey, slotIndex, req.file.originalname, req.file.originalname,
     req.file.mimetype, req.file.size, s3KeyFinal, env.S3_BUCKET]
  );

  return res.status(201).json(ok({
    id:          doc.id,
    fieldKey:    doc.field_key,
    slotIndex:   doc.slot_index,
    fileName:    doc.file_name,
    fileSize:    doc.file_size,
    uploadedAt:  doc.uploaded_at,
  }, "File uploaded successfully"));
});

// DELETE /v3/api/v1/general-docs/upload/:uploadId
// Client: remove one of their uploads
clientRouter.delete("/upload/:uploadId", async (req, res) => {
  const clientId = req.user.sub;
  const { rows: [upload] } = await db.query(
    "SELECT * FROM general_doc_uploads WHERE id=$1 AND client_id=$2",
    [req.params.uploadId, clientId]
  );
  if (!upload) return res.status(404).json(fail("Upload not found"));

  await db.query("DELETE FROM general_doc_uploads WHERE id=$1", [upload.id]);
  return res.json(ok({ id: upload.id }, "Upload removed"));
});

// GET /v3/api/v1/general-docs/upload/:uploadId/download
clientRouter.get("/upload/:uploadId/download", async (req, res) => {
  const clientId = req.user.sub;
  const { rows: [upload] } = await db.query(
    "SELECT * FROM general_doc_uploads WHERE id=$1 AND client_id=$2",
    [req.params.uploadId, clientId]
  );
  if (!upload) return res.status(404).json(fail("Upload not found"));
  if (!upload.s3_key) return res.status(400).json(fail("No file associated with this upload"));

  try {
    const url = await getDownloadUrl({ bucket: upload.s3_bucket || env.S3_BUCKET, key: upload.s3_key });
    return res.json(ok({ downloadUrl: url }, "Download URL generated"));
  } catch {
    return res.status(500).json(fail("Could not generate download URL"));
  }
});

module.exports = { adminRouter, clientRouter };
