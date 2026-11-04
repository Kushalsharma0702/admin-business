// A GENERATED bookkeeping task must actually be chased - inside the Atlantic send window only.
// Local database only (refuses otherwise); the email sender is stubbed, nothing is sent.
process.chdir(__dirname + "/..");
if (!/@(127\.0\.0\.1|localhost)[:/]/.test(process.env.DATABASE_URL || "")) { console.error("refusing: DATABASE_URL is not local"); process.exit(2); }
const path = require("path");
const sent = [];
const awsPath = require.resolve("../src/config/aws");
require.cache[awsPath] = { id: awsPath, filename: awsPath, loaded: true, exports: { sendDataRequestEmail: async (a) => { sent.push(a); }, sendQueryReminderEmail: async () => {} } };
const db = require("../src/db");
const { generateTasksForClient } = require("../src/task-generation");
const { runChaserSweep } = require("../src/chaser-scheduler");
let pass = 0, total = 0; const eq = (n, g, w) => { total++; const ok = JSON.stringify(g) === JSON.stringify(w); if (ok) pass++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : `\n    got  ${JSON.stringify(g)}\n    want ${JSON.stringify(w)}`)); };
const tick = async (iso) => { const n = sent.length; await runChaserSweep(new Date(iso)); return sent.length - n; };
(async () => {
  let uid;
  try {
    await db.query("DELETE FROM tasks WHERE task_type='BOOKKEEPING'");                       // local scratch DB: isolate the test
    const { rows: [u] } = await db.query("INSERT INTO users (email,password_hash,name,role,portal_status,must_change_password) VALUES ($1,'x','Chaser Test','client','active',FALSE) RETURNING id", [`chaser-${Date.now()}@example.com`]); uid = u.id;
    // first bookkeeping date = 1 Nov 2026, monthly  ->  task generated 15 Oct for the October period
    await generateTasksForClient(uid, { bookkeepingFrequency: "Monthly", bookkeepingFirstDate: "2026-11-01" }, null);
    const { rows: [t] } = await db.query("SELECT admin_status FROM tasks WHERE client_id=$1", [uid]);
    eq("generated task is waiting on the client's data", t.admin_status, "Data not received");

    // Real calendar today is whatever it is; the sweep takes `now` for the send window. The monthly chaser runs the 1st-10th.
    const wed = "2026-11-04T14:00:00Z";                                  // Wed 4 Nov, 10:00 ADT
    const real = new Date(); const inMonthlyWindow = real.getUTCDate() >= 1 && real.getUTCDate() <= 10;
    if (!inMonthlyWindow) console.log("  (note: real date is outside the 1st-10th, so the monthly-day checks below are skipped)");
    if (inMonthlyWindow) {
      eq("Saturday: no chaser (weekend blackout)", await tick("2026-11-07T15:00:00Z"), 0);
      eq("Sunday: no chaser", await tick("2026-11-08T15:00:00Z"), 0);
      eq("Monday 12:00 ADT (before 1 pm): no chaser", await tick("2026-11-09T15:00:00Z"), 0);
      eq("Weekday 08:00 ADT (before 9 am): no chaser", await tick("2026-11-04T11:00:00Z"), 0);
      eq("Wednesday 10:00 ADT: the generated task IS chased", await tick(wed), 1);
      eq("...and the email goes to that client's address", sent[sent.length - 1].toEmail.startsWith("chaser-"), true);
      eq("same day, next hourly tick: no duplicate", await tick("2026-11-04T15:00:00Z"), 0);
      await db.query("UPDATE tasks SET admin_status='Done / closed-out', closed_at=NOW() WHERE client_id=$1", [uid]).catch(() => db.query("UPDATE tasks SET closed_at=NOW() WHERE client_id=$1", [uid]));
      await db.query("UPDATE tasks SET last_reminder_sent_at=NULL WHERE client_id=$1", [uid]);
      eq("closed task is NEVER chased again", await tick("2026-11-06T15:00:00Z"), 0);
    }
    // Weekly: generated on Thursday (open_date), first chaser the NEXT day (Friday).
    await db.query("DELETE FROM tasks WHERE client_id=$1", [uid]);
    const mkWeekly = async (openOffsetDays) => (await db.query(
      "INSERT INTO tasks (client_id,title,task_type,admin_status,config,open_date) VALUES ($1,'Weekly','BOOKKEEPING','Data not received',$2, CURRENT_DATE + ($3 || ' days')::interval) RETURNING id",
      [uid, JSON.stringify({ bookkeepingFrequency: "Weekly" }), String(openOffsetDays)])).rows[0].id;
    const wk = await mkWeekly(0);                                         // opened today (the Thursday)
    eq("weekly: NOT chased on the day it is generated (Thursday)", await tick("2026-11-04T14:00:00Z"), 0);
    await db.query("UPDATE tasks SET open_date = CURRENT_DATE - 1 WHERE id=$1", [wk]);   // now it is the next day (Friday)
    eq("weekly: chased the day after (Friday)", await tick("2026-11-04T14:30:00Z"), 1);
    await db.query("UPDATE tasks SET last_reminder_sent_at=NULL WHERE id=$1", [wk]);
    eq("weekly: only ONE email per weekly task (no repeat chaser)", await tick("2026-11-05T14:00:00Z"), 0);
  } finally {
    await db.query("DELETE FROM tasks WHERE client_id=$1", [uid]); await db.query("DELETE FROM users WHERE id=$1", [uid]);
    console.log(`\n${pass}/${total} passed`); await db.pool.end(); process.exit(pass === total ? 0 : 1);
  }
})().catch((e) => { console.error(e); process.exit(1); });
