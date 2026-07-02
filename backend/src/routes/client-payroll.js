// routes/client-payroll.js — Employees + Entries + Automation (PostgreSQL async edition)
const express = require("express");
const multer = require("multer");
const db = require("../db");
const { fail, ok, paged, formatEmployee, formatEntry, safeJson } = require("../helpers");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
router.use(requireAuth("client"));

// ── Employees ──────────────────────────────────────────────────────────────────

router.get("/employees", async (req, res) => {
  const clientId = req.user.sub;
  const page     = Math.max(1, Number(req.query.page     || 1));
  const per_page = Math.max(1, Number(req.query.per_page || 50));
  const search   = req.query.search || "";
  const like     = `%${search}%`;
  const offset   = (page - 1) * per_page;

  const [{ rows }, { rows: cnt }] = await Promise.all([
    db.query(
      "SELECT * FROM employees WHERE client_id=$1 AND (name ILIKE $2 OR position ILIKE $2 OR department ILIKE $2) ORDER BY name ASC LIMIT $3 OFFSET $4",
      [clientId, like, per_page, offset]
    ),
    db.query(
      "SELECT COUNT(*)::int AS total FROM employees WHERE client_id=$1 AND (name ILIKE $2 OR position ILIKE $2 OR department ILIKE $2)",
      [clientId, like]
    ),
  ]);
  return res.json(paged(rows.map(formatEmployee), "Employees fetched", page, per_page, cnt[0].total));
});

router.get("/employees/:id", async (req, res) => {
  const { rows: [row] } = await db.query(
    "SELECT * FROM employees WHERE id=$1 AND client_id=$2",
    [req.params.id, req.user.sub]
  );
  if (!row) return res.status(404).json(fail("Employee not found"));
  return res.json(ok(formatEmployee(row), "Employee fetched"));
});

router.post("/employees", async (req, res) => {
  const clientId = req.user.sub;
  const b = req.body;
  const errors = [];
  if (!b.firstName) errors.push({ field: "firstName", message: "firstName is required" });
  if (!b.lastName)  errors.push({ field: "lastName",  message: "lastName is required" });
  if (errors.length) return res.status(400).json(fail("Validation failed", errors));

  const name   = [b.firstName, b.middleName, b.lastName].filter(Boolean).join(" ");
  const salary = b.salary ?? b.hourlyRate ?? null;

  const { rows: [emp] } = await db.query(
    `INSERT INTO employees
       (client_id,name,email,first_name,last_name,middle_name,date_of_birth,gender,phone,sin,
        address_line_1,address_line_2,city,country,province_state,postal_code,
        start_date,position,department,hourly_rate,federal_tax_credit,provincial_tax_credit,salary)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
     RETURNING *`,
    [clientId,name,b.email||null,b.firstName,b.lastName,b.middleName||null,b.dateOfBirth||null,
     b.gender||null,b.phone||null,b.sin||null,b.addressLine1||null,b.addressLine2||null,
     b.city||null,b.country||null,b.provinceState||null,b.postalCode||null,
     b.startDate||null,b.position||null,b.department||null,
     b.hourlyRate||null,b.federalTaxCredit||null,b.provincialTaxCredit||null,salary]
  );
  return res.status(201).json(ok(formatEmployee(emp), "Employee created"));
});

router.patch("/employees/:id", async (req, res) => {
  const { rows: [existing] } = await db.query(
    "SELECT * FROM employees WHERE id=$1 AND client_id=$2",
    [req.params.id, req.user.sub]
  );
  if (!existing) return res.status(404).json(fail("Employee not found"));

  const b = req.body;
  const fieldMap = {
    firstName:"first_name", lastName:"last_name", middleName:"middle_name", email:"email",
    dateOfBirth:"date_of_birth", gender:"gender", phone:"phone", sin:"sin",
    addressLine1:"address_line_1", addressLine2:"address_line_2", city:"city",
    country:"country", provinceState:"province_state", postalCode:"postal_code",
    startDate:"start_date", position:"position", department:"department",
    hourlyRate:"hourly_rate", federalTaxCredit:"federal_tax_credit",
    provincialTaxCredit:"provincial_tax_credit", salary:"salary",
  };

  const sets = ["updated_at=NOW()"]; const vals = []; let i = 1;
  for (const [camel, snake] of Object.entries(fieldMap)) {
    if (camel in b) { sets.push(`${snake}=$${i++}`); vals.push(b[camel]); }
  }
  if ("firstName" in b || "lastName" in b || "middleName" in b) {
    sets.push(`name=$${i++}`);
    vals.push([b.firstName||existing.first_name, b.middleName||existing.middle_name, b.lastName||existing.last_name].filter(Boolean).join(" "));
  }
  if ("hourlyRate" in b && !("salary" in b)) { sets.push(`salary=$${i++}`); vals.push(b.hourlyRate); }

  vals.push(req.params.id);
  const { rows: [updated] } = await db.query(
    `UPDATE employees SET ${sets.join(",")} WHERE id=$${i} RETURNING *`,
    vals
  );
  return res.json(ok(formatEmployee(updated), "Employee updated"));
});

