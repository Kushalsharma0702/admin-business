// seed.js — one-time DB seed (PostgreSQL edition)
// Run: npm run seed  (after npm run migrate)
require("./config/env");
const db = require("./db");
const bcrypt = require("bcryptjs");

async function seed() {
  // Check if already seeded
  const { rows: [check] } = await db.query("SELECT COUNT(*)::int AS c FROM users");
  if (check.c > 0) {
    console.log("✓ Database already seeded.");
    process.exit(0);
  }

  console.log("Seeding database…\n");

  const adminHash  = await bcrypt.hash("admin123",  12);
  const clientHash = await bcrypt.hash("client123", 12);

  // ── Admin ───────────────────────────────────────────────────────────────────
  const { rows: [admin] } = await db.query(
    `INSERT INTO users (email, password_hash, name, role, phone, portal_status, slug)
     VALUES ($1,$2,$3,'admin',$4,'active','admin-001')
     RETURNING id`,
    ["admin@taxease.ca", adminHash, "Angela Martin", "+1-416-555-0001"]
  );

  // ── Clients ─────────────────────────────────────────────────────────────────
  const { rows: [john] } = await db.query(
    `INSERT INTO users (email, password_hash, name, role, phone, ssn, dob, occupation, client_since, portal_status, slug)
     VALUES ($1,$2,$3,'client',$4,$5,$6,$7,$8,'active','client-john')
     RETURNING id`,
    ["john@johnsbakery.ca", clientHash, "John's Bakery Ltd.", "+1-416-555-1001",
     "123-456-789", "1985-03-12", "Baker / Business Owner", "2025-01-10"]
  );

  const { rows: [sarah] } = await db.query(
    `INSERT INTO users (email, password_hash, name, role, phone, ssn, dob, occupation, client_since, portal_status, slug)
     VALUES ($1,$2,$3,'client',$4,$5,$6,$7,$8,'active','client-sarah')
     RETURNING id`,
    ["sarah@sarahsrestaurant.ca", clientHash, "Sarah's Restaurant Inc.", "+1-905-555-2002",
     "987-654-321", "1990-07-22", "Restaurant Owner", "2025-03-05"]
  );

  // ── John's workflow tasks (using the new subtask system) ────────────────────
  const { initializeSubtasks } = require("./workflow-service");

  // Corporate Tax Return for John
  const { rows: [johnT2] } = await db.query(
    `INSERT INTO tasks (client_id, assigned_by, title, task_type, tax_year, due_date, open_date, config, slug)
     VALUES ($1,$2,$3,'CORPORATE_TAX_RETURN',2025,'2026-03-31','2025-10-01',$4,'task-john-onboarding')
     RETURNING id`,
    [john.id, admin.id, "Corporate Tax Return (T2)",
     JSON.stringify({ fiscalYearEnd: "2025-12-31", craInstallmentInT2: true, taxAmount: 5000 })]
  );
  await initializeSubtasks(johnT2.id, "CORPORATE_TAX_RETURN");
  // Advance to "Work in progress" to simulate some progress
  const { advanceToSubtask } = require("./workflow-service");
  await advanceToSubtask(johnT2.id, "Work in progress", admin.id);

  // HST for John
  const { rows: [johnHST] } = await db.query(
    `INSERT INTO tasks (client_id, assigned_by, title, task_type, tax_year, due_date, open_date, config)
     VALUES ($1,$2,$3,'HST',2025,'2026-06-15','2025-10-01',$4)
     RETURNING id`,
    [john.id, admin.id, "HST Return",
     JSON.stringify({ salesTaxFrequency: "annual", salesTaxYearEnd: "2025-12-31", craInstallmentInHST: false })]
  );
  await initializeSubtasks(johnHST.id, "HST");

  // Bookkeeping for John
  const { rows: [johnBK] } = await db.query(
    `INSERT INTO tasks (client_id, assigned_by, title, task_type, tax_year, config)
     VALUES ($1,$2,$3,'BOOKKEEPING',2025,$4)
     RETURNING id`,
    [john.id, admin.id, "Bookkeeping",
     JSON.stringify({ bookkeepingFrequency: "monthly", bookkeepingQuarterOption: "Jan/Apr/Jul/Oct" })]
  );
  await initializeSubtasks(johnBK.id, "BOOKKEEPING");
  await advanceToSubtask(johnBK.id, "Query sent to client", admin.id);

  // Payroll for John
  const { rows: [johnPR] } = await db.query(
    `INSERT INTO tasks (client_id, assigned_by, title, task_type, config)
     VALUES ($1,$2,$3,'PAYROLL',$4)
     RETURNING id`,
    [john.id, admin.id, "Payroll",
     JSON.stringify({ nextPayDate: "2026-05-04", payrollFrequency: "weekly", payPeriodEnds: "Friday", payrollType: "fixed" })]
  );
  await initializeSubtasks(johnPR.id, "PAYROLL");

  // T4 for John
  const { rows: [johnT4] } = await db.query(
    `INSERT INTO tasks (client_id, assigned_by, title, task_type, tax_year, due_date)
     VALUES ($1,$2,$3,'T4',2025,'2026-02-28')
     RETURNING id`,
    [john.id, admin.id, "T4 Slips", ]
  );
  await initializeSubtasks(johnT4.id, "T4");
  await advanceToSubtask(johnT4.id, "Send Draft T4 slips to client for approval", admin.id);

  // ── Sarah's workflow tasks ──────────────────────────────────────────────────
  // Corporate Tax Return for Sarah (further along)
  const { rows: [sarahT2] } = await db.query(
    `INSERT INTO tasks (client_id, assigned_by, title, task_type, tax_year, due_date, open_date, config)
     VALUES ($1,$2,$3,'CORPORATE_TAX_RETURN',2025,'2026-03-31','2025-10-01',$4)
     RETURNING id`,
    [sarah.id, admin.id, "Corporate Tax Return (T2)",
     JSON.stringify({ fiscalYearEnd: "2025-12-31", craInstallmentInT2: false })]
  );
  await initializeSubtasks(sarahT2.id, "CORPORATE_TAX_RETURN");
  await advanceToSubtask(sarahT2.id, "Sent draft T2 to client for approval", admin.id);

  // HST for Sarah
  const { rows: [sarahHST] } = await db.query(
    `INSERT INTO tasks (client_id, assigned_by, title, task_type, tax_year, due_date, config)
     VALUES ($1,$2,$3,'HST',2025,'2026-06-15',$4)
     RETURNING id`,
    [sarah.id, admin.id, "HST Return",
     JSON.stringify({ salesTaxFrequency: "quarterly", salesTaxYearEnd: "2025-12-31" })]
  );
  await initializeSubtasks(sarahHST.id, "HST");
  await advanceToSubtask(sarahHST.id, "Partial Data", admin.id);

  // WCB for Sarah
  const { rows: [sarahWCB] } = await db.query(
    `INSERT INTO tasks (client_id, assigned_by, title, task_type, tax_year)
     VALUES ($1,$2,$3,'WCB',2025)
     RETURNING id`,
    [sarah.id, admin.id, "WCB"]
  );
  await initializeSubtasks(sarahWCB.id, "WCB");

  // T5 for Sarah (completed)
  const { rows: [sarahT5] } = await db.query(
    `INSERT INTO tasks (client_id, assigned_by, title, task_type, tax_year, due_date)
     VALUES ($1,$2,$3,'T5',2025,'2026-02-28')
     RETURNING id`,
    [sarah.id, admin.id, "T5 Slips"]
  );
  await initializeSubtasks(sarahT5.id, "T5");
  await advanceToSubtask(sarahT5.id, "Filed", admin.id);

  // ── Employees for John ────────────────────────────────────────────────────────
  const { rows: [emp1] } = await db.query(
    `INSERT INTO employees
       (client_id,name,email,first_name,last_name,middle_name,date_of_birth,gender,phone,sin,
        address_line_1,city,country,province_state,postal_code,start_date,position,department,
        hourly_rate,federal_tax_credit,provincial_tax_credit,salary)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
     RETURNING id`,
    [john.id,"Maria Rose Garcia","maria.garcia@johnsbakery.ca","Maria","Garcia","Rose",
     "1995-04-20","Female","+1-416-555-3001","456-123-789",
     "45 Baker Street","Toronto","Canada","Ontario","M5B 1T3",
     "2024-06-01","Bakery Supervisor","Operations",28.5,15705.0,11141.0,28.5]
  );

  const { rows: [emp2] } = await db.query(
    `INSERT INTO employees
       (client_id,name,email,first_name,last_name,date_of_birth,gender,phone,sin,
        address_line_1,city,country,province_state,postal_code,start_date,position,department,
        hourly_rate,federal_tax_credit,provincial_tax_credit,salary)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
     RETURNING id`,
    [john.id,"David Lee Kim","david.kim@johnsbakery.ca","David","Kim",
     "1998-11-15","Male","+1-416-555-3002","789-321-654",
     "12 Queen St W","Toronto","Canada","Ontario","M5H 2M5",
     "2025-01-10","Baker","Operations",22.0,15705.0,11141.0,22.0]
  );

  // ── Payroll entries for John ──────────────────────────────────────────────────
  await db.query(
    `INSERT INTO payroll_entries
       (client_id,period_label,period_start,period_end,status,employee_ids,notes,metadata,is_auto_generated,submitted_at)
     VALUES ($1,$2,$3,$4,'submitted',$5,$6,$7,FALSE,$8)`,
    [john.id,"April 2026","2026-04-01","2026-04-30",
     JSON.stringify([emp1.id, emp2.id]),
     "Regular monthly payroll — April",
     JSON.stringify({ employeeRows: [
       { employeeId: emp1.id, hours: "160", holidayHours: "0", notes: "" },
       { employeeId: emp2.id, hours: "168", holidayHours: "8", notes: "Worked Good Friday" },
     ]}),
     "2026-05-02T10:00:00Z"]
  );

  await db.query(
    `INSERT INTO payroll_entries
       (client_id,period_label,period_start,period_end,status,employee_ids,notes,metadata,is_auto_generated)
     VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,FALSE)`,
    [john.id,"May 2026","2026-05-01","2026-05-31",
     JSON.stringify([emp1.id, emp2.id]),
     "",
     JSON.stringify({ employeeRows: [] })]
  );

  console.log("✓ Database seeded successfully.\n");
  console.log("  Admin:    admin@taxease.ca          / admin123");
  console.log("  Client 1: john@johnsbakery.ca        / client123   (John's Bakery)");
  console.log("  Client 2: sarah@sarahsrestaurant.ca  / client123   (Sarah's Restaurant)\n");
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
