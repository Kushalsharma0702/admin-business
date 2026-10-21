// schedule.js — Excel-accurate recurring date generation for filing task types.
//
// Ports the tested date rules from the accounting workflow sheets
// ("Task details updated") so T2 / HST / Bookkeeping tasks auto-compute their
// open_date and due_date (and recur) instead of admins entering dates by hand.
//
// Pure + dependency-free. All dates are handled as UTC 'YYYY-MM-DD' strings.

const HORIZON_YEARS = 2;
const BACKFILL_GRACE_DAYS = 120;

// hstQuarterOption / bookkeepingQuarterOption stored as "Jan/Apr/Jul/Oct" etc.
const QUARTER_MONTHS = {
  "jan/apr/jul/oct": [1, 4, 7, 10],
  "feb/may/aug/nov": [2, 5, 8, 11],
  "mar/jun/sep/dec": [3, 6, 9, 12],
};

// Every dropdown offering this option (client-take-on.js's bookkeeping_period
// and hst_period fields) spells it "Mar/Jun/Sept/Dec" — "Sept", not "Sep" —
// which never matched QUARTER_MONTHS's key, so that quarter group silently
// produced zero periods. Normalize instead of relying on every caller/schema
// to spell it exactly right.
function quarterMonths(optionLabel) {
  return QUARTER_MONTHS[String(optionLabel || "").toLowerCase().replace("sept", "sep")];
}

// ── date helpers (UTC) ────────────────────────────────────────────────────────
function ymd(d) { return d.toISOString().slice(0, 10); }
function parse(s) { const [y, m, dd] = String(s).slice(0, 10).split("-").map(Number); return new Date(Date.UTC(y, m - 1, dd)); }
function lastDay(year, month /*1-12*/) { return new Date(Date.UTC(year, month, 0)).getUTCDate(); }

function addMonths(d, n) {
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + n;
  const year = Math.floor(total / 12);
  const month = total % 12; // 0-11
  const day = Math.min(d.getUTCDate(), lastDay(year, month + 1));
  return new Date(Date.UTC(year, month, day));
}
function firstOfMonth(d) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); }
function monthEnd(year, month /*1-12*/) { return new Date(Date.UTC(year, month - 1, lastDay(year, month))); }
function addDays(d, n) { const r = new Date(d); r.setUTCDate(r.getUTCDate() + n); return r; }
function safeYearEnd(base, year) {
  const m = base.getUTCMonth() + 1;
  return new Date(Date.UTC(year, m - 1, Math.min(base.getUTCDate(), lastDay(year, m))));
}

function isActive(open, due, today) {
  if (!open || open > today) return false;
  if (due && due < addDays(today, -BACKFILL_GRACE_DAYS)) return false;
  return true;
}

function candidateYears(today) {
  const y = today.getUTCFullYear();
  const out = [];
  for (let i = y - 1; i <= y + HORIZON_YEARS + 1; i++) out.push(i);
  return out;
}

function period(periodKey, taxYear, open, due) {
  return { periodKey, taxYear: String(taxYear), openDate: ymd(open), dueDate: ymd(due) };
}

// ── per-type period generators ────────────────────────────────────────────────
// Each returns [{ periodKey, taxYear, openDate, dueDate }, ...] currently active.

function t2Periods(config, today) {
  const fye = config.fiscalYearEnd ? parse(config.fiscalYearEnd) : null;
  if (!fye) return [];
  const out = [];
  for (const y of candidateYears(today)) {
    const ye = safeYearEnd(fye, y);
    const open = firstOfMonth(addMonths(ye, -2)); // 3 months before, first of month
    const due = addMonths(ye, 3);
    if (isActive(open, due, today)) out.push(period(`T2:${ymd(ye)}`, ye.getUTCFullYear(), open, due));
  }
  return out;
}

function installmentPeriods(config, today, enabledKey, yearEndKey, prefix) {
  if (!config[enabledKey] || !config[yearEndKey]) return [];
  const base = parse(config[yearEndKey]);
  const out = [];
  for (const y of candidateYears(today)) {
    const ye = safeYearEnd(base, y);
    for (let i = 0; i < 4; i++) {
      const q = addMonths(ye, 4 + 3 * i);
      const open = addDays(firstOfMonth(q), -1); // end of the preceding month
      if (isActive(open, q, today)) out.push(period(`${prefix}:${ymd(ye)}:${i}`, ye.getUTCFullYear(), open, q));
    }
  }
  return out;
}

function hstPeriod(keyDate, open, due) {
  return period(`HST:${ymd(keyDate)}`, keyDate.getUTCFullYear(), open, due);
}