router.delete("/employees/:id", async (req, res) => {
  const { rows: [row] } = await db.query(
    "SELECT id FROM employees WHERE id=$1 AND client_id=$2",
    [req.params.id, req.user.sub]
  );
  if (!row) return res.status(404).json(fail("Employee not found"));
  await db.query("DELETE FROM employees WHERE id=$1", [row.id]);
  return res.json(ok({ id: row.id, deletedAt: new Date().toISOString() }, "Employee deleted"));
});

// ── Payroll Entries ────────────────────────────────────────────────────────────

router.get("/entries", async (req, res) => {
  const clientId = req.user.sub;
  const status   = req.query.status || "all";
  const page     = Math.max(1, Number(req.query.page     || 1));
  const per_page = Math.max(1, Number(req.query.per_page || 20));
  const sort     = req.query.sort || "period_start_desc";
  const offset   = (page - 1) * per_page;
  const order    = sort === "period_start_asc" ? "ASC" : "DESC";

  const statusClause = status === "all" ? "" : "AND status=$2";
  const listArgs  = status === "all" ? [clientId, per_page, offset] : [clientId, status, per_page, offset];
  const countArgs = status === "all" ? [clientId] : [clientId, status];
  const limitOff  = status === "all" ? "$2, $3" : "$3, $4";

  const [{ rows }, { rows: cnt }] = await Promise.all([
    db.query(
      `SELECT * FROM payroll_entries WHERE client_id=$1 ${statusClause} ORDER BY period_start ${order} LIMIT ${status==="all" ? "$2" : "$3"} OFFSET ${status==="all" ? "$3" : "$4"}`,
      listArgs
    ),
    db.query(
      `SELECT COUNT(*)::int AS total FROM payroll_entries WHERE client_id=$1 ${statusClause}`,
      countArgs
    ),
  ]);
  return res.json(paged(rows.map(formatEntry), "Payroll entries fetched", page, per_page, cnt[0].total));
});

router.get("/entries/:id", async (req, res) => {
  const { rows: [row] } = await db.query(
    "SELECT * FROM payroll_entries WHERE id=$1 AND client_id=$2",
    [req.params.id, req.user.sub]
  );
  if (!row) return res.status(404).json(fail("Payroll entry not found"));

  const entry  = formatEntry(row);
  const empIds = entry.employeeIds;
  let employees = [];
  if (empIds.length) {
    const ph = empIds.map((_, i) => `$${i + 1}`).join(",");
    const { rows: emps } = await db.query(
      `SELECT id,name,position,hourly_rate FROM employees WHERE id IN (${ph})`,
      empIds
    );
    employees = emps.map((e) => ({ id: e.id, name: e.name, position: e.position, hourlyRate: e.hourly_rate }));
  }
  return res.json(ok({ ...entry, employees }, "Payroll entry fetched"));
});

router.post("/entries", async (req, res) => {
  const clientId = req.user.sub;
  const b = req.body;
  if (!b.periodLabel || !b.periodStart || !b.periodEnd) {
    return res.status(400).json(fail("periodLabel, periodStart, periodEnd are required"));
  }

  let employeeIds = b.employeeIds;
  if (!employeeIds) {
    const { rows } = await db.query("SELECT id FROM employees WHERE client_id=$1", [clientId]);
    employeeIds = rows.map((e) => e.id);
  }

  const { rows: [entry] } = await db.query(
    `INSERT INTO payroll_entries
       (client_id,period_label,period_start,period_end,status,employee_ids,notes,metadata,is_auto_generated)
     VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,FALSE)
     RETURNING *`,
    [clientId, b.periodLabel, new Date(b.periodStart).toISOString(), new Date(b.periodEnd).toISOString(),
     JSON.stringify(employeeIds), b.notes || "", JSON.stringify({ employeeRows: [] })]
  );
  return res.status(201).json(ok(formatEntry(entry), "Payroll entry created"));
});

