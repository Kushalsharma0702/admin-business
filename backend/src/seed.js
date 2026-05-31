// seed.js — one-time DB seed
const { initSchema } = require("./schema");
const db = require("./db");
const { hashPassword, nowIso } = require("./helpers");

initSchema();

const count = db.prepare("SELECT COUNT(*) as c FROM users").get();
if (count.c > 0) {
  console.log("✓ Database already seeded.");
  process.exit(0);
}

console.log("Seeding database...");

// ─── Admin ────────────────────────────────────────────────────────────────────
db.prepare(`INSERT INTO users (id,email,password_hash,name,role,phone,portal_status) VALUES (?,?,?,?,?,?,?)`)
  .run("admin-001","admin@taxease.ca", hashPassword("admin123"),"Angela Martin","admin","+1-416-555-0001","active");

// ─── Clients ──────────────────────────────────────────────────────────────────
const clientHash = hashPassword("client123");

db.prepare(`INSERT INTO users (id,email,password_hash,name,role,phone,ssn,dob,occupation,client_since,portal_status) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
  .run("client-john","john@johnsbakery.ca",clientHash,"John's Bakery Ltd.","client","+1-416-555-1001","123-456-789","1985-03-12","Baker / Business Owner","2025-01-10","active");

db.prepare(`INSERT INTO users (id,email,password_hash,name,role,phone,ssn,dob,occupation,client_since,portal_status) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
  .run("client-sarah","sarah@sarahsrestaurant.ca",clientHash,"Sarah's Restaurant Inc.","client","+1-905-555-2002","987-654-321","1990-07-22","Restaurant Owner","2025-03-05","active");

// ─── John's tasks ─────────────────────────────────────────────────────────────
const insertTask = db.prepare(`INSERT INTO tasks (id,client_id,assigned_by,title,description,status,admin_status,task_type,metadata) VALUES (?,?,?,?,?,?,?,?,?)`);

insertTask.run("task-john-onboarding","client-john","admin-001","T2 Business Onboarding Form","Complete the business onboarding form so we can prepare your T2 filing.","pending","Data not received","onboarding_form",JSON.stringify({route:"/tax-forms/business"}));
insertTask.run("task-john-querysheet","client-john","admin-001","Query Sheet Remarks","Review the Excel sheet and add your remarks for each transaction.","pending","Query sent to client","sheet_remarks",JSON.stringify({submissionModes:["excel_upload","ui_entry"],editableField:"clientRemarks",readOnlyFields:["date","details","payment","receipt","hst","ourRemarks"]}));
insertTask.run("task-john-documents","client-john","admin-001","Basic Documents Upload","Upload all required business documents. Bank statements and credit card statements are mandatory.","pending","Partial Data received","basic_docs_upload",JSON.stringify({documentBuckets:["Business Bank Statements","Business credit card statements","Loan Statements","Line of credit statement","Purchase/Expense Details","Doordash sales report","uber sales reports","Skip sales reports","Store sales reports","Sales invoices","Sales excel sheet","Others"]}));
insertTask.run("task-john-payroll","client-john","admin-001","Set Up Payroll","Add your employees and configure payroll frequency.","pending","Work in Progress","payroll",JSON.stringify({route:"/payroll"}));

// ─── Query sheet rows ─────────────────────────────────────────────────────────
const insertRow = db.prepare(`INSERT INTO query_sheet_rows (task_id,row_index,date,details,payment,receipt,hst,our_remarks,client_remarks) VALUES (?,?,?,?,?,?,?,?,?)`);
[
  [0,"2026-04-01","Office supplies for March","Debit","R-1001","13.00","Needs client confirmation"],
  [1,"2026-04-03","Client lunch meeting","Credit","R-1002","4.50","Check if business related"],
  [2,"2026-04-05","Online software subscription","Debit","R-1003","9.75","Recurring vendor charge"],
  [3,"2026-04-08","Fuel expense – delivery","Credit","R-1004","8.25","Verify mileage log"],
  [4,"2026-04-12","Bakery equipment repair","Debit","R-1005","32.50","Capital expense? Confirm"],
].forEach(([ri,date,details,payment,receipt,hst,ourRemarks]) =>
  insertRow.run("task-john-querysheet",ri,date,details,payment,receipt,hst,ourRemarks,""));

// ─── Sarah's tasks ────────────────────────────────────────────────────────────
insertTask.run("task-sarah-onboarding","client-sarah","admin-001","T2 Business Onboarding Form","Please complete the onboarding form for your restaurant corporation.","complete","Review","onboarding_form",JSON.stringify({route:"/tax-forms/business"}));
insertTask.run("task-sarah-documents","client-sarah","admin-001","Basic Documents Upload","Upload all required restaurant business documents.","pending","Data not received","basic_docs_upload",JSON.stringify({documentBuckets:["Business Bank Statements","Business credit card statements","Loan Statements","Line of credit statement","Purchase/Expense Details","Doordash sales report","uber sales reports","Skip sales reports","Store sales reports","Sales invoices","Sales excel sheet","Others"]}));

// ─── Employees for John ───────────────────────────────────────────────────────
const insertEmp = db.prepare(`INSERT INTO employees (id,client_id,name,email,first_name,last_name,middle_name,date_of_birth,gender,phone,sin,address_line_1,city,country,province_state,postal_code,start_date,position,department,hourly_rate,federal_tax_credit,provincial_tax_credit,salary) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
insertEmp.run("EMP_1716900000001","client-john","Maria Rose Garcia","maria.garcia@johnsbakery.ca","Maria","Garcia","Rose","1995-04-20","Female","+1-416-555-3001","456-123-789","45 Baker Street","Toronto","Canada","Ontario","M5B 1T3","2024-06-01","Bakery Supervisor","Operations",28.5,15705.0,11141.0,28.5);
insertEmp.run("EMP_1716900000002","client-john","David Lee Kim","david.kim@johnsbakery.ca","David","Kim",null,"1998-11-15","Male","+1-416-555-3002","789-321-654","12 Queen St W","Toronto","Canada","Ontario","M5H 2M5","2025-01-10","Baker","Operations",22.0,15705.0,11141.0,22.0);

// ─── Payroll entries ──────────────────────────────────────────────────────────
const insertPay = db.prepare(`INSERT INTO payroll_entries (id,client_id,period_label,period_start,period_end,status,employee_ids,notes,metadata,is_auto_generated,submitted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
insertPay.run("PAY_1716900000001","client-john","April 2026","2026-04-01T00:00:00.000Z","2026-04-30T00:00:00.000Z","submitted",JSON.stringify(["EMP_1716900000001","EMP_1716900000002"]),"Regular monthly payroll — April",JSON.stringify({employeeRows:[{employeeId:"EMP_1716900000001",hours:"160",holidayHours:"0",notes:""},{employeeId:"EMP_1716900000002",hours:"168",holidayHours:"8",notes:"Worked Good Friday"}]}),0,"2026-05-02T10:00:00.000Z");
insertPay.run("PAY_1716900000002","client-john","May 2026","2026-05-01T00:00:00.000Z","2026-05-31T00:00:00.000Z","pending",JSON.stringify(["EMP_1716900000001","EMP_1716900000002"]),"",JSON.stringify({employeeRows:[]}),0,null);

console.log("✓ Database seeded successfully.\n");
console.log("  Credentials:");
console.log("  Admin:    admin@taxease.ca          / admin123");
console.log("  Client 1: john@johnsbakery.ca        / client123   (John's Bakery)");
console.log("  Client 2: sarah@sarahsrestaurant.ca  / client123   (Sarah's Restaurant)\n");
