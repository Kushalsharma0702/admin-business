// routes/client-forms.js — dynamic form fill, draft save, submit, history
const express = require("express");
const db = require("../db");
const { fail, ok, paged, formatSubmission, formatTemplateVersion, formatTask } = require("../helpers");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth("client"));

// GET /v3/api/v1/tasks/:taskId/form — fetch form schema + existing draft
router.get("/tasks/:taskId/form", async (req, res) => {
  const clientId = req.user.sub;

  const { rows: [task] } = await db.query(
    "SELECT * FROM tasks WHERE id=$1 AND client_id=$2",
    [req.params.taskId, clientId]
  );
  if (!task) return res.status(404).json(fail("Task not found"));

  let formSchema = [];
  let templateVersion = null;

  if (task.template_version_id) {
    const { rows: [tv] } = await db.query(
      "SELECT * FROM task_template_versions WHERE id=$1",
      [task.template_version_id]
    );
    if (tv) {
      templateVersion = formatTemplateVersion(tv);
      formSchema = tv.form_schema || [];
    }
  }

  // Fetch existing draft or submitted
  const { rows: [submission] } = await db.query(
    "SELECT * FROM task_submissions WHERE task_id=$1 AND client_id=$2 ORDER BY created_at DESC LIMIT 1",
    [task.id, clientId]
  );

  return res.json(ok({
    taskId:          task.id,
    title:           task.title,
    description:     task.description,
    status:          task.status,
    formSchema,
    templateVersion,
    submission:      submission ? formatSubmission(submission) : null,
  }, "Form data fetched"));
});

// PUT /v3/api/v1/tasks/:taskId/form/draft — upsert draft (idempotent)
router.put("/tasks/:taskId/form/draft", async (req, res) => {
  const clientId = req.user.sub;

  const { rows: [task] } = await db.query(
    "SELECT * FROM tasks WHERE id=$1 AND client_id=$2",
    [req.params.taskId, clientId]
  );
  if (!task) return res.status(404).json(fail("Task not found"));
  if (task.status === "complete") return res.status(409).json(fail("Task is already completed"));

  const { formData = {}, attachments = [] } = req.body;

  // Check for existing draft
  const { rows: [existing] } = await db.query(
    "SELECT id FROM task_submissions WHERE task_id=$1 AND client_id=$2 AND status='draft'",
    [task.id, clientId]
  );

  let submission;
  if (existing) {
    const { rows: [updated] } = await db.query(
      `UPDATE task_submissions
       SET form_data=$1, attachments=$2, updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [JSON.stringify(formData), JSON.stringify(attachments), existing.id]
    );
    submission = updated;
  } else {
    const { rows: [created] } = await db.query(
      `INSERT INTO task_submissions
         (task_id, client_id, template_version_id, form_data, attachments)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [task.id, clientId, task.template_version_id, JSON.stringify(formData), JSON.stringify(attachments)]
    );
    submission = created;
  }

  return res.json(ok(formatSubmission(submission), "Draft saved"));
});

