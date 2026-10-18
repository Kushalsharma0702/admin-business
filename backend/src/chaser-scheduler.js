// chaser-scheduler.js — daily sweep that sends data-request and
// query/HST-approval reminder emails per the rules below. Runs once a day
// (wired up in index.js via node-cron); every check below is independent and
// re-evaluated fresh each tick, so a missed run just catches up next time.
//
// Rules (from the Bookkeeping form spec):
//  - Monthly/Quarterly bookkeeping: first data-request email on the 1st of
//    the month, chasers every 2 days until the 10th. Stops once the task's
//    admin_status moves off "Request Tax return information" (data
//    received/closed) before the 10th.
//  - Weekly bookkeeping: one data-request email on the task's effective
//    (open) date each week — no chaser cadence specified.
//  - Yearly bookkeeping: first email on the 1st of the month after year-end,
//    chasers every 4 days for ~1.5 months (45 days). Stops the same way as
//    monthly/quarterly once data is received/closed.
//  - Query / HST-approval reminders: sent twice (spaced 3 days apart — not
//    specified in the spec, chosen to match the other cadences) after a
//    query/draft is sent to the client. Stops immediately once the client
//    responds (admin_status moves off the "sent, awaiting reply" state).
const db = require("./db");
const { sendDataRequestEmail, sendQueryReminderEmail } = require("./config/aws");
const { generateTasksForClient } = require("./task-generation");
const { bookkeepingConfigFromAnswers } = require("./routes/client-take-on");

const MONTHLY_QUARTERLY_CHASER_DAYS = [3, 5, 7, 9]; // every 2 days, 1st through 10th
const YEARLY_CHASER_INTERVAL_DAYS = 4;
const YEARLY_CHASER_WINDOW_DAYS = 45; // ~1.5 months
const QUERY_REMINDER_INTERVAL_DAYS = 3;
const QUERY_REMINDER_MAX_COUNT = 2;

function todayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
function daysBetween(a, b) {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

async function clientInfo(clientId) {
  const { rows: [u] } = await db.query("SELECT name, email FROM users WHERE id=$1", [clientId]);
  return u || {};
}

// ── Monthly/Quarterly bookkeeping data-request chaser ──────────────────────
async function runMonthlyQuarterlyChaser(today) {
  const dom = today.getUTCDate();
  if (dom !== 1 && !MONTHLY_QUARTERLY_CHASER_DAYS.includes(dom)) return;

  const { rows: tasks } = await db.query(`
    SELECT id, client_id, title, task_type, reminder_count
    FROM tasks
    WHERE task_type='BOOKKEEPING'
      AND admin_status='Request Tax return information'
      AND config->>'bookkeepingFrequency' IN ('Monthly', 'Quarterly')
  `);

  for (const task of tasks) {
    const isChaser = dom !== 1;
    const { name, email } = await clientInfo(task.client_id);
    if (!email) continue;
    try {
      await sendDataRequestEmail({ toEmail: email, clientName: name, taskTitle: task.title, taskType: task.task_type, isChaser });
      await db.query(
        "UPDATE tasks SET reminder_count=reminder_count+1, last_reminder_sent_at=NOW() WHERE id=$1",
        [task.id]
      );
    } catch (err) {
      console.error(`Bookkeeping data-request email failed for task ${task.id}:`, err.message);
    }
  }
}

// ── Weekly bookkeeping data-request (single email on effective/open date) ──
async function runWeeklyChaser(today) {
  const { rows: tasks } = await db.query(`
    SELECT id, client_id, title, task_type
    FROM tasks
    WHERE task_type='BOOKKEEPING'
      AND admin_status='Request Tax return information'
      AND config->>'bookkeepingFrequency' = 'Weekly'
      AND open_date = $1
      AND reminder_count = 0
  `, [today.toISOString().slice(0, 10)]);

  for (const task of tasks) {
    const { name, email } = await clientInfo(task.client_id);
    if (!email) continue;
    try {
      await sendDataRequestEmail({ toEmail: email, clientName: name, taskTitle: task.title, taskType: task.task_type, isChaser: false });
      await db.query(
        "UPDATE tasks SET reminder_count=reminder_count+1, last_reminder_sent_at=NOW() WHERE id=$1",
        [task.id]
      );
    } catch (err) {
      console.error(`Weekly bookkeeping data-request email failed for task ${task.id}:`, err.message);
    }
  }
}

// ── Yearly bookkeeping data-request chaser ──────────────────────────────────
async function runYearlyChaser(today) {
  const { rows: tasks } = await db.query(`
    SELECT id, client_id, title, task_type, metadata, last_reminder_sent_at, reminder_count
    FROM tasks
    WHERE task_type='BOOKKEEPING'
      AND admin_status='Request Tax return information'
      AND config->>'bookkeepingFrequency' IN ('Yearly', 'Annual')
  `);

  for (const task of tasks) {
    const periodKey = task.metadata?.periodKey || "";
    const yearEndStr = periodKey.split(":")[1]; // "BOOKKEEPING:YYYY-MM-DD"
    if (!yearEndStr) continue;
    const yearEnd = new Date(`${yearEndStr}T00:00:00Z`);
    const firstEmailDate = new Date(Date.UTC(yearEnd.getUTCFullYear(), yearEnd.getUTCMonth() + 1, 1));
    const daysSinceFirstEmail = daysBetween(firstEmailDate, today);
    if (daysSinceFirstEmail < 0 || daysSinceFirstEmail > YEARLY_CHASER_WINDOW_DAYS) continue;

    const isFirst = daysSinceFirstEmail === 0;
    const isChaserDue = isFirst || (daysSinceFirstEmail % YEARLY_CHASER_INTERVAL_DAYS === 0);
    if (!isChaserDue) continue;
    // Guard against double-send if the scheduler runs more than once on the same day.
    if (task.last_reminder_sent_at && daysBetween(new Date(task.last_reminder_sent_at), today) === 0) continue;

    const { name, email } = await clientInfo(task.client_id);
    if (!email) continue;
    try {
      await sendDataRequestEmail({ toEmail: email, clientName: name, taskTitle: task.title, taskType: task.task_type, isChaser: !isFirst });
      await db.query(
        "UPDATE tasks SET reminder_count=reminder_count+1, last_reminder_sent_at=NOW() WHERE id=$1",
        [task.id]
      );
    } catch (err) {
      console.error(`Yearly bookkeeping data-request email failed for task ${task.id}:`, err.message);
    }
  }
}

// ── Query (bookkeeping) / HST-approval reminders — sent twice, 3 days apart ─
async function runQueryAndApprovalReminders(today) {
  const { rows: tasks } = await db.query(`
    SELECT id, client_id, title, task_type, admin_status, last_reminder_sent_at, reminder_count
    FROM tasks
    WHERE reminder_count < $1
      AND (
        (task_type='BOOKKEEPING' AND admin_status='Query sent to client')
        OR (task_type='HST' AND admin_status='Sent draft HST to client for approval')
      )
  `, [QUERY_REMINDER_MAX_COUNT]);

  for (const task of tasks) {
    const sinceLast = task.last_reminder_sent_at
      ? daysBetween(new Date(task.last_reminder_sent_at), today)
      : Infinity; // never sent — eligible immediately
    if (sinceLast < QUERY_REMINDER_INTERVAL_DAYS) continue;

    const { name, email } = await clientInfo(task.client_id);
    if (!email) continue;
    const isApproval = task.task_type === "HST";
    try {
      await sendQueryReminderEmail({ toEmail: email, clientName: name, taskTitle: task.title, taskType: task.task_type, isApproval });
      await db.query(
        "UPDATE tasks SET reminder_count=reminder_count+1, last_reminder_sent_at=NOW() WHERE id=$1",
        [task.id]
      );
    } catch (err) {
      console.error(`Query/approval reminder email failed for task ${task.id}:`, err.message);
    }
  }
}

// ── Keep recurring bookkeeping periods flowing ──────────────────────────────
// generateTasksForClient is only ever called from two places: a manual admin
// "Generate Tasks" action, and once when a Client Take-On form is submitted.
// Neither of those repeats on its own, so without this, a client's monthly/
// weekly/quarterly/yearly bookkeeping task would only ever get created for
// the single period active at submission time — next month's period would
// never appear, and this chaser would have nothing to chase. Re-running it
// daily for every client with a submitted bookkeeping config is safe: it's
// idempotent (dedups on periodKey), so it's a no-op for periods that already
// have a task row.
async function regenerateBookkeepingTasks() {
  const { rows } = await db.query(`
    SELECT client_id, answers
    FROM client_take_on_submissions
    WHERE status='submitted' AND answers->>'bookkeeping_period' IS NOT NULL
  `);

  for (const row of rows) {
    // Shares bookkeepingConfigFromAnswers with the take-on PUT handler so this
    // sweep honours the Bookkeeping Yes/No toggle the same way a save does —
    // a reimplementation here previously skipped that check entirely, so
    // switching Bookkeeping back to No didn't stop the daily regeneration.
    const config = bookkeepingConfigFromAnswers(row.answers || {});
    if (!config) continue;
    try {
      await generateTasksForClient(row.client_id, config, null);
    } catch (err) {
      console.error(`Bookkeeping task regeneration failed for client ${row.client_id}:`, err.message);
    }
  }
}

async function runChaserSweep() {
  const today = todayUTC();
  await regenerateBookkeepingTasks();
  await runMonthlyQuarterlyChaser(today);
  await runWeeklyChaser(today);
  await runYearlyChaser(today);
  await runQueryAndApprovalReminders(today);
}

module.exports = { runChaserSweep };
