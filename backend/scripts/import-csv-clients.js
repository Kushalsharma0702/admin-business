#!/usr/bin/env node
// ONE-TIME: imports the 5 real corporate clients from Client_Export_DiamondAccounts.csv
// into taxease_admin (users + user_profiles + client_take_on_submissions), so the admin
// can preview what real customer data looks like in the dashboard.
//
// Deliberately NOT done here (matches the earlier agreed rule - admin preview only,
// no real client-facing action yet):
//   - No invite_tokens row, no invite email sent. password_hash is a random, unusable
//     placeholder (bcrypt of a value nobody has) - the real password gets set the normal
//     way once an admin actually sends this client an invite.
//   - status is 'draft', not 'submitted'. The hourly cron (regenerateRecurringTasks in
//     chaser-scheduler.js) only picks up status='submitted' rows with a bookkeeping_period
//     or hst_period answer - these clients DO have both, so 'submitted' would auto-create
//     real tasks and could fire a real chaser email to the client's real address within
//     the hour. 'draft' is fully inert: visible to the admin, untouched by any automation,
//     until an admin deliberately flips it to submitted.
//   - WCB username/password, bank account/routing numbers, T2/HST CRA web access codes are
//     NOT imported anywhere - there's no field for them on the client record (they only
//     ever belonged on a specific PAYROLL task's config, which this script does not create).
//
// nature_of_business is a fixed-option dropdown in the real form; the CSV's free-text
// values don't match any option exactly, so each is best-effort mapped to the closest one
// below (flagged per-client) - the exact original CSV text is preserved either way, in
// business_details.
//
// DRY RUN BY DEFAULT - prints what would be created, writes nothing. Pass --write to
// actually insert.
//   node scripts/import-csv-clients.js
//   node scripts/import-csv-clients.js --write
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("../src/db");

const CLIENTS = [
  {
    clientName: "4343629 Nova Scotia Ltd - Inder",
    businessArea: "Retail", natureOfBusinessRaw: "Convenience & Gas. Station",
    natureOfBusiness: "Fuel Stations", // best-effort match
    supportStaff: "Anmolpreet",
    addr1: "142 MCLEAN ST", addr2: "", city: "TRURO", province: "Nova Scotia", postal: "B2N 4W3",
    firstName: "Inderdeep", lastName: "Singh", email: "inders1989@gmail.com", phone: "778-344-0899",
    businessNumber: "786986000", incorpDate: "2021-07-20", fiscalYearEnd: "2022-06-30",
    bookkeepingFreq: "", bookkeepingFirstDate: "", bookkeepingMethod: "",
    payrollFreq: "Bi-Weekly",
    hstRegNumber: "", salesTaxFreq: "Annual", salesTaxYearEnd: "2022-06-30",
    comments: "",
  },
  {
    clientName: "BATTH FREIGHT SERVICES INC. - Satwant Singh Batth",
    businessArea: "Transport & storage", natureOfBusinessRaw: "Trucking client",
    natureOfBusiness: "Shipping & Logistics",
    supportStaff: "Anmolpreet / Krushang",
    addr1: "131 HIGGINS AVENUE", addr2: "BEECHVILLE, NS B3T0M5", city: "BEECHVILLE", province: "Nova Scotia", postal: "B3T0M5",
    firstName: "Satwant Singh", lastName: "Batth", email: "satwantsingh62@yahoo.com", phone: "9028188477",
    businessNumber: "753904002", incorpDate: "", fiscalYearEnd: "2023-12-31",
    bookkeepingFreq: "", bookkeepingFirstDate: "", bookkeepingMethod: "",
    payrollFreq: "Bi-Weekly",
    hstRegNumber: "753904002", salesTaxFreq: "Quarterly", hstQuarterOption: "Mar/Jun/Sept/Dec",
    comments: "",
  },
  {
    clientName: "AMC Kitchens Ltd - Amir Hashemi",
    businessArea: "Engineering", natureOfBusinessRaw: "Making Kitchen cabinet",
    natureOfBusiness: "Manufacturing & Assembly Plants",
    supportStaff: "Kalpesh",
    addr1: "78 Ternan Gate", addr2: "BEDFORD, NOVA SCOTIA, B4A 0G8", city: "BedFord", province: "Nova Scotia", postal: "B4A0G8",
    firstName: "AmirHossein", lastName: "Seyed", email: "amckitchens@yahoo.com", phone: "902-441-5560",
    businessNumber: "705662708", incorpDate: "2022-09-01", fiscalYearEnd: "2023-07-31",
    bookkeepingFreq: "Monthly", bookkeepingFirstDate: "2023-03-18", bookkeepingMethod: "Spreadsheet",
    payrollFreq: "",
    hstRegNumber: "705662708RT0001", salesTaxFreq: "Quarterly", hstQuarterOption: "Jan/Apr/Jul/Oct",
    comments: "14.09.2023 - Left voice mail to authorize us on CRA. 14.09.2023 - Client called back and we have sent job aid.",
  },
  {
    clientName: "Salt Air Collections Ltd",
    businessArea: "Arts & creative", natureOfBusinessRaw: "Collectibles",
    natureOfBusiness: "Art Dealing & Auctions",
    supportStaff: "Kalpesh",
    addr1: "", addr2: "", city: "", province: "Nova Scotia", postal: "",
    firstName: "Monique", lastName: "Ingalls", email: "mmingalls@gmail.com", phone: "9024767039",
    businessNumber: "754239135", incorpDate: "2019-12-31", fiscalYearEnd: "2023-12-31",
    bookkeepingFreq: "", bookkeepingFirstDate: "", bookkeepingMethod: "",
    payrollFreq: "",
    hstRegNumber: "", salesTaxFreq: "Annual", salesTaxYearEnd: "2023-12-31",
    comments: "",
  },
  {
    clientName: "697735 NB INC - Vandana Savant",
    businessArea: "Retail", natureOfBusinessRaw: "Gas Station",
    natureOfBusiness: "Fuel Stations",
    supportStaff: "Anmolpreet",
    addr1: "720 Main Street Suite 101", addr2: "", city: "Moncton", province: "New Brunswick", postal: "E1C1E4",
    firstName: "Rakesh", lastName: "", email: "Doverconv@gmail.com", phone: "506-377-7068",
    businessNumber: "", incorpDate: "2017-08-11", fiscalYearEnd: "",
    bookkeepingFreq: "", bookkeepingFirstDate: "", bookkeepingMethod: "",
    payrollFreq: "Bi-Weekly",
    hstRegNumber: "", salesTaxFreq: "", salesTaxYearEnd: "",
    comments: "",
  },
];