// POST /v3/api/v1/tasks/:taskId/form/submit
router.post("/tasks/:taskId/form/submit", async (req, res) => {
  const clientId = req.user.sub;

  const { rows: [task] } = await db.query(
    "SELECT * FROM tasks WHERE id=$1 AND client_id=$2",
    [req.params.taskId, clientId]
  );
  if (!task) return res.status(404).json(fail("Task not found"));
  if (task.status === "complete") return res.status(409).json(fail("Task is already completed"));

  const { formData = {}, attachments = [] } = req.body;

  // Validate required fields against schema
  if (task.template_version_id) {
    const { rows: [tv] } = await db.query(
      "SELECT form_schema FROM task_template_versions WHERE id=$1",
      [task.template_version_id]
    );
    if (tv) {
      const schema = tv.form_schema || [];
      const errors = [];

      for (const field of schema) {
        if (!field.required) continue;

        if (field.type === "file_upload") {
          const hasAttachment = attachments.some((a) => a.fieldId === field.id);
          if (!hasAttachment) errors.push({ field: field.id, message: `${field.label} is required` });
        } else if (field.type === "signature") {
          const val = formData[field.id];
          if (!val || String(val).trim() === "") {
            errors.push({ field: field.id, message: `${field.label} (signature) is required` });
          }
        } else {
          const val = formData[field.id];
          const isEmpty = val === undefined || val === null || String(val).trim() === "";
          if (isEmpty) errors.push({ field: field.id, message: `${field.label} is required` });
        }
      }

      if (errors.length > 0) {
        return res.status(400).json(fail("Validation failed", errors));
      }
    }
  }

  const now = new Date().toISOString();

  // Upsert submission as submitted
  const { rows: [existing] } = await db.query(
    "SELECT id FROM task_submissions WHERE task_id=$1 AND client_id=$2 AND status='draft'",
    [task.id, clientId]
  );

  let submission;
  if (existing) {
    const { rows: [updated] } = await db.query(
      `UPDATE task_submissions
       SET form_data=$1, attachments=$2, status='submitted', submitted_at=NOW(), updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [JSON.stringify(formData), JSON.stringify(attachments), existing.id]
    );
    submission = updated;
  } else {
    const { rows: [created] } = await db.query(
      `INSERT INTO task_submissions
         (task_id, client_id, template_version_id, form_data, attachments, status, submitted_at)
       VALUES ($1,$2,$3,$4,$5,'submitted',NOW()) RETURNING *`,
      [task.id, clientId, task.template_version_id, JSON.stringify(formData), JSON.stringify(attachments)]
    );
    submission = created;
  }

  // Mark task as complete
  await db.query(
    "UPDATE tasks SET status='complete', completed_at=NOW(), updated_at=NOW() WHERE id=$1",
    [task.id]
  );

  return res.json(ok({
    submissionId: submission.id,
    status:       "submitted",
    submittedAt:  submission.submitted_at,
  }, "Form submitted successfully"));
});

// GET /v3/api/v1/submissions — client submission history
router.get("/submissions", async (req, res) => {
  const clientId = req.user.sub;
  const page     = Math.max(1, Number(req.query.page     || 1));
  const per_page = Math.max(1, Number(req.query.per_page || 20));
  const offset   = (page - 1) * per_page;

  const [{ rows }, { rows: cnt }] = await Promise.all([
    db.query(
      `SELECT s.*, t.title AS task_title
       FROM task_submissions s JOIN tasks t ON s.task_id=t.id
       WHERE s.client_id=$1
       ORDER BY s.created_at DESC LIMIT $2 OFFSET $3`,
      [clientId, per_page, offset]
    ),
    db.query(
      "SELECT COUNT(*)::int AS total FROM task_submissions WHERE client_id=$1",
      [clientId]
    ),
  ]);

  return res.json(paged(
    rows.map((r) => ({ ...formatSubmission(r), taskTitle: r.task_title })),
    "Submissions fetched", page, per_page, cnt[0].total
  ));
});

// GET /v3/api/v1/submissions/:id
router.get("/submissions/:id", async (req, res) => {
  const clientId = req.user.sub;
  const { rows: [sub] } = await db.query(
    `SELECT s.*, t.title AS task_title
     FROM task_submissions s JOIN tasks t ON s.task_id=t.id
     WHERE s.id=$1 AND s.client_id=$2`,
    [req.params.id, clientId]
  );
  if (!sub) return res.status(404).json(fail("Submission not found"));

  let templateVersion = null;
  if (sub.template_version_id) {
    const { rows: [tv] } = await db.query(
      "SELECT * FROM task_template_versions WHERE id=$1",
      [sub.template_version_id]
    );
    if (tv) templateVersion = formatTemplateVersion(tv);
  }

  return res.json(ok({
    ...formatSubmission(sub),
    taskTitle: sub.task_title,
    templateVersion,
  }, "Submission fetched"));
});

module.exports = router;