router.patch("/entries/:id", async (req, res) => {
  const { rows: [existing] } = await db.query(
    "SELECT * FROM payroll_entries WHERE id=$1 AND client_id=$2",
    [req.params.id, req.user.sub]
  );
  if (!existing) return res.status(404).json(fail("Entry not found"));
  if (existing.status === "submitted") return res.status(409).json(fail("Cannot update a submitted payroll entry"));

  const b = req.body;
  const sets = ["updated_at=NOW()"]; const vals = []; let i = 1;
  if ("employeeIds" in b) { sets.push(`employee_ids=$${i++}`); vals.push(JSON.stringify(b.employeeIds)); }
  if ("notes"       in b) { sets.push(`notes=$${i++}`);        vals.push(b.notes); }
  if ("totalAmount" in b) { sets.push(`total_amount=$${i++}`); vals.push(b.totalAmount); }
  if ("metadata"    in b) { sets.push(`metadata=$${i++}`);     vals.push(JSON.stringify(b.metadata)); }

  vals.push(req.params.id);
  const { rows: [updated] } = await db.query(
    `UPDATE payroll_entries SET ${sets.join(",")} WHERE id=$${i} RETURNING *`,
    vals
  );
  return res.json(ok(formatEntry(updated), "Payroll entry updated"));
});

router.post("/entries/:id/submit", async (req, res) => {
  const { rows: [row] } = await db.query(
    "SELECT * FROM payroll_entries WHERE id=$1 AND client_id=$2",
    [req.params.id, req.user.sub]
  );
  if (!row) return res.status(404).json(fail("Entry not found"));
  if (row.status === "submitted") return res.status(409).json(fail("Entry already submitted"));

  const empIds = safeJson(row.employee_ids, []);
  if (!empIds.length) {
    return res.status(400).json(fail("Validation failed", [{ field: "employeeIds", message: "At least one employee must be selected" }]));
  }

  const { rows: [updated] } = await db.query(
    "UPDATE payroll_entries SET status='submitted', submitted_at=NOW(), updated_at=NOW() WHERE id=$1 RETURNING *",
    [row.id]
  );
  return res.json(ok({
    id:           updated.id,
    periodLabel:  updated.period_label,
    status:       "submitted",
    submittedAt:  updated.submitted_at,
    updatedAt:    updated.updated_at,
  }, "Payroll submitted successfully"));
});

router.delete("/entries/:id", async (req, res) => {
  const { rows: [row] } = await db.query(
    "SELECT * FROM payroll_entries WHERE id=$1 AND client_id=$2",
    [req.params.id, req.user.sub]
  );
  if (!row) return res.status(404).json(fail("Entry not found"));
  if (row.status === "submitted") return res.status(409).json(fail("Cannot delete a submitted payroll entry"));
  await db.query("DELETE FROM payroll_entries WHERE id=$1", [row.id]);
  return res.json(ok({ id: row.id, deletedAt: new Date().toISOString() }, "Payroll entry deleted"));
});

router.post("/entries/:id/documents", upload.single("file"), async (req, res) => {
  const { rows: [row] } = await db.query(
    "SELECT * FROM payroll_entries WHERE id=$1 AND client_id=$2",
    [req.params.id, req.user.sub]
  );
  if (!row) return res.status(404).json(fail("Entry not found"));
  if (!req.file) return res.status(400).json(fail("file is required"));

  const current = safeJson(row.document_paths, []);
  const updated = [...current, req.file.originalname];
  await db.query(
    "UPDATE payroll_entries SET document_paths=$1, updated_at=NOW() WHERE id=$2",
    [JSON.stringify(updated), row.id]
  );
  return res.status(201).json(ok({
    entryId:       row.id,
    fileName:      req.file.originalname,
    fileSize:      req.file.size,
    uploadedAt:    new Date().toISOString(),
    documentPaths: updated,
  }, "Document attached to payroll entry"));
});

// ── Automation ─────────────────────────────────────────────────────────────────

function fmtAuto(row) {
  if (!row) return null;
  return { startDate: row.start_date, frequency: row.frequency, isActive: row.is_active, lastGeneratedDate: row.last_generated_date || null };
}

router.get("/automation", async (req, res) => {
  const { rows: [row] } = await db.query(
    "SELECT * FROM payroll_automation_configs WHERE client_id=$1",
    [req.user.sub]
  );
  return res.json(ok(fmtAuto(row), row ? "Automation config fetched" : "No automation configured"));
});

