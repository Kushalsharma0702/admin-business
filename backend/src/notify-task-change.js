// notify-task-change.js — fire-and-forget email when a client completes/
// submits a task, routed by task_type via task_type_notification_configs
// (superadmin-managed — see routes/notification-configs.js).
const db = require("./db");
const { sendTaskChangeNotification } = require("./config/aws");

async function notifyTaskChange(task, action) {
  if (!task?.task_type) return;
  try {
    const { rows: [config] } = await db.query(
      "SELECT email FROM task_type_notification_configs WHERE task_type=$1",
      [task.task_type]
    );
    if (!config) return; // no one configured for this task type — nothing to do

    const { rows: [client] } = await db.query(
      "SELECT name FROM users WHERE id=$1",
      [task.client_id]
    );

    await sendTaskChangeNotification({
      toEmail: config.email,
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
