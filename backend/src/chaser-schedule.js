// chaser-schedule.js — the admin-configured "Chaser Email Schedule" for a
// client's Bookkeeping tasks.
//
// Stored on the client's take-on answers as `bookkeeping_chaser_schedule`:
//   { mode: "custom", intervalDays, startOffsetDays, durationDays, extraDates }
//     intervalDays     — resend every N days while data is still outstanding
//     startOffsetDays  — first email goes N days after the task's open date
//     durationDays     — keep chasing for this many days from the first email
//     extraDates       — extra one-off YYYY-MM-DD dates to send on regardless
// Anything else (absent, mode "default", malformed) means "use the standard
// cadence in chaser-scheduler.js".
//
// Pure and dependency-free so the rules can be tested without a database.
// WHEN an email may actually leave (weekends, bank holidays, Monday before
// 13:00, 09:00 start) is not decided here — send-window.js gates every send.

const LIMITS = {
  intervalDays:    { min: 1, max: 30,  def: 2 },
  startOffsetDays: { min: 0, max: 60,  def: 0 },
  durationDays:    { min: 1, max: 120, def: 14 },
};
const MAX_EXTRA_DATES = 20;

function clampInt(value, { min, max, def }) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function isYMD(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// Returns a clean custom schedule, or null for "use the default cadence".
function normalizeChaserSchedule(raw) {
  if (!raw || typeof raw !== "object" || raw.mode !== "custom") return null;
  const extra = Array.isArray(raw.extraDates) ? raw.extraDates.filter(isYMD) : [];
  return {
    mode: "custom",
    intervalDays:    clampInt(raw.intervalDays,    LIMITS.intervalDays),
    startOffsetDays: clampInt(raw.startOffsetDays, LIMITS.startOffsetDays),
    durationDays:    clampInt(raw.durationDays,    LIMITS.durationDays),
    extraDates: [...new Set(extra)].sort().slice(0, MAX_EXTRA_DATES),
  };
}

function ymdToUTC(s) { return new Date(`${s.slice(0, 10)}T00:00:00Z`); }
function daysBetween(a, b) { return Math.floor((b.getTime() - a.getTime()) / 86400000); }

/**
 * Whether a custom-schedule task is due an email today.
 * @param schedule   normalized schedule
 * @param openDate   'YYYY-MM-DD' the task opened (the schedule's anchor)
 * @param todayYMD   'YYYY-MM-DD' (Atlantic calendar day)
 * @param daysSinceLast  days since the last email, Infinity if none sent yet
 */
function customChaserDue({ schedule, openDate, todayYMD, daysSinceLast }) {
  if (!schedule) return false;
  if (schedule.extraDates.includes(todayYMD)) return true;
  if (!openDate) return false;

  const sinceStart = daysBetween(ymdToUTC(openDate), ymdToUTC(todayYMD)) - schedule.startOffsetDays;
  if (sinceStart < 0 || sinceStart > schedule.durationDays) return false;
  return daysSinceLast >= schedule.intervalDays;
}

module.exports = { normalizeChaserSchedule, customChaserDue, LIMITS, isYMD };
