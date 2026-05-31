/**
 * Seed the database with test data.
 * Run once: bun run seed
 * Safe to re-run — skips if data already exists.
 */
import { initSchema } from "./schema";
import db from "./db";
import { hashPassword, nowIso } from "./helpers";

initSchema();

async function seed() {
  const existing = db.query("SELECT COUNT(*) as c FROM users").get() as { c: number };
  if (existing.c > 0) {
    console.log("✓ Database already seeded. Nothing to do.");
    return;
  }

  console.log("Seeding database...");

  // ─── Admin user ─────────────────────────────────────────────────────────────
  const adminHash = await hashPassword("admin123");
  db.run(
    `INSERT INTO users (id, email, password_hash, name, role, phone, portal_status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["admin-001", "admin@taxease.ca", adminHash, "Angela Martin", "admin", "+1-416-555-0001", "active"],
  );

  // ─── Client users ────────────────────────────────────────────────────────────
  const clientHash = await hashPassword("client123");

  db.run(
    `INSERT INTO users (id, email, password_hash, name, role, phone, ssn, dob, occupation, client_since, portal_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "client-john",
      "john@johnsbakery.ca",
      clientHash,
      "John's Bakery Ltd.",
      "client",
      "+1-416-555-1001",
      "123-456-789",
      "1985-03-12",
      "Baker / Business Owner",
      "2025-01-10",
      "active",
    ],
  );

  db.run(
    `INSERT INTO users (id, email, password_hash, name, role, phone, ssn, dob, occupation, client_since, portal_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "client-sarah",
      "sarah@sarahsrestaurant.ca",
      clientHash,
      "Sarah's Restaurant Inc.",
      "client",
      "+1-905-555-2002",
      "987-654-321",
      "1990-07-22",
      "Restaurant Owner",
      "2025-03-05",
      "active",
    ],
  );

  // ─── Portal tasks for John's Bakery ─────────────────────────────────────────
  db.run(
    `INSERT INTO tasks (id, client_id, assigned_by, title, description, status, admin_status, task_type, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "task-john-onboarding",
      "client-john",
      "admin-001",
      "T2 Business Onboarding Form",
      "Complete the business onboarding form so we can prepare your T2 filing.",
      "pending",
      "Data not received",
      "onboarding_form",
      JSON.stringify({ route: "/tax-forms/business" }),
    ],
  );

  db.run(
    `INSERT INTO tasks (id, client_id, assigned_by, title, description, status, admin_status, task_type, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "task-john-querysheet",
      "client-john",
      "admin-001",
      "Query Sheet Remarks",
      "Review the Excel sheet and add your remarks for each transaction — either by filling the Excel file or entering remarks row-by-row in the app.",
      "pending",
      "Query sent to client",
      "sheet_remarks",
      JSON.stringify({
        submissionModes: ["excel_upload", "ui_entry"],
        editableField: "clientRemarks",
        readOnlyFields: ["date", "details", "payment", "receipt", "hst", "ourRemarks"],
      }),
    ],
  );

  // Seed query sheet rows for John's task
  const sheetRows = [
    { rowIndex: 0, date: "2026-04-01", details: "Office supplies for March", payment: "Debit", receipt: "R-1001", hst: "13.00", ourRemarks: "Needs client confirmation" },
    { rowIndex: 1, date: "2026-04-03", details: "Client lunch meeting", payment: "Credit", receipt: "R-1002", hst: "4.50", ourRemarks: "Check if business related" },
    { rowIndex: 2, date: "2026-04-05", details: "Online software subscription", payment: "Debit", receipt: "R-1003", hst: "9.75", ourRemarks: "Recurring vendor charge" },
    { rowIndex: 3, date: "2026-04-08", details: "Fuel expense – delivery", payment: "Credit", receipt: "R-1004", hst: "8.25", ourRemarks: "Verify mileage log" },
    { rowIndex: 4, date: "2026-04-12", details: "Bakery equipment repair", payment: "Debit", receipt: "R-1005", hst: "32.50", ourRemarks: "Capital expense? Confirm" },
  ];
  for (const r of sheetRows) {
    db.run(
      `INSERT INTO query_sheet_rows (task_id, row_index, date, details, payment, receipt, hst, our_remarks, client_remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ["task-john-querysheet", r.rowIndex, r.date, r.details, r.payment, r.receipt, r.hst, r.ourRemarks, ""],
    );
  }

  db.run(
    `INSERT INTO tasks (id, client_id, assigned_by, title, description, status, admin_status, task_type, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "task-john-documents",
      "client-john",
      "admin-001",
      "Basic Documents Upload",
      "Upload all required business documents. At minimum please provide bank statements and credit card statements.",
      "pending",
      "Partial Data received",
      "basic_docs_upload",
      JSON.stringify({
        documentBuckets: [
          "Business Bank Statements",
          "Business credit card statements",
          "Loan Statements",
          "Line of credit statement",
          "Purchase/Expense Details",
          "Doordash sales report",
          "uber sales reports",
          "Skip sales reports",
          "Store sales reports",
          "Sales invoices",
          "Sales excel sheet",
          "Others",
        ],
      }),
    ],
  );

  db.run(
    `INSERT INTO tasks (id, client_id, assigned_by, title, description, status, admin_status, task_type, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "task-john-payroll",
      "client-john",
      "admin-001",
      "Set Up Payroll",
      "Add your employees and configure payroll frequency so we can process your payroll filings.",
      "pending",
      "Work in Progress",
      "payroll",
      JSON.stringify({ route: "/payroll" }),
    ],
  );

  // ─── Portal tasks for Sarah's Restaurant ────────────────────────────────────
  db.run(
    `INSERT INTO tasks (id, client_id, assigned_by, title, description, status, admin_status, task_type, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "task-sarah-onboarding",
      "client-sarah",
      "admin-001",
      "T2 Business Onboarding Form",
      "Please complete the onboarding form for your restaurant corporation.",
      "complete",
      "Review",
      "onboarding_form",
      JSON.stringify({ route: "/tax-forms/business" }),
    ],
  );

  db.run(
    `INSERT INTO tasks (id, client_id, assigned_by, title, description, status, admin_status, task_type, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "task-sarah-documents",
      "client-sarah",
      "admin-001",
      "Basic Documents Upload",
      "Upload all required restaurant business documents.",
      "pending",
      "Data not received",
      "basic_docs_upload",
      JSON.stringify({
        documentBuckets: [
          "Business Bank Statements",
          "Business credit card statements",
          "Loan Statements",
          "Line of credit statement",
          "Purchase/Expense Details",
          "Doordash sales report",
          "uber sales reports",
          "Skip sales reports",
          "Store sales reports",
          "Sales invoices",
          "Sales excel sheet",
          "Others",
        ],
      }),
    ],
  );

  // ─── Employees for John's Bakery ─────────────────────────────────────────────
  db.run(
    `INSERT INTO employees
       (id, client_id, name, email, first_name, last_name, middle_name, date_of_birth, gender, phone,
        sin, address_line_1, city, country, province_state, postal_code, start_date,
        position, department, hourly_rate, federal_tax_credit, provincial_tax_credit, salary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "EMP_1716900000001",
      "client-john",
      "Maria Rose Garcia",
      "maria.garcia@johnsbakery.ca",
      "Maria",
      "Garcia",
      "Rose",
      "1995-04-20",
      "Female",
      "+1-416-555-3001",
      "456-123-789",
      "45 Baker Street",
      "Toronto",
      "Canada",
      "Ontario",
      "M5B 1T3",
      "2024-06-01",
      "Bakery Supervisor",
      "Operations",
      28.5,
      15705.0,
      11141.0,
      28.5,
    ],
  );

  db.run(
    `INSERT INTO employees
       (id, client_id, name, email, first_name, last_name, date_of_birth, gender, phone,
        sin, address_line_1, city, country, province_state, postal_code, start_date,
        position, department, hourly_rate, federal_tax_credit, provincial_tax_credit, salary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "EMP_1716900000002",
      "client-john",
      "David Lee Kim",
      "david.kim@johnsbakery.ca",
      "David",
      "Kim",
      "1998-11-15",
      "Male",
      "+1-416-555-3002",
      "789-321-654",
      "12 Queen St W",
      "Toronto",
      "Canada",
      "Ontario",
      "M5H 2M5",
      "2025-01-10",
      "Baker",
      "Operations",
      22.0,
      15705.0,
      11141.0,
      22.0,
    ],
  );

  // ─── Payroll entry for John ────────────────────────────────────────────────
  db.run(
    `INSERT INTO payroll_entries
       (id, client_id, period_label, period_start, period_end, status, employee_ids, notes, metadata, is_auto_generated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "PAY_1716900000001",
      "client-john",
      "April 2026",
      "2026-04-01T00:00:00.000Z",
      "2026-04-30T00:00:00.000Z",
      "submitted",
      JSON.stringify(["EMP_1716900000001", "EMP_1716900000002"]),
      "Regular monthly payroll — April",
      JSON.stringify({
        employeeRows: [
          { employeeId: "EMP_1716900000001", hours: "160", holidayHours: "0", notes: "" },
          { employeeId: "EMP_1716900000002", hours: "168", holidayHours: "8", notes: "Worked Good Friday" },
        ],
      }),
      0,
    ],
  );

  db.run(
    `INSERT INTO payroll_entries
       (id, client_id, period_label, period_start, period_end, status, employee_ids, notes, metadata, is_auto_generated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "PAY_1716900000002",
      "client-john",
      "May 2026",
      "2026-05-01T00:00:00.000Z",
      "2026-05-31T00:00:00.000Z",
      "pending",
      JSON.stringify(["EMP_1716900000001", "EMP_1716900000002"]),
      "",
      JSON.stringify({ employeeRows: [] }),
      0,
    ],
  );

  console.log("✓ Database seeded successfully.");
  console.log("");
  console.log("  Test credentials:");
  console.log("  Admin:    admin@taxease.ca    /  admin123");
  console.log("  Client 1: john@johnsbakery.ca / client123  (John's Bakery)");
  console.log("  Client 2: sarah@sarahsrestaurant.ca / client123  (Sarah's Restaurant)");
}

seed().catch(console.error);