// A period is current for exactly its own working window: from the day it
// opens (lead time arrives) through its due date. Unlike bookkeeping's
// "latest only" rule, this can legitimately keep MORE than one period
// current at once — HST Monthly's 3-month lead is wider than its 1-month
// cadence, so e.g. October, November and December are all inside their
// window simultaneously on any given October day, and all three genuinely
// are current work, not a backlog. What this still prevents is the original
// bug: a 120-day grace keeping every period from the last several months
// "active" long after its own due date had passed.
function currentHstPeriods(periods, today) {
  const t = ymd(today);
  return periods.filter((p) => p.openDate <= t && p.dueDate >= t);
}

function hstPeriods(config, today) {
  const freq = String(config.salesTaxFrequency || "").toLowerCase();
  const all = [];
  if (freq === "annual" && config.salesTaxYearEnd) {
    const base = parse(config.salesTaxYearEnd);
    for (const y of candidateYears(today)) {
      const ye = safeYearEnd(base, y);
      const open = addMonths(ye, -2);        // month-end, 3 months before
      const due = addMonths(ye, 3);
      all.push(hstPeriod(ye, open, due));
    }
  } else if (freq === "quarterly") {
    const months = quarterMonths(config.hstQuarterOption);
    // Due date corrected to +1 month per client-docs/"Task details updated" —
    // was +3 months, which (combined with the old 120-day grace window below)
    // is what let several quarters' tasks all appear at once.
    if (months) for (const y of candidateYears(today)) for (const m of months) {
      const qe = monthEnd(y, m);
      const due = addMonths(qe, 1);
      const open = firstOfMonth(addMonths(qe, -3));
      all.push(hstPeriod(qe, open, due));
    }
  } else if (freq === "monthly") {
    for (const y of candidateYears(today)) for (let m = 1; m <= 12; m++) {
      const me = monthEnd(y, m);
      const due = addMonths(me, 1);
      const open = addMonths(me, -3);
      all.push(hstPeriod(me, open, due));
    }
  }
  return currentHstPeriods(all, today)
    .concat(installmentPeriods(config, today, "craInstallmentInHST", "taxYearEnd", "HST_INSTALLMENT"));
}

// How far before a period's end its task appears, from the Bookkeeping form
// sheet's "Task generated" column: monthly and quarterly "1 month Ago",
// yearly "3 month Ago". Weekly has no lead — the task is created on the
// effective date itself ("Instantly task created ... based on effective date").
const BOOKKEEPING_LEAD_MONTHS = { monthly: 1, quarterly: 1, yearly: 3, annual: 3 };

// ── Bookkeeping due-date rule ────────────────────────────────────────────────
//
// Each client can override *when* a bookkeeping task falls due with a repeat
// rule chosen on the Bookkeeping tab (config.bookkeepingDueRule), instead of
// the fixed period-end offsets above. The rule describes a recurring date;
// a period's due date is the rule's first occurrence on or after that period
// ends. Shape (all fields optional except `type`):
//
//   { type: "default" | "day" | "week" | "month" | "year",
//     interval:   1,            // "every N <unit>", >= 1
//     weekdays:   [2],          // type "week": 0=Sun … 6=Sat
//     dayOfMonth: 15 | "last",  // type "month"/"year"
//     month:      1-12 }        // type "year"
//
// "default" (or a missing/!unrecognised rule) keeps the existing offsets, so
// every client configured before this field existed is unaffected.
//
// The recurrence is anchored on the client's first bookkeeping date, which is
// what makes "every 2 weeks" mean anything — without an anchor, only interval
// 1 would be well defined. Defaults for the unset parts of a rule are read off
// that same anchor (its weekday / day-of-month / month).

const MAX_DUE_SCAN_DAYS = 800; // ~2 years: beyond any interval the UI offers

function normalizeDueRule(raw) {
  if (!raw || typeof raw !== "object") return null;
  const type = String(raw.type || "").toLowerCase();
  if (!["day", "week", "month", "year"].includes(type)) return null; // incl. "default"
  const interval = Math.max(1, Math.min(52, Number(raw.interval) || 1));
  const weekdays = Array.isArray(raw.weekdays)
    ? [...new Set(raw.weekdays.map(Number).filter((d) => d >= 0 && d <= 6))].sort()
    : [];
  const dayOfMonth = raw.dayOfMonth === "last" ? "last"
    : (Number(raw.dayOfMonth) >= 1 && Number(raw.dayOfMonth) <= 31 ? Number(raw.dayOfMonth) : null);
  const month = Number(raw.month) >= 1 && Number(raw.month) <= 12 ? Number(raw.month) : null;
  return { type, interval, weekdays, dayOfMonth, month };
}

function daysBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

// Day-of-month D in a given year/month, clamped to that month's real length so
// "the 31st" still resolves in February instead of rolling into March.
function dayInMonth(year, month /*1-12*/, d) {
  const last = lastDay(year, month);
  const day = d === "last" ? last : Math.min(d, last);
  return new Date(Date.UTC(year, month - 1, day));
}

// First occurrence of `rule` on or after `from`, anchored at `anchor`.
// Returns null when the rule can't produce one inside the scan horizon.
function nextDueOccurrence(rule, from, anchor) {
  const start = from > anchor ? from : anchor;

  if (rule.type === "day") {
    const offset = daysBetween(anchor, start);
    const rem = ((offset % rule.interval) + rule.interval) % rule.interval;
    return addDays(start, rem === 0 ? 0 : rule.interval - rem);
  }

  if (rule.type === "week") {
    const want = rule.weekdays.length ? rule.weekdays : [anchor.getUTCDay()];
    // Week 0 is the week containing the anchor; weeks are compared from each
    // week's Sunday so a rule firing Tue/Thu stays inside one interval step.
    const anchorWeekStart = addDays(anchor, -anchor.getUTCDay());
    for (let i = 0; i <= MAX_DUE_SCAN_DAYS; i++) {
      const d = addDays(start, i);
      if (!want.includes(d.getUTCDay())) continue;
      const weekIndex = Math.floor(daysBetween(anchorWeekStart, addDays(d, -d.getUTCDay())) / 7);
      if (weekIndex >= 0 && weekIndex % rule.interval === 0) return d;
    }
    return null;
  }

  if (rule.type === "month") {
    const dom = rule.dayOfMonth ?? anchor.getUTCDate();
    const anchorIdx = anchor.getUTCFullYear() * 12 + anchor.getUTCMonth();
    let idx = start.getUTCFullYear() * 12 + start.getUTCMonth();
    // Step forward to the next month that lands on the interval grid.
    const rem = ((idx - anchorIdx) % rule.interval + rule.interval) % rule.interval;
    if (rem !== 0) idx += rule.interval - rem;
    for (let i = 0; i < 64; i++, idx += rule.interval) {
      if (idx < anchorIdx) continue;
      const d = dayInMonth(Math.floor(idx / 12), (idx % 12) + 1, dom);
      if (d >= start) return d;
    }
    return null;
  }

  // year
  const mon = rule.month ?? anchor.getUTCMonth() + 1;
  const dom = rule.dayOfMonth ?? anchor.getUTCDate();
  const anchorYear = anchor.getUTCFullYear();
  let year = start.getUTCFullYear();
  const rem = ((year - anchorYear) % rule.interval + rule.interval) % rule.interval;
  if (rem !== 0) year += rule.interval - rem;
  for (let i = 0; i < 20; i++, year += rule.interval) {
    if (year < anchorYear) continue;
    const d = dayInMonth(year, mon, dom);
    if (d >= start) return d;
  }
  return null;
}

// Due date for one bookkeeping period: the rule's first occurrence on or after
// the period ends, or `fallbackDue` when no usable rule is configured.
function bookkeepingDueDate(config, periodEnd, fallbackDue) {
  const rule = normalizeDueRule(config.bookkeepingDueRule);
  if (!rule) return fallbackDue;
  const anchor = config.bookkeepingFirstDate ? parse(config.bookkeepingFirstDate) : periodEnd;
  return nextDueOccurrence(rule, periodEnd, anchor) || fallbackDue;
}

// `keyDate` identifies the period and must stay stable — it is the dedup key
// against tasks already in the database. `periodEnd` is only used to decide
// whether a period falls after the client's first bookkeeping date; for
// monthly/quarterly/yearly they are the same date, for weekly they differ
// (keyed on the week's start, ends six days later).
function bkPeriod(keyDate, open, due, periodEnd = keyDate) {
  return {
    ...period(`BOOKKEEPING:${ymd(keyDate)}`, keyDate.getUTCFullYear(), open, due),
    periodEnd: ymd(periodEnd),
  };
}

// One task per period, appearing the day its lead time arrives — not a backlog.
//
// The old rule kept every period whose due date was still inside a 120-day
// grace window, which for a monthly client meant 8 identical tasks created the
// moment bookkeeping was switched on. Keep only the latest period that has
// opened; the daily sweep adds the next one on the day it opens. Periods that
// end before the client's first bookkeeping date were never theirs to do.
function currentBookkeepingPeriod(periods, today, startDate) {
  const t = ymd(today);
  const start = startDate ? ymd(startDate) : null;
  const opened = periods
    .filter((p) => p.openDate <= t)
    .filter((p) => !start || p.periodEnd >= start)
    .sort((a, b) => (a.openDate < b.openDate ? 1 : -1));
  return opened.length ? [opened[0]] : [];
}