router.put("/automation", async (req, res) => {
  const clientId = req.user.sub;
  const { startDate, frequency, isActive } = req.body;
  if (!["weekly","biweekly","monthly"].includes(frequency)) {
    return res.status(400).json(fail("Invalid frequency. Allowed: weekly, biweekly, monthly"));
  }

  const { rows: [existing] } = await db.query(
    "SELECT id FROM payroll_automation_configs WHERE client_id=$1",
    [clientId]
  );

  if (existing) {
    await db.query(
      "UPDATE payroll_automation_configs SET start_date=$1, frequency=$2, is_active=$3, updated_at=NOW() WHERE client_id=$4",
      [startDate, frequency, isActive ?? true, clientId]
    );
  } else {
    await db.query(
      "INSERT INTO payroll_automation_configs (client_id, start_date, frequency, is_active) VALUES ($1,$2,$3,$4)",
      [clientId, startDate, frequency, isActive ?? true]
    );
  }

  const { rows: [updated] } = await db.query(
    "SELECT * FROM payroll_automation_configs WHERE client_id=$1",
    [clientId]
  );
  return res.json(ok(fmtAuto(updated), "Automation config saved"));
});

router.post("/automation/disable", async (req, res) => {
  const clientId = req.user.sub;
  const { rows: [row] } = await db.query(
    "SELECT * FROM payroll_automation_configs WHERE client_id=$1",
    [clientId]
  );
  if (!row) return res.status(404).json(fail("No automation configured"));
  await db.query(
    "UPDATE payroll_automation_configs SET is_active=FALSE, updated_at=NOW() WHERE client_id=$1",
    [clientId]
  );
  const { rows: [updated] } = await db.query(
    "SELECT * FROM payroll_automation_configs WHERE client_id=$1",
    [clientId]
  );
  return res.json(ok(fmtAuto(updated), "Automation disabled"));
});

router.post("/automation/run", async (req, res) => {
  const clientId = req.user.sub;
  const { rows: [cfg] } = await db.query(
    "SELECT * FROM payroll_automation_configs WHERE client_id=$1 AND is_active=TRUE",
    [clientId]
  );
  if (!cfg) return res.status(400).json(fail("Automation is not configured or not active"));

  const freq = cfg.frequency;
  let cursor = new Date(cfg.last_generated_date || cfg.start_date);
  const today = new Date(); today.setHours(0,0,0,0);
  const generated = [];

  for (let i = 0; i < 52; i++) {
    const nextStart = new Date(cursor);
    if (freq === "weekly")    nextStart.setDate(nextStart.getDate() + 7);
    else if (freq === "biweekly") nextStart.setDate(nextStart.getDate() + 14);
    else nextStart.setMonth(nextStart.getMonth() + 1);

    const nextEnd = new Date(nextStart);
    if (freq === "weekly")    nextEnd.setDate(nextEnd.getDate() + 6);
    else if (freq === "biweekly") nextEnd.setDate(nextEnd.getDate() + 13);
    else { nextEnd.setMonth(nextEnd.getMonth() + 1); nextEnd.setDate(0); }

    if (nextEnd > today) break;

    const label = nextStart.toLocaleString("en-CA", { month: "long", year: "numeric" });
    const { rows: [dup] } = await db.query(
      "SELECT id FROM payroll_entries WHERE client_id=$1 AND period_start=$2",
      [clientId, nextStart.toISOString()]
    );

    if (!dup) {
      const { rows: emps } = await db.query("SELECT id FROM employees WHERE client_id=$1", [clientId]);
      const empIds = emps.map((e) => e.id);
      const { rows: [entry] } = await db.query(
        `INSERT INTO payroll_entries
           (client_id,period_label,period_start,period_end,status,employee_ids,metadata,is_auto_generated)
         VALUES ($1,$2,$3,$4,'pending',$5,$6,TRUE) RETURNING id,period_label,period_start,period_end`,
        [clientId, label, nextStart.toISOString(), nextEnd.toISOString(), JSON.stringify(empIds), JSON.stringify({ employeeRows: [] })]
      );
      generated.push({ id: entry.id, periodLabel: label, periodStart: nextStart.toISOString(), periodEnd: nextEnd.toISOString(), isAutoGenerated: true });
    }
    cursor = nextStart;
  }

  await db.query(
    "UPDATE payroll_automation_configs SET last_generated_date=$1, updated_at=NOW() WHERE client_id=$2",
    [cursor.toISOString(), clientId]
  );
  return res.json(ok({ entriesGenerated: generated.length, generatedEntries: generated, lastGeneratedDate: cursor.toISOString() }, "Automation completed"));
});

module.exports = router;
