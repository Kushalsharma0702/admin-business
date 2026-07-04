// Validates schedule.js date math against the accounting workflow example rows.
// Run: node scripts/test-schedule.js
const s = require("../src/schedule");

let pass = 0, fail = 0;
function eq(actual, expected, name) {
  if (actual === expected) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name}: got ${actual}, want ${expected}`); }
}

// addMonths month-end clamping
eq(s.ymd(s.addMonths(s.parse("2026-01-31"), 1)), "2026-02-28", "addMonths Jan31+1=Feb28");
eq(s.ymd(s.addMonths(s.parse("2025-12-31"), 3)), "2026-03-31", "addMonths Dec31+3=Mar31");
eq(s.ymd(s.addMonths(s.parse("2025-01-31"), 3)), "2025-04-30", "addMonths Jan31+3=Apr30");
eq(s.ymd(s.addMonths(s.parse("2024-02-29"), 12)), "2025-02-28", "addMonths leap Feb29+12=Feb28");

// T2: FYE 2024-12-31 → year end 2025-12-31 → open 2025-10-01, due 2026-03-31
const t2 = s.t2Periods({ fiscalYearEnd: "2024-12-31" }, s.parse("2026-01-01"));
const t2a = t2.find(p => p.periodKey === "T2:2025-12-31");
eq(t2a && t2a.openDate, "2025-10-01", "T2 open");
eq(t2a && t2a.dueDate, "2026-03-31", "T2 due");

// HST annual: year end 2025-12-31 → open 2025-10-31, due 2026-03-31
const hstA = s.hstPeriods({ salesTaxFrequency: "annual", salesTaxYearEnd: "2024-12-31" }, s.parse("2026-01-01"));
const hstAa = hstA.find(p => p.periodKey === "HST:2025-12-31");
eq(hstAa && hstAa.openDate, "2025-10-31", "HST annual open");
eq(hstAa && hstAa.dueDate, "2026-03-31", "HST annual due");

// HST quarterly Jan/Apr/Jul/Oct: qe 2025-01-31 → due 2025-04-30, open 2024-10-01
const hstQ = s.hstPeriods({ salesTaxFrequency: "quarterly", hstQuarterOption: "Jan/Apr/Jul/Oct" }, s.parse("2025-02-15"));
const hstQa = hstQ.find(p => p.periodKey === "HST:2025-01-31");
eq(hstQa && hstQa.openDate, "2024-10-01", "HST quarterly open");
eq(hstQa && hstQa.dueDate, "2025-04-30", "HST quarterly due");

// HST monthly: me 2026-01-31 → due 2026-02-28, open 2025-10-31
const hstM = s.hstPeriods({ salesTaxFrequency: "monthly" }, s.parse("2025-11-01"));
const hstMa = hstM.find(p => p.periodKey === "HST:2026-01-31");
eq(hstMa && hstMa.openDate, "2025-10-31", "HST monthly open");
eq(hstMa && hstMa.dueDate, "2026-02-28", "HST monthly due");

// Installments: tax year end 2025-12-31 → Q1 due 2026-04-30 open 2026-03-31
const inst = s.installmentPeriods(
  { craInstallmentInT2: true, taxYearEnd: "2025-12-31" }, s.parse("2026-04-01"), "craInstallmentInT2", "taxYearEnd", "T2_INSTALLMENT");
const inst0 = inst.find(p => p.periodKey === "T2_INSTALLMENT:2025-12-31:0");
eq(inst0 && inst0.dueDate, "2026-04-30", "installment Q1 due");
eq(inst0 && inst0.openDate, "2026-03-31", "installment Q1 open");

// computeDatesForTask convenience
const cd = s.computeDatesForTask("CORPORATE_TAX_RETURN", { fiscalYearEnd: "2024-12-31" }, s.parse("2025-11-01"));
eq(cd.openDate, "2025-10-01", "computeDatesForTask T2 open");

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
