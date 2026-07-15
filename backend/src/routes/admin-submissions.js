// routes/admin-submissions.js — view/review/reassign submissions
const express = require("express");
const db = require("../db");
const { fail, ok, paged, formatSubmission, formatTask, formatTemplateVersion } = require("../helpers");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth("admin"));

// GET /api/admin/submissions
router.get("/", async (req, res) => {
  const page     = Math.max(1, Number(req.query.page     || 1));
  const per_page = Math.max(1, Number(req.query.per_page || 20));
  const offset   = (page - 1) * per_page;

  const conds = []; const args = []; let i = 1;
  if (req.query.clientId) { conds.push(`s.client_id=$${i++}`); args.push(req.query.clientId); }
  if (req.query.status)   { conds.push(`s.status=$${i++}`);    args.push(req.query.status); }
  if (req.query.taskId)   { conds.push(`s.task_id=$${i++}`);   args.push(req.query.taskId); }

  const where = conds.length ? "WHERE " + conds.join(" AND ") : "";

  const [{ rows }, { rows: cnt }] = await Promise.all([
    db.query(
      `SELECT s.*, t.title AS task_title, u.name AS client_name, u.email AS client_email
       FROM task_submissions s
       JOIN tasks t ON s.task_id=t.id
       JOIN users u ON s.client_id=u.id
       ${where}
       ORDER BY s.created_at DESC LIMIT $${i++} OFFSET $${i++}`,
      [...args, per_page, offset]
    ),
    db.query(
      `SELECT COUNT(*)::int AS total FROM task_submissions s ${where}`,
      args
    ),
  ]);

  return res.json(paged(
    rows.map((r) => ({
      ...formatSubmission(r),
      taskTitle:   r.task_title,
      clientName:  r.client_name,
      clientEmail: r.client_email,
    })),
    "Submissions fetched", page, per_page, cnt[0].total
  ));
});

// GET /api/admin/submissions/:id — full detail with schema
router.get("/:id", async (req, res) => {
  const { rows: [sub] } = await db.query(
    `SELECT s.*, t.title AS task_title, u.name AS client_name
     FROM task_submissions s
     JOIN tasks t ON s.task_id=t.id
     JOIN users u ON s.client_id=u.id
     WHERE s.id=$1`,
    [req.params.id]
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
    taskTitle:       sub.task_title,
    clientName:      sub.client_name,
    templateVersion,
  }, "Submission fetched"));
});

// PATCH /api/admin/submissions/:id/review
router.patch("/:id/review", async (req, res) => {
  const { status, reviewNotes } = req.body;
  const VALID = ["reviewed", "rejected"];
  if (!VALID.includes(status)) {
    return res.status(400).json(fail(`status must be one of: ${VALID.join(", ")}`));
  }

  const { rows: [existing] } = await db.query(
    "SELECT id FROM task_submissions WHERE id=$1",
    [req.params.id]
  );
  if (!existing) return res.status(404).json(fail("Submission not found"));

  const { rows: [updated] } = await db.query(
    `UPDATE task_submissions
     SET status=$1, reviewed_at=NOW(), reviewed_by=$2, review_notes=$3, updated_at=NOW()
     WHERE id=$4 RETURNING *`,
    [status, req.user.sub, reviewNotes || null, req.params.id]
  );
  return res.json(ok(formatSubmission(updated), "Submission reviewed"));
});

// GET /api/admin/tasks/:taskId/submission — get submission for a task
router.get("/task/:taskId", async (req, res) => {
  const { rows: [sub] } = await db.query(
    "SELECT * FROM task_submissions WHERE task_id=$1 ORDER BY created_at DESC LIMIT 1",
    [req.params.taskId]
  );
  if (!sub) return res.status(404).json(fail("No submission found for this task"));

  let templateVersion = null;
  if (sub.template_version_id) {
    const { rows: [tv] } = await db.query(
      "SELECT * FROM task_template_versions WHERE id=$1",
      [sub.template_version_id]
    );
    if (tv) templateVersion = formatTemplateVersion(tv);
  }

  return res.json(ok({ ...formatSubmission(sub), templateVersion }, "Submission fetched"));
});

module.exports = router;
