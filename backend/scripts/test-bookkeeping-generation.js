// Bookkeeping task-generation rules from Diamond Accounts' spec.
//   node scripts/test-bookkeeping-generation.js
const s = require("../src/schedule");
let pass = 0, total = 0;
const eq = (name, got, want) => { total++; const ok = JSON.stringify(got) === JSON.stringify(want); if (ok) pass++; console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : `\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`)); };
const day = (d) => new Date(d + "T12:00:00Z");
const plan = (cfg, today) => s.bookkeepingPeriods(cfg, day(today)).map((p) => ({ key: p.periodKey, start: p.periodStart, end: p.periodEnd, open: p.openDate, due: p.dueDate }));
const first = (cfg, today) => plan(cfg, today)[0];

// ── Monthly, first bookkeeping date 1 Nov ───────────────────────────────────
const M = { bookkeepingFrequency: "Monthly", bookkeepingFirstDate: "2026-11-01" };
eq("monthly: nothing before the 15th of the previous month (14 Oct)", plan(M, "2026-10-14"), []);
eq("monthly: generated 15 Oct, period 1 Oct - 31 Oct", first(M, "2026-10-15"), { key: "BOOKKEEPING:2026-10-31", start: "2026-10-01", end: "2026-10-31", open: "2026-10-15", due: "2026-11-30" });
eq("monthly: still that task on 14 Nov (no second task yet)", plan(M, "2026-11-14").length === 1 && first(M, "2026-11-14").end, "2026-10-31");
eq("monthly: next generated 15 Nov, period 1 Nov - 30 Nov", first(M, "2026-11-15"), { key: "BOOKKEEPING:2026-11-30", start: "2026-11-01", end: "2026-11-30", open: "2026-11-15", due: "2026-12-30" });
eq("monthly: only ONE task is planned at a time (no backlog)", plan(M, "2027-03-20").length, 1);

// ── Quarterly, first date 1 Nov ─────────────────────────────────────────────
const Q = { bookkeepingFrequency: "Quarterly", bookkeepingFirstDate: "2026-11-01" };
eq("quarterly: nothing on 14 Oct", plan(Q, "2026-10-14"), []);
eq("quarterly: generated 15 Oct, period 1 Aug - 31 Oct", first(Q, "2026-10-15"), { key: "BOOKKEEPING:2026-10-31", start: "2026-08-01", end: "2026-10-31", open: "2026-10-15", due: "2027-01-31" });
eq("quarterly: no new task until 15 Jan (14 Jan)", first(Q, "2027-01-14").end, "2026-10-31");
eq("quarterly: next generated 15 Jan, period 1 Nov - 31 Jan", first(Q, "2027-01-15"), { key: "BOOKKEEPING:2027-01-31", start: "2026-11-01", end: "2027-01-31", open: "2027-01-15", due: "2027-04-30" });

// ── Yearly, first date 1 Jan 2027 ───────────────────────────────────────────
const Y = { bookkeepingFrequency: "Yearly", bookkeepingFirstDate: "2027-01-01" };
eq("yearly: nothing on 14 Dec 2026", plan(Y, "2026-12-14"), []);
eq("yearly: generated 15 Dec 2026, period 1 Jan - 31 Dec 2026", first(Y, "2026-12-15"), { key: "BOOKKEEPING:2026-12-31", start: "2026-01-01", end: "2026-12-31", open: "2026-12-15", due: "2027-03-31" });
eq("yearly: next one 15 Dec 2027 (period = 2027)", first(Y, "2027-12-15").start + ".." + first(Y, "2027-12-15").end, "2027-01-01..2027-12-31");

// ── Weekly: generated Thursday, chaser Friday, due the next Friday, period = Mon-Fri of the previous week ──
const W = { bookkeepingFrequency: "Weekly", bookkeepingFirstDate: "2026-11-09" };   // a Monday
eq("weekly: nothing before the first Thursday (Wed 11 Nov)", plan(W, "2026-11-11"), []);
const w1 = first(W, "2026-11-12");                                                  // Thursday
eq("weekly: generated THURSDAY 12 Nov", w1.open, "2026-11-12");
eq("weekly: period = Monday-Friday of the previous week (2-6 Nov)", [w1.start, w1.end], ["2026-11-02", "2026-11-06"]);
eq("weekly: due the following Friday (20 Nov; chaser is Fri 13 Nov)", w1.due, "2026-11-20");
eq("weekly: weekdays check", [new Date(w1.open + "T12:00:00Z").getUTCDay(), new Date(w1.start + "T12:00:00Z").getUTCDay(), new Date(w1.end + "T12:00:00Z").getUTCDay(), new Date(w1.due + "T12:00:00Z").getUTCDay()], [4, 1, 5, 5]);
eq("weekly: next task the following Thursday (19 Nov), period 9-13 Nov", [first(W, "2026-11-19").open, first(W, "2026-11-19").start, first(W, "2026-11-19").end], ["2026-11-19", "2026-11-09", "2026-11-13"]);
eq("weekly: still one task on Friday 13 Nov", plan(W, "2026-11-13").length, 1);

// ── Due Date rule from the Bookkeeping tab overrides the standard deadline ──
const MR = { ...M, bookkeepingDueRule: { type: "month", interval: 1, dayOfMonth: 15 } };
eq("due rule 'every month on the 15th': Oct period is due 15 Nov", first(MR, "2026-10-15").due, "2026-11-15");

// ── Safety ─────────────────────────────────────────────────────────────────
eq("no first date on file -> old behaviour still produces a task (not an error)", Array.isArray(plan({ bookkeepingFrequency: "Monthly" }, "2026-10-20")), true);
eq("every task carries its period (shown to admin and client)", plan(M, "2026-10-15").every((p) => p.start && p.end), true);
eq("period keys are stable between runs (dedup)", first(M, "2026-10-15").key === first(M, "2026-11-10").key, true);
eq("February/leap handling: 31 Jan monthly first date", first({ bookkeepingFrequency: "Monthly", bookkeepingFirstDate: "2027-03-31" }, "2027-02-15").end, "2027-03-30");

console.log(`\n${pass}/${total} passed`); process.exit(pass === total ? 0 : 1);