function buildAnswers(c) {
  const a = {
    client_name: c.clientName,
    business_name: c.clientName,
    business_structure: "Incorporation",
    nature_of_business: c.natureOfBusiness,
    business_details: `Business area: ${c.businessArea} | Nature of business (original): ${c.natureOfBusinessRaw}`,
    specific_notes: c.comments || undefined,
    support_staff: c.supportStaff || undefined,
    street: c.addr1 || undefined,
    apt_suite: c.addr2 || undefined,
    city: c.city || undefined,
    province: c.province || undefined,
    postal_code: c.postal || undefined,
    country: "Canada",
    main_contact_name: `${c.firstName} ${c.lastName}`.trim(),
    main_contact_email: c.email,
    main_contact_phone: c.phone || undefined,
    business_number: c.businessNumber || undefined,
    incorporation_date: c.incorpDate || undefined,
    corporation_tax_period: "Yearly",
    corporation_tax_year_end_date: c.fiscalYearEnd || undefined,
  };
  if (c.bookkeepingFreq) {
    a.bookkeeping = "Yes";
    a.bookkeeping_period = c.bookkeepingFreq;
    if (c.bookkeepingFirstDate) a.bookkeeping_first_date = c.bookkeepingFirstDate;
    if (c.bookkeepingMethod) a.bookkeeping_method = c.bookkeepingMethod;
  } else {
    a.bookkeeping = "No";
  }
  if (c.payrollFreq) a.payroll_period = c.payrollFreq;
  if (c.hstRegNumber || c.salesTaxFreq) {
    a.hst = "Yes";
    if (c.salesTaxFreq) a.hst_period = c.salesTaxFreq === "Annual" ? "Yearly" : c.salesTaxFreq;
    if (c.hstQuarterOption) a.hst_quarter_option = c.hstQuarterOption;
    if (c.salesTaxYearEnd) a.hst_year_end = c.salesTaxYearEnd;
  } else {
    a.hst = "No";
  }
  // drop undefined keys so they don't show as literal "undefined" in the JSONB
  for (const k of Object.keys(a)) if (a[k] === undefined) delete a[k];
  return a;
}

async function main() {
  const write = process.argv.includes("--write");
  console.log(write ? "WRITE MODE" : "DRY RUN");

  for (const c of CLIENTS) {
    console.log(`\n=== ${c.clientName} (${c.email}) ===`);

    const { rows: existing } = await db.query("SELECT id FROM users WHERE LOWER(email)=LOWER($1)", [c.email]);
    if (existing.length) {
      console.log(`  SKIP - a user with this email already exists (id ${existing[0].id})`);
      continue;
    }

    const answers = buildAnswers(c);
    console.log("  answers:", JSON.stringify(answers, null, 2));

    if (!write) continue;

    const placeholderHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
    const { rows: [user] } = await db.query(
      `INSERT INTO users (email, password_hash, name, role, phone, portal_status)
       VALUES ($1,$2,$3,'client',$4,'pending') RETURNING id`,
      [c.email, placeholderHash, c.clientName, c.phone || null]
    );
    await db.query(
      `INSERT INTO user_profiles (user_id, profile_type, profile_name, business_name, is_default)
       VALUES ($1,'business',$2,$3,TRUE)`,
      [user.id, c.clientName, c.clientName]
    );
    await db.query(
      `INSERT INTO client_take_on_submissions (client_id, answers, status)
       VALUES ($1,$2,'draft')`,
      [user.id, JSON.stringify(answers)]
    );
    console.log(`  CREATED user ${user.id}`);
  }

  if (!write) console.log("\nDry run complete - nothing written. Re-run with --write to actually import.");
  else console.log("\nDone.");
  await db.pool?.end?.();
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
