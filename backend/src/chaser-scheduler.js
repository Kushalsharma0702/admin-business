// chaser-scheduler.js — hourly sweep that sends data-request and
// query/HST-approval reminder emails per the rules below. Every check is
// independent and re-evaluated fresh each tick, so a missed run just catches
// up on the next one.
//
// Send window (send-window.js, Atlantic time):
//   never Saturday/Sunday, never a Canadian bank holiday, nothing before
//   09:00, and nothing before 13:00 on a Monday. The sweep runs hourly so the
//   first eligible tick of a day is the one that sends; a per-task
//   once-per-day guard keeps that to a single email per task per day.
//
// Cadences:
//  - Monthly/Quarterly bookkeeping: first data-request from the 1st of the
//    month, chasers every 2 days through the 10th.
//  - Weekly bookkeeping: one data-request once the task's open date arrives.
//  - Yearly bookkeeping: first email from the 1st of the month after
//    year-end, chasers every 5 days for ~1.5 months (45 days).
//  - Query / HST-approval reminders: twice, 3 days apart, stopping as soon as
//    the client responds (admin_status moves off the awaiting-reply state).
//
// All cadences are measured as "days since the last email actually sent",
// not "today is day N". That matters now that days get skipped: a chaser due
// on a Saturday or Canada Day goes out on the next eligible day instead of
// being silently dropped for that cycle.
const db = require("./db");
const { sendDataRequestEmail, sendQueryReminderEmail } = require("./config/aws");
const { generateTasksForClient } = require("./task-generation");
const { recurringConfigFromAnswers } = require("./routes/client-take-on");
const { canSendAt, atlanticDateKey } = require("./send-window");

const MONTHLY_QUARTERLY_INTERVAL_DAYS = 2;
const MONTHLY_QUARTERLY_LAST_DOM = 10;   // chasers run the 1st through the 10th
const WEEKLY_CATCHUP_DAYS = 7;           // how long after open_date a missed weekly email may still go
const YEARLY_CHASER_INTERVAL_DAYS = 5;
const YEARLY_CHASER_WINDOW_DAYS = 45;    // ~1.5 months
const QUERY_REMINDER_INTERVAL_DAYS = 3;
const QUERY_REMINDER_MAX_COUNT = 2;

// The admin statuses that mean "we are still waiting on the client's data".
// NOTE: these are tasks.admin_status values. The previous implementation
// filtered on admin_status='Request Tax return information', which is a
// SUBTASK name (workflows.js), not an admin status — so the query matched
// zero rows and no bookkeeping chaser email was ever sent.
const AWAITING_DATA_STATUSES = ["Data not received", "Partial Data received"];

// "Partial Data received" means some documents arrived: the chaser should ask
// for what is still missing rather than re-request the whole set.
function isMissingDataChase(adminStatus) {
  return adminStatus === "Partial Data received";
}

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

// One email per task per Atlantic day, regardless of how many hourly ticks run.
function alreadySentToday(task, now) {
  return !!task.last_reminder_sent_at &&
    atlanticDateKey(new Date(task.last_reminder_sent_at)) === atlanticDateKey(now);
}

function daysSinceLastEmail(task, today) {
  return task.last_reminder_sent_at
    ? daysBetween(new Date(task.last_reminder_sent_at), today)
    : Infinity; // never sent — eligible immediately
}

// Sends and records one data-request/chaser email. Returns true if it went out.
async function sendDataRequest(task, { isChaser, now }) {
  const { name, email } = await clientInfo(task.client_id);
  if (!email) return false;
  try {
    await sendDataRequestEmail({
      toEmail: email,
      clientName: name,
      taskTitle: task.title,
      taskType: task.task_type,
      isChaser,
      // Switches the copy from "please send your documents" to "we are still
      // missing the items below" once partial data has arrived.
      isMissingData: isMissingDataChase(task.admin_status),
      missingDataNote: task.metadata?.missingDataRequest?.note || null,
      missingDataPeriod: task.metadata?.missingDataRequest?.period || null,
    });
    await db.query(
      "UPDATE tasks SET reminder_count=reminder_count+1, last_reminder_sent_at=NOW() WHERE id=$1",
      [task.id]
    );
    return true;
  } catch (err) {
    console.error(`Data-request email failed for task ${task.id}:`, err.message);
    return false;
  }
}

const BOOKKEEPING_AWAITING_SQL = `
  SELECT id, client_id, title, task_type, admin_status, metadata,
         open_date, last_reminder_sent_at, reminder_count
  FROM tasks
  WHERE task_type='BOOKKEEPING'
    AND closed_at IS NULL
    AND admin_status = ANY($1)
`;

// ── Monthly/Quarterly bookkeeping data-request chaser ──────────────────────
async function runMonthlyQuarterlyChaser(today, now) {
  const dom = today.getUTCDate();
  if (dom > MONTHLY_QUARTERLY_LAST_DOM) return;

  const { rows: tasks } = await db.query(
    `${BOOKKEEPING_AWAITING_SQL} AND config->>'bookkeepingFrequency' IN ('Monthly','Quarterly')`,
    [AWAITING_DATA_STATUSES]
  );

  for (const task of tasks) {
    if (alreadySentToday(task, now)) continue;
    const isFirst = task.reminder_count === 0;
    if (!isFirst && daysSinceLastEmail(task, today) < MONTHLY_QUARTERLY_INTERVAL_DAYS) continue;
    await sendDataRequest(task, { isChaser: !isFirst, now });
  }
}

