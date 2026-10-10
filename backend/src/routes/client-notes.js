// routes/client-notes.js — Internal admin notes per client, with optional
// image attachments. Admin-only: no client-facing router. Never surfaced to
// the client app — these are staff-internal, unlike General Documentation.
const express = require("express");
const multer  = require("multer");
const db      = require("../db");
const { fail, ok } = require("../helpers");
const { requireAuth } = require("../middleware/auth");
const { getDownloadUrl, putObject, buildS3Key } = require("../config/aws");
const env = require("../config/env");

const IMAGE_TYPES = ["jpg", "jpeg", "png", "gif", "webp", "heic"];
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

function serializeImage(row) {
  return {
    id:               row.id,
    originalFilename: row.original_filename,
    fileType:         row.file_type,
    fileSize:         Number(row.file_size),
    uploadedAt:       row.uploaded_at,
  };
}

function serializeNote(row, images) {
  return {
    id:         row.id,
    text:       row.text,
    authorName: row.author_name,
    createdAt:  row.created_at,
    updatedAt:  row.updated_at,
    images:     images.map(serializeImage),
  };
}

async function getImagesForNotes(noteIds) {
  if (!noteIds.length) return new Map();
  const { rows } = await db.query(
    "SELECT * FROM client_note_images WHERE note_id = ANY($1) ORDER BY uploaded_at",
    [noteIds]
  );
  const byNote = new Map();
  for (const row of rows) {
    if (!byNote.has(row.note_id)) byNote.set(row.note_id, []);
    byNote.get(row.note_id).push(row);
  }
  return byNote;
}

async function uploadNoteImages(noteId, files) {
  const inserted = [];
  for (const file of files) {
    const ext = (file.originalname.split(".").pop() || "").toLowerCase();
    if (!IMAGE_TYPES.includes(ext)) {
      throw new Error(`Invalid image type .${ext}. Allowed: ${IMAGE_TYPES.join(", ")}`);
    }
    const s3Key = buildS3Key({
      clientId: "notes", taskId: noteId, fileName: `${Date.now()}_${file.originalname}`,
    });
    let s3KeyFinal = s3Key;
    try {
      await putObject({ key: s3Key, body: file.buffer, contentType: file.mimetype });
    } catch {
      s3KeyFinal = null; // local dev fallback — no S3 credentials
    }
    const { rows: [row] } = await db.query(
      `INSERT INTO client_note_images
         (note_id, original_filename, file_type, file_size, s3_key, s3_bucket)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [noteId, file.originalname, file.mimetype, file.size, s3KeyFinal, env.S3_BUCKET]
    );
    inserted.push(row);
  }
  return inserted;
}

async function findClient(clientId) {
  const { rows: [client] } = await db.query(
    "SELECT id FROM users WHERE (id::text=$1 OR slug=$1) AND role='client'",
    [clientId]
  );
  return client;
}

// ── Admin Router ──────────────────────────────────────────────────────────────
const adminRouter = express.Router();
adminRouter.use(requireAuth("admin"));

// GET /api/admin/clients/:clientId/notes — list a client's internal notes
adminRouter.get("/clients/:clientId/notes", async (req, res) => {
  const client = await findClient(req.params.clientId);
  if (!client) return res.status(404).json(fail("Client not found"));

  const { rows: notes } = await db.query(
    "SELECT * FROM client_notes WHERE client_id=$1 ORDER BY created_at DESC",
    [client.id]
  );
  const imagesByNote = await getImagesForNotes(notes.map((n) => n.id));

  return res.json(ok({
    clientId: client.id,
    notes: notes.map((n) => serializeNote(n, imagesByNote.get(n.id) || [])),
  }, "Notes fetched"));
});

// POST /api/admin/clients/:clientId/notes — create a note, optionally with images
// multipart/form-data: text (string), images (0-10 files)
adminRouter.post("/clients/:clientId/notes", upload.array("images", 10), async (req, res) => {
  const client = await findClient(req.params.clientId);
  if (!client) return res.status(404).json(fail("Client not found"));

  const text = (req.body?.text || "").trim();
  const files = req.files || [];
  if (!text && files.length === 0) {
    return res.status(400).json(fail("Note text or at least one image is required"));
  }

  const { rows: [note] } = await db.query(
    `INSERT INTO client_notes (client_id, author_id, author_name, text)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [client.id, req.user.sub, req.user.name || null, text]
  );

  let images = [];
  try {
    images = await uploadNoteImages(note.id, files);
  } catch (err) {
    return res.status(400).json(fail(err.message));
  }

  return res.status(201).json(ok(serializeNote(note, images), "Note added"));
});

// POST /api/admin/notes/:noteId/images — attach more images to an existing note
adminRouter.post("/notes/:noteId/images", upload.array("images", 10), async (req, res) => {
  const { rows: [note] } = await db.query("SELECT * FROM client_notes WHERE id=$1", [req.params.noteId]);
  if (!note) return res.status(404).json(fail("Note not found"));

  const files = req.files || [];
  if (files.length === 0) return res.status(400).json(fail("At least one image is required"));

  let images = [];
  try {
    images = await uploadNoteImages(note.id, files);
  } catch (err) {
    return res.status(400).json(fail(err.message));
  }

  await db.query("UPDATE client_notes SET updated_at=NOW() WHERE id=$1", [note.id]);
  return res.status(201).json(ok(images.map(serializeImage), "Image(s) added"));
});

// DELETE /api/admin/notes/images/:imageId — remove one image from a note
adminRouter.delete("/notes/images/:imageId", async (req, res) => {
  const { rows: [image] } = await db.query("SELECT * FROM client_note_images WHERE id=$1", [req.params.imageId]);
  if (!image) return res.status(404).json(fail("Image not found"));

  await db.query("DELETE FROM client_note_images WHERE id=$1", [image.id]);
  return res.json(ok({ id: image.id }, "Image removed"));
});

// GET /api/admin/notes/images/:imageId/download — presigned URL to view/download an image
adminRouter.get("/notes/images/:imageId/download", async (req, res) => {
  const { rows: [image] } = await db.query("SELECT * FROM client_note_images WHERE id=$1", [req.params.imageId]);
  if (!image) return res.status(404).json(fail("Image not found"));
  if (!image.s3_key) return res.status(400).json(fail("No file associated with this image"));

  try {
    const url = await getDownloadUrl({ bucket: image.s3_bucket || env.S3_BUCKET, key: image.s3_key });
    return res.json(ok({ downloadUrl: url, fileName: image.original_filename }, "Download URL generated"));
  } catch {
    return res.status(500).json(fail("Could not generate download URL"));
  }
});

module.exports = { adminRouter };
