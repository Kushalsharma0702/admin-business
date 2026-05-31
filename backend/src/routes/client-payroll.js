// routes/client-payroll.js — Employees + Entries + Automation
const express = require("express");
const multer = require("multer");
const db = require("../db");
const { fail, ok, paged, formatEmployee, formatEntry, safeJson, nowIso, genId } = require("../helpers");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
router.use(requireAuth("client"));

// ── Employees ──────────────────────────────────────────────────────────────────

router.get("/employees", (req, res) => {
  const clientId = req.user.sub;
  const page = Math.max(1, Number(req.query.page || 1));
  const per_page = Math.max(1, Number(req.query.per_page || 50));
  const search = req.query.search || "";
  const like = `%${search}%`;
  const offset = (page - 1) * per_page;
  const rows = db.prepare("SELECT * FROM employees WHERE client_id=? AND (name LIKE ? OR position LIKE ? OR department LIKE ?) ORDER BY name ASC LIMIT ? OFFSET ?").all(clientId, like, like, like, per_page, offset);
  const { total } = db.prepare("SELECT COUNT(*) as total FROM employees WHERE client_id=? AND (name LIKE ? OR position LIKE ? OR department LIKE ?)").get(clientId, like, like, like);
  return res.json(paged(rows.map(formatEmployee), "Employees fetched", page, per_page, total));
});

router.get("/employees/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM employees WHERE id=? AND client_id=?").get(req.params.id, req.user.sub);
  if (!row) return res.status(404).json(fail("Employee not found"));
  return res.json(ok(formatEmployee(row), "Employee fetched"));
});