// ── Weekly bookkeeping data-request (one email once the open date arrives) ──
async function runWeeklyChaser(today, now) {
  const { rows: tasks } = await db.query(
    `${BOOKKEEPING_AWAITING_SQL}
       AND config->>'bookkeepingFrequency' = 'Weekly'
       AND reminder_count = 0
       AND open_date IS NOT NULL
       AND open_date <= $2
       AND open_date >= $3`,
    [
      AWAITING_DATA_STATUSES,
      today.toISOString().slice(0, 10),
      new Date(today.getTime() - WEEKLY_CATCHUP_DAYS * 86400000).toISOString().slice(0, 10),
    ]
  );

  for (const task of tasks) {
    if (alreadySentToday(task, now)) continue;
    await sendDataRequest(task, { isChaser: false, now });
  }
}

// ── Yearly bookkeeping data-request chaser ──────────────────────────────────
async function runYearlyChaser(today, now) {
  const { rows: tasks } = await db.query(
    `${BOOKKEEPING_AWAITING_SQL} AND config->>'bookkeepingFrequency' IN ('Yearly','Annual')`,
    [AWAITING_DATA_STATUSES]
  );

  for (const task of tasks) {
    const periodKey = task.metadata?.periodKey || "";
    const yearEndStr = periodKey.split(":")[1]; // "BOOKKEEPING:YYYY-MM-DD"
    if (!yearEndStr) continue;
    const yearEnd = new Date(`${yearEndStr}T00:00:00Z`);
    const firstEmailDate = new Date(Date.UTC(yearEnd.getUTCFullYear(), yearEnd.getUTCMonth() + 1, 1));
    const daysSinceFirstEmail = daysBetween(firstEmailDate, today);
    if (daysSinceFirstEmail < 0 || daysSinceFirstEmail > YEARLY_CHASER_WINDOW_DAYS) continue;

    if (alreadySentToday(task, now)) continue;
    const isFirst = task.reminder_count === 0;
    if (!isFirst && daysSinceLastEmail(task, today) < YEARLY_CHASER_INTERVAL_DAYS) continue;
    await sendDataRequest(task, { isChaser: !isFirst, now });
  }
}

// ── Query (bookkeeping) / HST-approval reminders — sent twice, 3 days apart ─
async function runQueryAndApprovalReminders(today, now) {
  const { rows: tasks } = await db.query(`
    SELECT id, client_id, title, task_type, admin_status, last_reminder_sent_at, reminder_count
    FROM tasks
    WHERE reminder_count < $1
      AND closed_at IS NULL
      AND (
        (task_type='BOOKKEEPING' AND admin_status='Query sent to client')
        OR (task_type='HST' AND admin_status='Sent for Approval to client')
      )
  `, [QUERY_REMINDER_MAX_COUNT]);

  for (const task of tasks) {
    if (alreadySentToday(task, now)) continue;
    if (daysSinceLastEmail(task, today) < QUERY_REMINDER_INTERVAL_DAYS) continue;

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
// generateTasksForClient is otherwise only called from a manual admin
// "Generate Tasks" action and once when a Client Take-On form is submitted.
// Neither repeats, so without this a client's bookkeeping task would only
// ever exist for the period active at submission time. Re-running it is safe:
// it dedups on periodKey, and only re-dates open tasks whose plan changed.
async function regenerateRecurringTasks() {
  const { rows } = await db.query(`
    SELECT client_id, answers
    FROM client_take_on_submissions
    WHERE status='submitted'
      AND (answers->>'bookkeeping_period' IS NOT NULL OR answers->>'hst_period' IS NOT NULL)
  `);

  for (const row of rows) {
    const config = recurringConfigFromAnswers(row.answers || {});
    if (!config) continue;
    try {
      await generateTasksForClient(row.client_id, config, null);
    } catch (err) {
      console.error(`Recurring task regeneration failed for client ${row.client_id}:`, err.message);
    }
  }
}

// Runs hourly. Task generation is time-of-day agnostic and must not be held
// back by the email window — a task still has to appear on the day it opens
// even if that day is a Saturday. Only the emails wait for an open window.
async function runChaserSweep(now = new Date()) {
  const today = todayUTC();
  await regenerateRecurringTasks();

  const window = canSendAt(now);
  if (!window.ok) {
    console.log(`  ⏸  Chaser emails held: ${window.reason} (Atlantic ${window.local.ymd} ${String(window.local.hour).padStart(2, "0")}:00)`);
    return { generated: true, emailsSent: false, reason: window.reason };
  }

  await runMonthlyQuarterlyChaser(today, now);
  await runWeeklyChaser(today, now);
  await runYearlyChaser(today, now);
  await runQueryAndApprovalReminders(today, now);
  return { generated: true, emailsSent: true };
}

module.exports = { runChaserSweep, AWAITING_DATA_STATUSES, isMissingDataChase };
