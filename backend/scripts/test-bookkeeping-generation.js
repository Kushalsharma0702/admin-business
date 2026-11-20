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
eq("monthly: next generated 15 Nov, period 1 Nov - 30 Nov", first(M, "2026-11-15"), { key: "BOOKKEEPING:2026-11-30", start: "2026-11-01", end: "2026-11-30", open: "2026-11-15", due: "2026-12-31" });
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

// ── Weekly: period = Mon-Fri of a week, opens THURSDAY of that same week, due the Friday of the NEXT week ──
const W = { bookkeepingFrequency: "Weekly", bookkeepingFirstDate: "2026-11-16" };   // a Monday
eq("weekly: first period shows immediately, even before its own Thursday (Mon 16 Nov)",
  first(W, "2026-11-16"), { key: "BOOKKEEPING:2026-11-16", start: "2026-11-16", end: "2026-11-20", open: "2026-11-19", due: "2026-11-27" });
const w1 = first(W, "2026-11-21");
eq("weekly: period 16-20 Nov opens Thu 19 Nov, due Fri 27 Nov", [w1.start, w1.end, w1.open, w1.due], ["2026-11-16", "2026-11-20", "2026-11-19", "2026-11-27"]);
eq("weekly: weekdays check (open Thu, start Mon, end Fri, due Fri)", [new Date(w1.open + "T12:00:00Z").getUTCDay(), new Date(w1.start + "T12:00:00Z").getUTCDay(), new Date(w1.end + "T12:00:00Z").getUTCDay(), new Date(w1.due + "T12:00:00Z").getUTCDay()], [4, 1, 5, 5]);
eq("weekly: next task Thu 26 Nov, period 23-27 Nov, due Fri 4 Dec", [first(W, "2026-11-26").open, first(W, "2026-11-26").start, first(W, "2026-11-26").end, first(W, "2026-11-26").due], ["2026-11-26", "2026-11-23", "2026-11-27", "2026-12-04"]);
eq("weekly: still the 16-20 task on Wed 25 Nov", first(W, "2026-11-25").start, "2026-11-16");
eq("weekly: first date Mon 23 Nov -> first period 23-27 Nov, opens 26 Nov, due 4 Dec",
  first({ ...W, bookkeepingFirstDate: "2026-11-23" }, "2026-11-21"), { key: "BOOKKEEPING:2026-11-23", start: "2026-11-23", end: "2026-11-27", open: "2026-11-26", due: "2026-12-04" });
eq("weekly: only ONE task is planned at a time", plan(W, "2026-12-30").length, 1);

// ── Due Date rule from the Bookkeeping tab overrides the standard deadline ──
const MR = { ...M, bookkeepingDueRule: { type: "month", interval: 1, dayOfMonth: 15 } };
const QR = { bookkeepingFrequency: "Quarterly", bookkeepingFirstDate: "2026-12-01", bookkeepingDueRule: { type: "month", interval: 3, dayOfMonth: "last" } };
eq("due rule 'every 3 months, last day': quarter 1 Sep-30 Nov is due 28 Feb 2027", [first(QR, "2026-11-21").end, first(QR, "2026-11-21").due], ["2026-11-30", "2027-02-28"]);
eq("due rule 'every 3 months, last day': next quarter 1 Dec-28 Feb is due 31 May", first(QR, "2027-02-20").due, "2027-05-31");
eq("due rule 'every 1 month, last day': monthly Nov period is due 31 Dec", first({ ...M, bookkeepingFirstDate: "2026-12-01", bookkeepingDueRule: { type: "month", interval: 1, dayOfMonth: "last" } }, "2026-11-21").due, "2026-12-31");
const WR = (r) => first({ ...W, bookkeepingDueRule: r }, "2026-11-21").due;
eq("due rule 'every 1 week on Friday': period ending Fri 20 Nov is due Fri 27 Nov (not the same day)", WR({ type: "week", interval: 1, weekdays: [5] }), "2026-11-27");
eq("due rule 'every 1 week on Monday': due Mon 23 Nov", WR({ type: "week", interval: 1, weekdays: [1] }), "2026-11-23");
eq("due rule 'every month on the 15th': Oct period is due 15 Nov", first(MR, "2026-10-15").due, "2026-11-15");

// ── Safety ─────────────────────────────────────────────────────────────────
eq("no first date on file -> old behaviour still produces a task (not an error)", Array.isArray(plan({ bookkeepingFrequency: "Monthly" }, "2026-10-20")), true);
eq("every task carries its period (shown to admin and client)", plan(M, "2026-10-15").every((p) => p.start && p.end), true);
eq("period keys are stable between runs (dedup)", first(M, "2026-10-15").key === first(M, "2026-11-10").key, true);
eq("February/leap handling: 31 Jan monthly first date", first({ bookkeepingFrequency: "Monthly", bookkeepingFirstDate: "2027-03-31" }, "2027-02-15").end, "2027-03-30");

console.log(`\n${pass}/${total} passed`); process.exit(pass === total ? 0 : 1);