router.post("/employees", (req, res) => {
  const clientId = req.user.sub;
  const b = req.body;
  if (!b.firstName || !b.lastName) return res.status(400).json(fail("Validation failed", [{ field: "firstName", message: "firstName is required" }, { field: "lastName", message: "lastName is required" }].filter(e => !b[e.field])));
  const id = `EMP_${Date.now()}`;
  const now = nowIso();
  const name = [b.firstName, b.middleName, b.lastName].filter(Boolean).join(" ");
  const salary = b.salary ?? b.hourlyRate ?? null;
  db.prepare(`INSERT INTO employees (id,client_id,name,email,first_name,last_name,middle_name,date_of_birth,gender,phone,sin,address_line_1,address_line_2,city,country,province_state,postal_code,start_date,position,department,hourly_rate,federal_tax_credit,provincial_tax_credit,salary,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id,clientId,name,b.email||null,b.firstName,b.lastName,b.middleName||null,b.dateOfBirth||null,b.gender||null,b.phone||null,b.sin||null,b.addressLine1||null,b.addressLine2||null,b.city||null,b.country||null,b.provinceState||null,b.postalCode||null,b.startDate||null,b.position||null,b.department||null,b.hourlyRate||null,b.federalTaxCredit||null,b.provincialTaxCredit||null,salary,now,now);
  return res.status(201).json(ok(formatEmployee(db.prepare("SELECT * FROM employees WHERE id=?").get(id)), "Employee created"));
});

router.patch("/employees/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM employees WHERE id=? AND client_id=?").get(req.params.id, req.user.sub);
  if (!row) return res.status(404).json(fail("Employee not found"));
  const b = req.body;
  const now = nowIso();
  const fieldMap = { firstName:"first_name",lastName:"last_name",middleName:"middle_name",email:"email",dateOfBirth:"date_of_birth",gender:"gender",phone:"phone",sin:"sin",addressLine1:"address_line_1",addressLine2:"address_line_2",city:"city",country:"country",provinceState:"province_state",postalCode:"postal_code",startDate:"start_date",position:"position",department:"department",hourlyRate:"hourly_rate",federalTaxCredit:"federal_tax_credit",provincialTaxCredit:"provincial_tax_credit",salary:"salary" };
  const sets = ["updated_at=?"]; const vals = [now];
  for (const [camel, snake] of Object.entries(fieldMap)) {
    if (camel in b) { sets.push(`${snake}=?`); vals.push(b[camel]); }
  }
  if ("firstName" in b || "lastName" in b || "middleName" in b) {
    sets.push("name=?"); vals.push([b.firstName||row.first_name, b.middleName||row.middle_name, b.lastName||row.last_name].filter(Boolean).join(" "));
  }
  if ("hourlyRate" in b && !("salary" in b)) { sets.push("salary=?"); vals.push(b.hourlyRate); }
  vals.push(req.params.id);
  db.prepare(`UPDATE employees SET ${sets.join(",")} WHERE id=?`).run(...vals);
  return res.json(ok(formatEmployee(db.prepare("SELECT * FROM employees WHERE id=?").get(req.params.id)), "Employee updated"));
});

router.delete("/employees/:id", (req, res) => {
  const row = db.prepare("SELECT id FROM employees WHERE id=? AND client_id=?").get(req.params.id, req.user.sub);
  if (!row) return res.status(404).json(fail("Employee not found"));
  db.prepare("DELETE FROM employees WHERE id=?").run(req.params.id);
  return res.json(ok({ id: row.id, deletedAt: nowIso() }, "Employee deleted"));
});

// ── Payroll Entries ────────────────────────────────────────────────────────────

router.get("/entries", (req, res) => {
  const clientId = req.user.sub;
  const status = req.query.status || "all";
  const page = Math.max(1, Number(req.query.page || 1));
  const per_page = Math.max(1, Number(req.query.per_page || 20));
  const sort = req.query.sort || "period_start_desc";
  const offset = (page - 1) * per_page;
  const order = sort === "period_start_asc" ? "ASC" : "DESC";
  const where = status === "all" ? "" : "AND status=?";
  const countArgs = status === "all" ? [clientId] : [clientId, status];
  const listArgs = status === "all" ? [clientId, per_page, offset] : [clientId, status, per_page, offset];
  const rows = db.prepare(`SELECT * FROM payroll_entries WHERE client_id=? ${where} ORDER BY period_start ${order} LIMIT ? OFFSET ?`).all(...listArgs);
  const { total } = db.prepare(`SELECT COUNT(*) as total FROM payroll_entries WHERE client_id=? ${where}`).get(...countArgs);
  return res.json(paged(rows.map(formatEntry), "Payroll entries fetched", page, per_page, total));
});

router.get("/entries/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM payroll_entries WHERE id=? AND client_id=?").get(req.params.id, req.user.sub);
  if (!row) return res.status(404).json(fail("Payroll entry not found"));
  const entry = formatEntry(row);
  const empIds = entry.employeeIds;
  const employees = empIds.length
    ? db.prepare(`SELECT id,name,position,hourly_rate FROM employees WHERE id IN (${empIds.map(()=>"?").join(",")})`).all(...empIds).map(e => ({ id:e.id,name:e.name,position:e.position,hourlyRate:e.hourly_rate }))
    : [];
  return res.json(ok({ ...entry, employees }, "Payroll entry fetched"));
});

router.post("/entries", (req, res) => {
  const clientId = req.user.sub;
  const b = req.body;
  if (!b.periodLabel || !b.periodStart || !b.periodEnd) return res.status(400).json(fail("periodLabel, periodStart, periodEnd are required"));
  let employeeIds = b.employeeIds;
  if (!employeeIds) employeeIds = db.prepare("SELECT id FROM employees WHERE client_id=?").all(clientId).map(e => e.id);
  const id = `PAY_${Date.now()}`;
  const now = nowIso();
  db.prepare("INSERT INTO payroll_entries (id,client_id,period_label,period_start,period_end,status,employee_ids,notes,metadata,is_auto_generated,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(id,clientId,b.periodLabel,new Date(b.periodStart).toISOString(),new Date(b.periodEnd).toISOString(),"pending",JSON.stringify(employeeIds),b.notes||"",JSON.stringify({employeeRows:[]}),0,now,now);
  return res.status(201).json(ok(formatEntry(db.prepare("SELECT * FROM payroll_entries WHERE id=?").get(id)), "Payroll entry created"));
});

router.patch("/entries/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM payroll_entries WHERE id=? AND client_id=?").get(req.params.id, req.user.sub);
  if (!row) return res.status(404).json(fail("Entry not found"));
  if (row.status === "submitted") return res.status(409).json(fail("Cannot update a submitted payroll entry"));
  const b = req.body;
  const now = nowIso();
  const sets = ["updated_at=?"]; const vals = [now];
  if ("employeeIds" in b) { sets.push("employee_ids=?"); vals.push(JSON.stringify(b.employeeIds)); }
  if ("notes" in b) { sets.push("notes=?"); vals.push(b.notes); }
  if ("totalAmount" in b) { sets.push("total_amount=?"); vals.push(b.totalAmount); }
  if ("metadata" in b) { sets.push("metadata=?"); vals.push(JSON.stringify(b.metadata)); }
  vals.push(req.params.id);
  db.prepare(`UPDATE payroll_entries SET ${sets.join(",")} WHERE id=?`).run(...vals);
  return res.json(ok(formatEntry(db.prepare("SELECT * FROM payroll_entries WHERE id=?").get(req.params.id)), "Payroll entry updated"));
});

router.post("/entries/:id/submit", (req, res) => {
  const row = db.prepare("SELECT * FROM payroll_entries WHERE id=? AND client_id=?").get(req.params.id, req.user.sub);
  if (!row) return res.status(404).json(fail("Entry not found"));
  if (row.status === "submitted") return res.status(409).json(fail("Entry already submitted"));
  const empIds = safeJson(row.employee_ids, []);
  if (!empIds.length) return res.status(400).json(fail("Validation failed", [{ field: "employeeIds", message: "At least one employee must be selected" }]));
  const now = nowIso();
  db.prepare("UPDATE payroll_entries SET status='submitted',submitted_at=?,updated_at=? WHERE id=?").run(now, now, req.params.id);
  return res.json(ok({ id: row.id, periodLabel: row.period_label, status: "submitted", submittedAt: now, updatedAt: now }, "Payroll submitted successfully"));
});

router.delete("/entries/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM payroll_entries WHERE id=? AND client_id=?").get(req.params.id, req.user.sub);
  if (!row) return res.status(404).json(fail("Entry not found"));
  if (row.status === "submitted") return res.status(409).json(fail("Cannot delete a submitted payroll entry"));
  db.prepare("DELETE FROM payroll_entries WHERE id=?").run(req.params.id);
  return res.json(ok({ id: row.id, deletedAt: nowIso() }, "Payroll entry deleted"));
});

router.post("/entries/:id/documents", upload.single("file"), (req, res) => {
  const row = db.prepare("SELECT * FROM payroll_entries WHERE id=? AND client_id=?").get(req.params.id, req.user.sub);
  if (!row) return res.status(404).json(fail("Entry not found"));
  if (!req.file) return res.status(400).json(fail("file is required"));
  const docId = genId("pdoc");
  const now = nowIso();
  const current = safeJson(row.document_paths, []);
  const updated = [...current, req.file.originalname];
  db.prepare("UPDATE payroll_entries SET document_paths=?,updated_at=? WHERE id=?").run(JSON.stringify(updated), now, req.params.id);
  return res.status(201).json(ok({ entryId: row.id, documentId: docId, fileName: req.file.originalname, fileSize: req.file.size, uploadedAt: now, documentPaths: updated }, "Document attached to payroll entry"));
});

// ── Automation ─────────────────────────────────────────────────────────────────

function fmtAuto(row) {
  if (!row) return null;
  return { startDate: row.start_date, frequency: row.frequency, isActive: row.is_active === 1, lastGeneratedDate: row.last_generated_date || null };
}

router.get("/automation", (req, res) => {
  const row = db.prepare("SELECT * FROM payroll_automation_configs WHERE client_id=?").get(req.user.sub);
  return res.json(ok(fmtAuto(row), row ? "Automation config fetched" : "No automation configured"));
});

router.put("/automation", (req, res) => {
  const clientId = req.user.sub;
  const { startDate, frequency, isActive } = req.body;
  if (!["weekly","biweekly","monthly"].includes(frequency)) return res.status(400).json(fail("Invalid frequency. Allowed: weekly, biweekly, monthly"));
  const now = nowIso();
  const exists = db.prepare("SELECT id FROM payroll_automation_configs WHERE client_id=?").get(clientId);
  if (exists) {
    db.prepare("UPDATE payroll_automation_configs SET start_date=?,frequency=?,is_active=?,updated_at=? WHERE client_id=?").run(startDate, frequency, isActive ? 1 : 0, now, clientId);
  } else {
    db.prepare("INSERT INTO payroll_automation_configs (client_id,start_date,frequency,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?)").run(clientId, startDate, frequency, isActive ? 1 : 0, now, now);
  }
  return res.json(ok(fmtAuto(db.prepare("SELECT * FROM payroll_automation_configs WHERE client_id=?").get(clientId)), "Automation config saved"));
});

router.post("/automation/disable", (req, res) => {
  const clientId = req.user.sub;
  const row = db.prepare("SELECT * FROM payroll_automation_configs WHERE client_id=?").get(clientId);
  if (!row) return res.status(404).json(fail("No automation configured"));
  db.prepare("UPDATE payroll_automation_configs SET is_active=0,updated_at=? WHERE client_id=?").run(nowIso(), clientId);
  return res.json(ok(fmtAuto(db.prepare("SELECT * FROM payroll_automation_configs WHERE client_id=?").get(clientId)), "Automation disabled"));
});

router.post("/automation/run", (req, res) => {
  const clientId = req.user.sub;
  const cfg = db.prepare("SELECT * FROM payroll_automation_configs WHERE client_id=? AND is_active=1").get(clientId);
  if (!cfg) return res.status(400).json(fail("Automation is not configured or not active"));
  const freq = cfg.frequency;
  let cursor = new Date(cfg.last_generated_date || cfg.start_date);
  const today = new Date(); today.setHours(0,0,0,0);
  const generated = [];
  for (let i = 0; i < 52; i++) {
    const nextStart = new Date(cursor);
    if (freq === "weekly") nextStart.setDate(nextStart.getDate() + 7);
    else if (freq === "biweekly") nextStart.setDate(nextStart.getDate() + 14);
    else nextStart.setMonth(nextStart.getMonth() + 1);
    const nextEnd = new Date(nextStart);
    if (freq === "weekly") nextEnd.setDate(nextEnd.getDate() + 6);
    else if (freq === "biweekly") nextEnd.setDate(nextEnd.getDate() + 13);
    else { nextEnd.setMonth(nextEnd.getMonth() + 1); nextEnd.setDate(0); }
    if (nextEnd > today) break;
    const label = nextStart.toLocaleString("en-CA", { month: "long", year: "numeric" });
    const dup = db.prepare("SELECT id FROM payroll_entries WHERE client_id=? AND period_start=?").get(clientId, nextStart.toISOString());
    if (!dup) {
      const id = `PAY_${Date.now()}_${i}`;
      const empIds = db.prepare("SELECT id FROM employees WHERE client_id=?").all(clientId).map(e => e.id);
      const now = nowIso();
      db.prepare("INSERT INTO payroll_entries (id,client_id,period_label,period_start,period_end,status,employee_ids,metadata,is_auto_generated,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(id,clientId,label,nextStart.toISOString(),nextEnd.toISOString(),"pending",JSON.stringify(empIds),JSON.stringify({employeeRows:[]}),1,now,now);
      generated.push({ id, periodLabel: label, periodStart: nextStart.toISOString(), periodEnd: nextEnd.toISOString(), isAutoGenerated: true });
    }
    cursor = nextStart;
  }
  db.prepare("UPDATE payroll_automation_configs SET last_generated_date=?,updated_at=? WHERE client_id=?").run(cursor.toISOString(), nowIso(), clientId);
  return res.json(ok({ entriesGenerated: generated.length, generatedEntries: generated, lastGeneratedDate: cursor.toISOString() }, "Automation completed"));
});

module.exports = router;
