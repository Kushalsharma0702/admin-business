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

function hstPeriods(config, today) {
  const freq = String(config.salesTaxFrequency || "").toLowerCase();
  const out = [];
  if (freq === "annual" && config.salesTaxYearEnd) {
    const base = parse(config.salesTaxYearEnd);
    for (const y of candidateYears(today)) {
      const ye = safeYearEnd(base, y);
      const open = addMonths(ye, -2);        // month-end, 3 months before
      const due = addMonths(ye, 3);
      if (isActive(open, due, today)) out.push(period(`HST:${ymd(ye)}`, ye.getUTCFullYear(), open, due));
    }
  } else if (freq === "quarterly") {
    const months = QUARTER_MONTHS[String(config.hstQuarterOption || "").toLowerCase()];
    if (months) for (const y of candidateYears(today)) for (const m of months) {
      const qe = monthEnd(y, m);
      const due = addMonths(qe, 3);
      const open = firstOfMonth(addMonths(qe, -3));
      if (isActive(open, due, today)) out.push(period(`HST:${ymd(qe)}`, y, open, due));
    }
  } else if (freq === "monthly") {
    for (const y of candidateYears(today)) for (let m = 1; m <= 12; m++) {
      const me = monthEnd(y, m);
      const due = addMonths(me, 1);
      const open = addMonths(me, -3);
      if (isActive(open, due, today)) out.push(period(`HST:${ymd(me)}`, y, open, due));
    }
  }
  return out.concat(installmentPeriods(config, today, "craInstallmentInHST", "taxYearEnd", "HST_INSTALLMENT"));
}

function bookkeepingPeriods(config, today) {
  const freq = String(config.bookkeepingFrequency || "").toLowerCase();
  const out = [];
  if (freq === "quarterly") {
    const months = QUARTER_MONTHS[String(config.bookkeepingQuarterOption || "").toLowerCase()];
    if (months) for (const y of candidateYears(today)) for (const m of months) {
      const qe = monthEnd(y, m);
      const due = addMonths(qe, 3);
      const open = firstOfMonth(addMonths(qe, -3));
      if (isActive(open, due, today)) out.push(period(`BOOKKEEPING:${ymd(qe)}`, y, open, due));
    }
  } else if (freq === "monthly") {
    for (const y of candidateYears(today)) for (let m = 1; m <= 12; m++) {
      const me = monthEnd(y, m);
      const due = addMonths(me, 1);
      const open = addMonths(me, -3);
      if (isActive(open, due, today)) out.push(period(`BOOKKEEPING:${ymd(me)}`, y, open, due));
    }
  } else if (freq === "weekly") {
    for (let i = 0; i < 14; i++) {
      const d = addDays(today, -i);
      if (d.getUTCDay() === 5) out.push(period(`BOOKKEEPING:${ymd(d)}`, d.getUTCFullYear(), d, addDays(d, 6)));
    }
  }
  return out;
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
};