function bookkeepingPeriods(config, today) {
  const freq = String(config.bookkeepingFrequency || "").toLowerCase();
  const start = config.bookkeepingFirstDate ? parse(config.bookkeepingFirstDate) : null;
  const lead = BOOKKEEPING_LEAD_MONTHS[freq] ?? 0;
  const all = [];

  // The client's Due Date rule, when set, replaces the per-frequency offset
  // below; `due(periodEnd, fallback)` resolves whichever applies.
  const due = (periodEnd, fallback) => bookkeepingDueDate(config, periodEnd, fallback);

  if (freq === "quarterly") {
    const months = quarterMonths(config.bookkeepingQuarterOption);
    if (months) for (const y of candidateYears(today)) for (const m of months) {
      const qe = monthEnd(y, m);
      all.push(bkPeriod(qe, addMonths(qe, -lead), due(qe, addMonths(qe, 3))));
    }
  } else if (freq === "monthly") {
    for (const y of candidateYears(today)) for (let m = 1; m <= 12; m++) {
      const me = monthEnd(y, m);
      all.push(bkPeriod(me, addMonths(me, -lead), due(me, addMonths(me, 1))));
    }
  } else if (freq === "yearly" || freq === "annual") {
    // The client's first bookkeeping date acts as the year-end anchor, the same
    // role salesTaxYearEnd plays for HST.
    if (!start) return [];
    for (const y of candidateYears(today)) {
      const ye = safeYearEnd(start, y);
      all.push(bkPeriod(ye, addMonths(ye, -lead), due(ye, addMonths(ye, 3))));
    }
  } else if (freq === "weekly") {
    // Anchored to the weekday of the client's chosen effective date, so
    // "generated based on effective date" is literally true. Falls back to
    // Friday when no first date was given.
    const anchorDow = start ? start.getUTCDay() : 5;
    let d = new Date(today);
    while (d.getUTCDay() !== anchorDow) d = addDays(d, -1);
    const weekEnd = addDays(d, 6);
    all.push(bkPeriod(d, d, due(weekEnd, weekEnd), weekEnd));
  } else {
    return [];
  }

  return currentBookkeepingPeriod(all, today, start);
}

// ── public API ────────────────────────────────────────────────────────────────

// Compute open/due for a single filing task from its config (for manual creation).
// Returns { openDate, dueDate } (most-recent active period) or {} if not derivable.
function computeDatesForTask(taskType, config = {}, today = new Date()) {
  const gen = { CORPORATE_TAX_RETURN: t2Periods, HST: hstPeriods, BOOKKEEPING: bookkeepingPeriods }[taskType];
  if (!gen) return {};
  const periods = gen(config, today).sort((a, b) => (a.openDate < b.openDate ? 1 : -1));
  return periods.length ? { openDate: periods[0].openDate, dueDate: periods[0].dueDate, taxYear: periods[0].taxYear } : {};
}

// Plan all currently-active filing tasks for a client's service config.
// `config` may hold fields for several types at once. Returns period descriptors
// tagged with taskType, for the caller to upsert (dedup on periodKey).
function planFilingTasks(config = {}, today = new Date()) {
  const out = [];
  if (config.t2Enabled || config.fiscalYearEnd) {
    for (const p of t2Periods(config, today)) out.push({ taskType: "CORPORATE_TAX_RETURN", ...p });
    for (const p of installmentPeriods(config, today, "craInstallmentInT2", "taxYearEnd", "T2_INSTALLMENT"))
      out.push({ taskType: "CORPORATE_TAX_QUARTERLY_PAYMENT", ...p, isInstallment: true });
  }
  if (config.salesTaxFrequency) {
    for (const p of hstPeriods(config, today)) {
      const taskType = p.periodKey.startsWith("HST_INSTALLMENT:")
        ? "HST_QUARTERLY_PAYMENT"
        : "HST";
      out.push({ taskType, ...p });
    }
  }
  if (config.bookkeepingFrequency) for (const p of bookkeepingPeriods(config, today)) out.push({ taskType: "BOOKKEEPING", ...p });
  return out;
}

module.exports = {
  addMonths, firstOfMonth, monthEnd, safeYearEnd, ymd, parse, addDays,
  computeDatesForTask, planFilingTasks,
  t2Periods, hstPeriods, bookkeepingPeriods, installmentPeriods,
  normalizeDueRule, nextDueOccurrence, bookkeepingDueDate,
};
