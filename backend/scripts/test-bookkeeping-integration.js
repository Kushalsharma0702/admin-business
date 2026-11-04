// Generation -> database -> client view, for the Diamond Accounts bookkeeping rules.
// Writes test rows, so it REFUSES to run unless DATABASE_URL is a local database.
//   DATABASE_URL=postgresql://postgres@127.0.0.1:55432/biz_test JWT_SECRET=x FRONTEND_URL=http://x node scripts/test-bookkeeping-integration.js
process.chdir(__dirname + "/..");
if (!/@(127\.0\.0\.1|localhost)[:/]/.test(process.env.DATABASE_URL || "")) { console.error("refusing: DATABASE_URL is not local"); process.exit(2); }
const db = require("../src/db");
const { generateTasksForClient } = require("../src/task-generation");
const { clientBookkeepingPeriod } = require("../src/task-details-service");
let pass = 0, total = 0; const eq = (n, g, w) => { total++; const ok = JSON.stringify(g) === JSON.stringify(w); if (ok) pass++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : `\n    got  ${JSON.stringify(g)}\n    want ${JSON.stringify(w)}`)); };
const d = (v) => { const p = (n) => String(n).padStart(2, "0"); return v ? `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}` : null; };   // DATE column -> local calendar day
(async () => {
  const ids = [];
  const mk = async (tag) => { const { rows: [u] } = await db.query("INSERT INTO users (email,password_hash,name,role,portal_status,must_change_password) VALUES ($1,'x',$2,'client','active',FALSE) RETURNING id", [`bk-${tag}-${Date.now()}@example.com`, tag]); ids.push(u.id); return u.id; };
  try {
    const today = new Date(); const iso = (x) => x.toISOString().slice(0, 10);
    // A monthly client whose first date was the 1st of THIS month -> its first task was generated on the 15th of last month.
    const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const prevStart = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() - 1, 1)), prevEnd = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 0));
    const gen = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() - 1, 15));
    const c1 = await mk("monthly");
    const r1 = await generateTasksForClient(c1, { bookkeepingFrequency: "Monthly", bookkeepingFirstDate: iso(first) }, null);
    eq("monthly: exactly one task created", r1.count, 1);
    const { rows: [t1] } = await db.query("SELECT * FROM tasks WHERE client_id=$1", [c1]);
    eq("monthly: opens on the 15th of the previous month", d(t1.open_date), iso(gen));
    eq("monthly: stored period = the previous month", [t1.metadata.bookkeepingPeriod.start, t1.metadata.bookkeepingPeriod.end], [iso(prevStart), iso(prevEnd)]);
    eq("monthly: admin status starts at 'Data not received' (a status the dropdown offers and the chaser chases)", t1.admin_status, "Data not received");
    eq("client sees the period (and only that from metadata)", [clientBookkeepingPeriod(t1).start, clientBookkeepingPeriod(t1).end], [iso(prevStart), iso(prevEnd)]);
    eq("client view never exposes other metadata", Object.keys(clientBookkeepingPeriod(t1)), ["start", "end"]);
    const r1b = await generateTasksForClient(c1, { bookkeepingFrequency: "Monthly", bookkeepingFirstDate: iso(first) }, null);
    eq("re-running generation creates nothing new (idempotent)", [r1b.count, (await db.query("SELECT count(*)::int n FROM tasks WHERE client_id=$1", [c1])).rows[0].n], [0, 1]);

    // A weekly client whose first date was a Monday ~10 days ago -> tasks on Thursdays, period = Mon-Fri of the previous week.
    const mon = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())); while (mon.getUTCDay() !== 1) mon.setUTCDate(mon.getUTCDate() - 1); mon.setUTCDate(mon.getUTCDate() - 7);
    const c2 = await mk("weekly");
    const r2 = await generateTasksForClient(c2, { bookkeepingFrequency: "Weekly", bookkeepingFirstDate: iso(mon) }, null);
    eq("weekly: exactly one task created", r2.count, 1);
    const { rows: [t2] } = await db.query("SELECT * FROM tasks WHERE client_id=$1", [c2]);
    const wd = (s) => new Date(s + "T12:00:00Z").getUTCDay(); const open = d(t2.open_date), due = d(t2.due_date), bp = t2.metadata.bookkeepingPeriod;
    eq("weekly: generated on a Thursday", wd(open), 4);
    eq("weekly: period runs Monday -> Friday of the previous week", [wd(bp.start), wd(bp.end), (new Date(bp.end) - new Date(bp.start)) / 864e5], [1, 5, 4]);
    eq("weekly: period ends the Friday 6 days before generation", (new Date(open) - new Date(bp.end)) / 864e5, 6);
    eq("weekly: due the Friday after the chaser Friday", [wd(due), (new Date(due) - new Date(open)) / 864e5], [5, 8]);
  } finally {
    await db.query("DELETE FROM tasks WHERE client_id = ANY($1)", [ids]); await db.query("DELETE FROM users WHERE id = ANY($1)", [ids]);
    console.log(`\n${pass}/${total} passed`); await db.pool.end(); process.exit(pass === total ? 0 : 1);
  }
})().catch((e) => { console.error(e); process.exit(1); });
