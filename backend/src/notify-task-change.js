// notify-task-change.js — fire-and-forget email when a client completes/
// submits a task, routed by task_type via task_type_notification_configs
// (superadmin-managed — see routes/notification-configs.js). An unconfigured
// task type now falls back to accounts@diamondaccounts.ca instead of
// silently notifying no one — previously, an empty config table meant this
// fired for every event and reached nobody, which looked indistinguishable
// from "notifications are broken" even though the code ran correctly.
const db = require("./db");
const { sendTaskChangeNotification } = require("./config/aws");
const { resolveNotificationEmails } = require("./notification-routing");

async function notifyTaskChange(task, action) {
  if (!task?.task_type) return;
  try {
    const emails = await resolveNotificationEmails(task.task_type);
    if (!emails.length) return;

    const { rows: [client] } = await db.query(
      "SELECT name FROM users WHERE id=$1",
      [task.client_id]
    );

    await sendTaskChangeNotification({
      toEmail: emails,
      clientName: client?.name,
      taskTitle: task.title,
      taskType: task.task_type,
      action,
    });
  } catch (err) {
    // Never let a notification failure affect the client-facing request.
    console.error(`notifyTaskChange failed for task ${task.id}:`, err.message);
  }
}

module.exports = { notifyTaskChange };
