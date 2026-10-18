// routes/task-comments.js — the task-detail panel's data: internal admin
// comments, general-purpose file attachments, and the activity feed, all
// scoped to one task. Admin-only — never exposed to the client app. Mirrors
// client-notes.js's shape (014), but per-task instead of per-client, and
// attachments accept any file type rather than just images.
const express = require("express");
const multer  = require("multer");
const db      = require("../db");
const { fail, ok } = require("../helpers");
const { requireAuth } = require("../middleware/auth");
const { getDownloadUrl, putObject, buildS3Key } = require("../config/aws");
const env = require("../config/env");
const { getActivityLog } = require("../workflow-service");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

function serializeComment(row) {
  return {
    id:         row.id,
    text:       row.text,
    authorName: row.author_name,
    createdAt:  row.created_at,
    updatedAt:  row.updated_at,
  };
}

function serializeAttachment(row) {
  return {
    id:               row.id,
    originalFilename: row.original_filename,
    fileType:         row.file_type,
    fileSize:         Number(row.file_size),
    uploadedByName:   row.uploaded_by_name,
    uploadedAt:       row.uploaded_at,
  };
}

async function findTask(taskId) {
  const { rows: [task] } = await db.query("SELECT id, title FROM tasks WHERE id=$1", [taskId]);
  return task;
}

const adminRouter = express.Router();
adminRouter.use(requireAuth("admin"));

// GET /api/admin/tasks/:taskId/detail — everything the task-detail panel needs in one call
adminRouter.get("/tasks/:taskId/detail", async (req, res) => {
  const task = await findTask(req.params.taskId);
  if (!task) return res.status(404).json(fail("Task not found"));

  const [{ rows: comments }, { rows: attachments }, activity] = await Promise.all([
    db.query("SELECT * FROM task_comments WHERE task_id=$1 ORDER BY created_at DESC", [task.id]),
    db.query("SELECT * FROM task_attachments WHERE task_id=$1 ORDER BY uploaded_at DESC", [task.id]),
    getActivityLog(task.id),
  ]);

  return res.json(ok({
    taskId:      task.id,
    comments:    comments.map(serializeComment),
    attachments: attachments.map(serializeAttachment),
    activity,
  }, "Task detail fetched"));
});

// GET /api/admin/tasks/:taskId/comments
adminRouter.get("/tasks/:taskId/comments", async (req, res) => {
  const task = await findTask(req.params.taskId);
  if (!task) return res.status(404).json(fail("Task not found"));

  const { rows } = await db.query(
    "SELECT * FROM task_comments WHERE task_id=$1 ORDER BY created_at DESC", [task.id]);
  return res.json(ok(rows.map(serializeComment), "Comments fetched"));
});

// POST /api/admin/tasks/:taskId/comments — { text }
adminRouter.post("/tasks/:taskId/comments", async (req, res) => {
  const task = await findTask(req.params.taskId);
  if (!task) return res.status(404).json(fail("Task not found"));

  const text = (req.body?.text || "").trim();
  if (!text) return res.status(400).json(fail("Comment text is required"));

  const { rows: [comment] } = await db.query(
    `INSERT INTO task_comments (task_id, author_id, author_name, text)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [task.id, req.user.sub, req.user.name || null, text]
  );
  return res.status(201).json(ok(serializeComment(comment), "Comment added"));
});

// GET /api/admin/tasks/:taskId/attachments
adminRouter.get("/tasks/:taskId/attachments", async (req, res) => {
  const task = await findTask(req.params.taskId);
  if (!task) return res.status(404).json(fail("Task not found"));

  const { rows } = await db.query(
    "SELECT * FROM task_attachments WHERE task_id=$1 ORDER BY uploaded_at DESC", [task.id]);
  return res.json(ok(rows.map(serializeAttachment), "Attachments fetched"));
});

// POST /api/admin/tasks/:taskId/attachments — multipart/form-data: files (0-10)
adminRouter.post("/tasks/:taskId/attachments", upload.array("files", 10), async (req, res) => {
  const task = await findTask(req.params.taskId);
  if (!task) return res.status(404).json(fail("Task not found"));

  const files = req.files || [];
  if (files.length === 0) return res.status(400).json(fail("At least one file is required"));

  const inserted = [];
  for (const file of files) {
    const s3Key = buildS3Key({ clientId: "task-attachments", taskId: task.id, fileName: `${Date.now()}_${file.originalname}` });
    let s3KeyFinal = s3Key;
    try {
      await putObject({ key: s3Key, body: file.buffer, contentType: file.mimetype });
    } catch {
      s3KeyFinal = null; // local dev fallback — no S3 credentials
    }
    const { rows: [row] } = await db.query(
      `INSERT INTO task_attachments
         (task_id, uploaded_by, uploaded_by_name, original_filename, file_type, file_size, s3_key, s3_bucket)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [task.id, req.user.sub, req.user.name || null, file.originalname, file.mimetype, file.size, s3KeyFinal, env.S3_BUCKET]
    );
    inserted.push(row);
  }
  return res.status(201).json(ok(inserted.map(serializeAttachment), "Attachment(s) added"));
});

// DELETE /api/admin/attachments/:attachmentId
adminRouter.delete("/attachments/:attachmentId", async (req, res) => {
  const { rows: [att] } = await db.query("SELECT * FROM task_attachments WHERE id=$1", [req.params.attachmentId]);
  if (!att) return res.status(404).json(fail("Attachment not found"));

  await db.query("DELETE FROM task_attachments WHERE id=$1", [att.id]);
  return res.json(ok({ id: att.id }, "Attachment removed"));
});

// GET /api/admin/attachments/:attachmentId/download — presigned URL
adminRouter.get("/attachments/:attachmentId/download", async (req, res) => {
  const { rows: [att] } = await db.query("SELECT * FROM task_attachments WHERE id=$1", [req.params.attachmentId]);
  if (!att) return res.status(404).json(fail("Attachment not found"));
  if (!att.s3_key) return res.status(400).json(fail("No file associated with this attachment"));

  try {
    const url = await getDownloadUrl({ bucket: att.s3_bucket || env.S3_BUCKET, key: att.s3_key });
    return res.json(ok({ downloadUrl: url, fileName: att.original_filename }, "Download URL generated"));
  } catch {
    return res.status(500).json(fail("Could not generate download URL"));
  }
});

module.exports = { adminRouter };
