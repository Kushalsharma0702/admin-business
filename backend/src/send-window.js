// send-window.js — when a chaser/reminder email is allowed to go out.
//
// Rules (from the Bookkeeping chaser spec):
//   • Never on Saturday or Sunday.
//   • Never on a Canadian bank holiday.
//   • Not before 09:00 — the first notification of a day goes at 09:00.
//   • On Monday, not before 13:00 (the "Monday until 1 pm" hold).
//
// All times are evaluated in Atlantic time (America/Halifax), which is what
// "ADT" in the spec means. Using the IANA zone rather than a fixed -03:00
// keeps it correct across the AST/ADT changeover instead of drifting by an
// hour for half the year.
//
// The scheduler calls this every hour, so "09:00" means "the first hourly
// tick at or after 09:00 local" — combined with the per-task once-per-day
// guard in chaser-scheduler.js, each task gets at most one email per day.

const ZONE = "America/Halifax";

const PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONE,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false,
});

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// Atlantic-local calendar fields for an instant.
function atlanticParts(date = new Date()) {
  const out = {};
  for (const p of PARTS.formatToParts(date)) out[p.type] = p.value;
  // "24" shows up at midnight in some ICU builds; normalise it to 0.
  const hour = Number(out.hour) % 24;
  return {
    year:  Number(out.year),
    month: Number(out.month),
    day:   Number(out.day),
    hour,
    minute: Number(out.minute),
    weekday: WEEKDAY_INDEX[out.weekday],
    ymd: `${out.year}-${out.month}-${out.day}`,
  };
}

// ── Canadian bank holidays ──────────────────────────────────────────────────

// Anonymous Gregorian computus — Easter Sunday for a year.
function easterSunday(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function addDaysYMD(year, month, day, delta) {
  const d = new Date(Date.UTC(year, month - 1, day + delta));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function dowOf(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

// nth (1-based) `dow` of a month; n = -1 means the last one.
function nthWeekday(year, month, dow, n) {
  if (n > 0) {
    const first = dowOf(year, month, 1);
    return 1 + ((dow - first + 7) % 7) + (n - 1) * 7;
  }
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastDow = dowOf(year, month, last);
  return last - ((lastDow - dow + 7) % 7);
}

function key(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// A fixed-date holiday landing on a weekend is observed the following Monday
// (banks are shut that day instead). Weekends are already blocked, so this
// only matters for the Monday it pushes onto.
function observed(set, year, month, day) {
  set.add(key(year, month, day));
  const dow = dowOf(year, month, day);
  if (dow === 6) { const o = addDaysYMD(year, month, day, 2); set.add(key(o.year, o.month, o.day)); }
  if (dow === 0) { const o = addDaysYMD(year, month, day, 1); set.add(key(o.year, o.month, o.day)); }
}

const holidayCache = new Map();

// National / bank holidays observed across Canada. Province-only days
// (Family Day, Civic Holiday, St. Jean Baptiste, …) are deliberately not here:
// they are not uniform nationally, and treating them as national would mute
// chasers for every client over days most of the country works.
function canadianHolidays(year) {
  if (holidayCache.has(year)) return holidayCache.get(year);
  const set = new Set();

  observed(set, year, 1, 1);    // New Year's Day
  observed(set, year, 7, 1);    // Canada Day
  observed(set, year, 9, 30);   // National Day for Truth and Reconciliation
  observed(set, year, 11, 11);  // Remembrance Day
  observed(set, year, 12, 25);  // Christmas Day
  observed(set, year, 12, 26);  // Boxing Day

  // Good Friday — two days before Easter Sunday.
  const easter = easterSunday(year);
  const gf = addDaysYMD(year, easter.month, easter.day, -2);
  set.add(key(gf.year, gf.month, gf.day));

  // Victoria Day — the Monday on or before May 24.
  const may24Dow = dowOf(year, 5, 24);
  set.add(key(year, 5, 24 - ((may24Dow - 1 + 7) % 7)));

  set.add(key(year, 9, nthWeekday(year, 9, 1, 1)));   // Labour Day — 1st Monday in September
  set.add(key(year, 10, nthWeekday(year, 10, 1, 2))); // Thanksgiving — 2nd Monday in October

  holidayCache.set(year, set);
  return set;
}

function isCanadianHoliday(year, month, day) {
  return canadianHolidays(year).has(key(year, month, day));
}

// ── The window ──────────────────────────────────────────────────────────────

const FIRST_SEND_HOUR = 9;   // 09:00 Atlantic
const MONDAY_HOLD_HOUR = 13; // Monday: nothing before 13:00
const LAST_SEND_HOUR = 20;   // don't start a send run late at night

/**
 * Whether a reminder may be sent at `date`.
 * @returns {{ ok: boolean, reason: string, local: object }}
 */
function canSendAt(date = new Date()) {
  const p = atlanticParts(date);

  if (p.weekday === 6) return { ok: false, reason: "Saturday", local: p };
  if (p.weekday === 0) return { ok: false, reason: "Sunday", local: p };
  if (isCanadianHoliday(p.year, p.month, p.day)) {
    return { ok: false, reason: "Canadian bank holiday", local: p };
  }

  const earliest = p.weekday === 1 ? MONDAY_HOLD_HOUR : FIRST_SEND_HOUR;
  if (p.hour < earliest) {
    return { ok: false, reason: `before ${earliest}:00 Atlantic`, local: p };
  }
  if (p.hour >= LAST_SEND_HOUR) {
    return { ok: false, reason: `after ${LAST_SEND_HOUR}:00 Atlantic`, local: p };
  }

  return { ok: true, reason: "", local: p };
}

/** The Atlantic-local calendar date, used for "already sent today" guards. */
function atlanticDateKey(date = new Date()) {
  const p = atlanticParts(date);
  return key(p.year, p.month, p.day);
}

module.exports = {
  ZONE,
  canSendAt,
  atlanticParts,
  atlanticDateKey,
  canadianHolidays,
  isCanadianHoliday,
  FIRST_SEND_HOUR,
  MONDAY_HOLD_HOUR,
};
