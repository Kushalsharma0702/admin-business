// notification-routing.js — resolves who gets emailed for a given routing
// key (a task_type, or "ONBOARDING"), shared by notify-task-change.js and
// onboarding.js so there is one lookup + one comma-separated-list parser,
// not a reimplementation per caller.
const db = require("./db");

const DEFAULT_NOTIFY_EMAIL = "accounts@diamondaccounts.ca";

// Returns a de-duplicated array of email addresses. `key` is matched against
// task_type_notification_configs.task_type (a free string — "ONBOARDING" is
// not a real tasks.task_type, the column just isn't constrained to one).
// Falls back to `fallback` (string or array) when nothing is configured,
// rather than silently notifying no one.
async function resolveNotificationEmails(key, fallback = DEFAULT_NOTIFY_EMAIL) {
  const { rows: [config] } = await db.query(
    "SELECT email FROM task_type_notification_configs WHERE task_type=$1",
    [key]
  );
  const raw = config ? config.email : fallback;
  const list = Array.isArray(raw) ? raw : String(raw || "").split(",");
  return [...new Set(list.map((e) => e.trim()).filter(Boolean))];
}

module.exports = { resolveNotificationEmails, DEFAULT_NOTIFY_EMAIL };
