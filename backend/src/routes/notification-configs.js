// routes/notification-configs.js — superadmin-configurable routing of
// "a client changed this task type" notification emails.
// e.g. HST -> a@gmail.com, PAYROLL -> b@gmail.com. Read by the task-completion
// hooks in client-tasks.js / client-forms.js.
const express = require("express");
const db = require("../db");
const { fail, ok } = require("../helpers");
const { requireAuth } = require("../middleware/auth");
const { requirePermission, logAdminAction } = require("../middleware/permissions");

const router = express.Router();
router.use(requireAuth("admin"));
router.use(requirePermission("manage_notifications"));

function serialize(row) {
  return { taskType: row.task_type, email: row.email, updatedAt: row.updated_at };
}

// GET /api/admin/notification-configs
router.get("/notification-configs", async (_req, res) => {
  const { rows } = await db.query(
    "SELECT * FROM task_type_notification_configs ORDER BY task_type"
  );
  return res.json(ok(rows.map(serialize), "Notification configs fetched"));
});

// PUT /api/admin/notification-configs/:taskType — create/update the mapping
// body: { email }
router.put("/notification-configs/:taskType", async (req, res) => {
  const taskType = req.params.taskType.trim().toUpperCase();
  const email = (req.body?.email || "").trim();
  if (!taskType) return res.status(400).json(fail("taskType is required"));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json(fail("A valid email is required"));

  const { rows: [row] } = await db.query(
    `INSERT INTO task_type_notification_configs (task_type, email, updated_by)
     VALUES ($1,$2,$3)
     ON CONFLICT (task_type) DO UPDATE SET email=$2, updated_by=$3, updated_at=NOW()
     RETURNING *`,
    [taskType, email, req.user.sub]
  );

  await logAdminAction({
    adminId: req.user.sub, adminName: req.user.name,
    action: "notification_config_saved", targetType: "notification_config", targetId: taskType,
    details: { taskType, email },
  });

  return res.json(ok(serialize(row), "Notification config saved"));
});

// DELETE /api/admin/notification-configs/:taskType
router.delete("/notification-configs/:taskType", async (req, res) => {
  const taskType = req.params.taskType.trim().toUpperCase();
  const { rowCount } = await db.query(
    "DELETE FROM task_type_notification_configs WHERE task_type=$1",
    [taskType]
  );
  if (!rowCount) return res.status(404).json(fail("No notification config for this task type"));

  await logAdminAction({
    adminId: req.user.sub, adminName: req.user.name,
    action: "notification_config_deleted", targetType: "notification_config", targetId: taskType,
    details: { taskType },
  });

  return res.json(ok({ taskType }, "Notification config removed"));
});

module.exports = router;
