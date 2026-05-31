/**
 * Client-facing Payroll Routes — /v3/api/v1/payroll
 * Covers Employees (5.x) + Entries (6.x) + Automation (7.x)
 */
import { Hono } from "hono";
import db from "../../db";
import {
  fail, ok, paged, created,
  formatEmployee, formatEntry,
  safeJson, nowIso, genId,
} from "../../helpers";
import { requireAuth } from "../../middleware/auth";
import type { JwtPayload } from "../../middleware/auth";

const payroll = new Hono();
payroll.use("/*", requireAuth("client"));

// ══════════════════════════════════════════════════════════════════════════════
//  EMPLOYEES
// ══════════════════════════════════════════════════════════════════════════════

// 5.1  GET /payroll/employees
payroll.get("/employees", (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const page = Math.max(1, Number(c.req.query("page") ?? 1));
  const per_page = Math.max(1, Number(c.req.query("per_page") ?? 50));
  const search = c.req.query("search") ?? "";
  const offset = (page - 1) * per_page;

  const like = `%${search}%`;
  const rows = db
    .query(`SELECT * FROM employees WHERE client_id = ? AND (name LIKE ? OR position LIKE ? OR department LIKE ?) ORDER BY name ASC LIMIT ? OFFSET ?`)
    .all(clientId, like, like, like, per_page, offset) as Record<string, unknown>[];

  const { total } = db
    .query("SELECT COUNT(*) as total FROM employees WHERE client_id = ? AND (name LIKE ? OR position LIKE ? OR department LIKE ?)")
    .get(clientId, like, like, like) as { total: number };

  return c.json(paged(rows.map(formatEmployee), "Employees fetched", page, per_page, total));
});

// 5.2  GET /payroll/employees/:id
payroll.get("/employees/:id", (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const row = db
    .query("SELECT * FROM employees WHERE id = ? AND client_id = ?")
    .get(c.req.param("id"), clientId) as Record<string, unknown> | undefined;
  if (!row) return c.json(fail("Employee not found"), 404);
  return c.json(ok(formatEmployee(row), "Employee fetched"));
});

// 5.3  POST /payroll/employees
payroll.post("/employees", async (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const body = await c.req.json<Record<string, unknown>>();
  if (!body.firstName || !body.lastName) {
    return c.json(fail("Validation failed", [
      { field: "firstName", message: "firstName is required" },
      { field: "lastName", message: "lastName is required" },
    ]), 400);
  }

  const id = `EMP_${Date.now()}`;
  const now = nowIso();
  const name = [body.firstName, body.middleName, body.lastName].filter(Boolean).join(" ");
  const salary = body.salary ?? body.hourlyRate ?? null;

  db.run(
    `INSERT INTO employees
       (id, client_id, name, email, first_name, last_name, middle_name, date_of_birth, gender, phone,
        sin, address_line_1, address_line_2, city, country, province_state, postal_code, start_date,
        position, department, hourly_rate, federal_tax_credit, provincial_tax_credit, salary, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, clientId, name, body.email ?? null, body.firstName as string, body.lastName as string,
      body.middleName ?? null, body.dateOfBirth ?? null, body.gender ?? null, body.phone ?? null,
      body.sin ?? null, body.addressLine1 ?? null, body.addressLine2 ?? null,
      body.city ?? null, body.country ?? null, body.provinceState ?? null, body.postalCode ?? null,
      body.startDate ?? null, body.position ?? null, body.department ?? null,
      body.hourlyRate ?? null, body.federalTaxCredit ?? null, body.provincialTaxCredit ?? null,
      salary, now, now],
  );

  const row = db.query("SELECT * FROM employees WHERE id = ?").get(id) as Record<string, unknown>;
  return c.json(ok(formatEmployee(row), "Employee created"), 201);
});

// 5.4  PATCH /payroll/employees/:id
payroll.patch("/employees/:id", async (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const row = db
    .query("SELECT * FROM employees WHERE id = ? AND client_id = ?")
    .get(c.req.param("id"), clientId) as Record<string, unknown> | undefined;
  if (!row) return c.json(fail("Employee not found"), 404);

  const body = await c.req.json<Record<string, unknown>>();
  const now = nowIso();

  const fieldMap: Record<string, string> = {
    firstName: "first_name", lastName: "last_name", middleName: "middle_name",
    email: "email", dateOfBirth: "date_of_birth", gender: "gender", phone: "phone", sin: "sin",
    addressLine1: "address_line_1", addressLine2: "address_line_2", city: "city",
    country: "country", provinceState: "province_state", postalCode: "postal_code",
    startDate: "start_date", position: "position", department: "department",
    hourlyRate: "hourly_rate", federalTaxCredit: "federal_tax_credit",
    provincialTaxCredit: "provincial_tax_credit", salary: "salary",
  };

  const setClauses: string[] = ["updated_at = ?"];
  const vals: unknown[] = [now];

  for (const [camel, snake] of Object.entries(fieldMap)) {
    if (camel in body) { setClauses.push(`${snake} = ?`); vals.push(body[camel]); }
  }

  // Recompute name if any name field changes
  if ("firstName" in body || "lastName" in body || "middleName" in body) {
    const fn = (body.firstName ?? row.first_name) as string;
    const mn = (body.middleName ?? row.middle_name) as string | null;
    const ln = (body.lastName ?? row.last_name) as string;
    setClauses.push("name = ?");
    vals.push([fn, mn, ln].filter(Boolean).join(" "));
  }

  // Sync salary → hourlyRate if hourlyRate changes but salary doesn't
  if ("hourlyRate" in body && !("salary" in body)) {
    setClauses.push("salary = ?");
    vals.push(body.hourlyRate);
  }

  vals.push(c.req.param("id"));
  db.run(`UPDATE employees SET ${setClauses.join(", ")} WHERE id = ?`, vals);

  const updated = db.query("SELECT * FROM employees WHERE id = ?").get(c.req.param("id")) as Record<string, unknown>;
  return c.json(ok(formatEmployee(updated), "Employee updated"));
});

// 5.5  DELETE /payroll/employees/:id
payroll.delete("/employees/:id", (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const row = db
    .query("SELECT id FROM employees WHERE id = ? AND client_id = ?")
    .get(c.req.param("id"), clientId) as Record<string, unknown> | undefined;
  if (!row) return c.json(fail("Employee not found"), 404);

  db.run("DELETE FROM employees WHERE id = ?", [c.req.param("id")]);
  return c.json(ok({ id: row.id, deletedAt: nowIso() }, "Employee deleted"));
});

// ══════════════════════════════════════════════════════════════════════════════
//  PAYROLL ENTRIES
// ══════════════════════════════════════════════════════════════════════════════

// 6.1  GET /payroll/entries
payroll.get("/entries", (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const status = c.req.query("status") ?? "all";
  const page = Math.max(1, Number(c.req.query("page") ?? 1));
  const per_page = Math.max(1, Number(c.req.query("per_page") ?? 20));
  const sort = c.req.query("sort") ?? "period_start_desc";
  const offset = (page - 1) * per_page;
  const order = sort === "period_start_asc" ? "ASC" : "DESC";
  const where = status === "all" ? "" : "AND status = ?";
  const args = status === "all" ? [clientId, per_page, offset] : [clientId, status, per_page, offset];

  const rows = db
    .query(`SELECT * FROM payroll_entries WHERE client_id = ? ${where} ORDER BY period_start ${order} LIMIT ? OFFSET ?`)
    .all(...args) as Record<string, unknown>[];

  const { total } = db
    .query(`SELECT COUNT(*) as total FROM payroll_entries WHERE client_id = ? ${where}`)
    .get(...(status === "all" ? [clientId] : [clientId, status])) as { total: number };

  return c.json(paged(rows.map(formatEntry), "Payroll entries fetched", page, per_page, total));
});

// 6.2  GET /payroll/entries/:id
payroll.get("/entries/:id", (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const row = db
    .query("SELECT * FROM payroll_entries WHERE id = ? AND client_id = ?")
    .get(c.req.param("id"), clientId) as Record<string, unknown> | undefined;
  if (!row) return c.json(fail("Payroll entry not found"), 404);

  const entry = formatEntry(row);
  const empIds = entry.employeeIds as string[];

  const employees = empIds.length
    ? (db.query(`SELECT id, name, position, hourly_rate FROM employees WHERE id IN (${empIds.map(() => "?").join(",")})`)
        .all(...empIds) as Record<string, unknown>[])
        .map((e) => ({ id: e.id, name: e.name, position: e.position, hourlyRate: e.hourly_rate }))
    : [];

  return c.json(ok({ ...entry, employees }, "Payroll entry fetched"));
});

// 6.3  POST /payroll/entries
payroll.post("/entries", async (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const body = await c.req.json<Record<string, unknown>>();

  if (!body.periodLabel || !body.periodStart || !body.periodEnd) {
    return c.json(fail("Validation failed", [
      { field: "periodLabel", message: "periodLabel is required" },
      { field: "periodStart", message: "periodStart is required" },
      { field: "periodEnd", message: "periodEnd is required" },
    ].filter((e) => !body[e.field.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)])), 400);
  }

  // Default to all employees if not specified
  let employeeIds = body.employeeIds as string[] | undefined;
  if (!employeeIds) {
    employeeIds = (db.query("SELECT id FROM employees WHERE client_id = ?").all(clientId) as { id: string }[]).map((e) => e.id);
  }

  const id = `PAY_${Date.now()}`;
  const now = nowIso();

  db.run(
    `INSERT INTO payroll_entries
       (id, client_id, period_label, period_start, period_end, status, employee_ids, notes, metadata, is_auto_generated, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, clientId, body.periodLabel as string,
      new Date(body.periodStart as string).toISOString(),
      new Date(body.periodEnd as string).toISOString(),
      "pending", JSON.stringify(employeeIds), body.notes ?? "", JSON.stringify({ employeeRows: [] }), 0, now, now],
  );

  const row = db.query("SELECT * FROM payroll_entries WHERE id = ?").get(id) as Record<string, unknown>;
  return c.json(ok(formatEntry(row), "Payroll entry created"), 201);
});

// 6.4  PATCH /payroll/entries/:id
payroll.patch("/entries/:id", async (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const row = db
    .query("SELECT * FROM payroll_entries WHERE id = ? AND client_id = ?")
    .get(c.req.param("id"), clientId) as Record<string, unknown> | undefined;
  if (!row) return c.json(fail("Entry not found"), 404);
  if (row.status === "submitted") return c.json(fail("Cannot update a submitted payroll entry"), 409);

  const body = await c.req.json<Record<string, unknown>>();
  const now = nowIso();

  const sets: string[] = ["updated_at = ?"];
  const vals: unknown[] = [now];

  if ("employeeIds" in body) { sets.push("employee_ids = ?"); vals.push(JSON.stringify(body.employeeIds)); }
  if ("notes" in body) { sets.push("notes = ?"); vals.push(body.notes); }
  if ("totalAmount" in body) { sets.push("total_amount = ?"); vals.push(body.totalAmount); }
  if ("metadata" in body) { sets.push("metadata = ?"); vals.push(JSON.stringify(body.metadata)); }

  vals.push(c.req.param("id"));
  db.run(`UPDATE payroll_entries SET ${sets.join(", ")} WHERE id = ?`, vals);

  const updated = db.query("SELECT * FROM payroll_entries WHERE id = ?").get(c.req.param("id")) as Record<string, unknown>;
  return c.json(ok(formatEntry(updated), "Payroll entry updated"));
});

// 6.5  POST /payroll/entries/:id/submit
payroll.post("/entries/:id/submit", async (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const row = db
    .query("SELECT * FROM payroll_entries WHERE id = ? AND client_id = ?")
    .get(c.req.param("id"), clientId) as Record<string, unknown> | undefined;
  if (!row) return c.json(fail("Entry not found"), 404);
  if (row.status === "submitted") return c.json(fail("Entry already submitted"), 409);

  // Accept optional final state snapshot
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  if (body.employeeIds || body.metadata) {
    // Apply final state before submitting
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (body.employeeIds) { sets.push("employee_ids = ?"); vals.push(JSON.stringify(body.employeeIds)); }
    if (body.metadata) { sets.push("metadata = ?"); vals.push(JSON.stringify(body.metadata)); }
    if (sets.length) {
      db.run(`UPDATE payroll_entries SET ${sets.join(", ")} WHERE id = ?`, [...vals, c.req.param("id")]);
    }
  }

  // Validate — at least one employee
  const empIds = safeJson<string[]>(
    (db.query("SELECT employee_ids FROM payroll_entries WHERE id = ?").get(c.req.param("id")) as Record<string, unknown>)?.employee_ids as string,
    [],
  );
  if (empIds.length === 0) {
    return c.json(fail("Validation failed", [{ field: "employeeIds", message: "At least one employee must be selected" }]), 400);
  }

  const now = nowIso();
  db.run("UPDATE payroll_entries SET status = 'submitted', submitted_at = ?, updated_at = ? WHERE id = ?", [now, now, c.req.param("id")]);

  const updated = db.query("SELECT * FROM payroll_entries WHERE id = ?").get(c.req.param("id")) as Record<string, unknown>;
  return c.json(ok({ id: updated.id, periodLabel: updated.period_label, status: "submitted", submittedAt: now, updatedAt: now }, "Payroll submitted successfully"));
});

// 6.6  DELETE /payroll/entries/:id
payroll.delete("/entries/:id", (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const row = db
    .query("SELECT * FROM payroll_entries WHERE id = ? AND client_id = ?")
    .get(c.req.param("id"), clientId) as Record<string, unknown> | undefined;
  if (!row) return c.json(fail("Entry not found"), 404);
  if (row.status === "submitted") return c.json(fail("Cannot delete a submitted payroll entry"), 409);

  db.run("DELETE FROM payroll_entries WHERE id = ?", [c.req.param("id")]);
  return c.json(ok({ id: row.id, deletedAt: nowIso() }, "Payroll entry deleted"));
});

// 6.7  POST /payroll/entries/:id/documents
payroll.post("/entries/:id/documents", async (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const row = db
    .query("SELECT * FROM payroll_entries WHERE id = ? AND client_id = ?")
    .get(c.req.param("id"), clientId) as Record<string, unknown> | undefined;
  if (!row) return c.json(fail("Entry not found"), 404);

  const form = await c.req.formData().catch(() => null);
  const file = form?.get("file") as File | null;
  if (!file) return c.json(fail("file is required"), 400);

  const docId = genId("pdoc");
  const now = nowIso();
  const currentPaths = safeJson<string[]>(row.document_paths as string, []);
  const newPaths = [...currentPaths, file.name];

  db.run("UPDATE payroll_entries SET document_paths = ?, updated_at = ? WHERE id = ?", [JSON.stringify(newPaths), now, c.req.param("id")]);

  return c.json(
    ok({ entryId: row.id, documentId: docId, fileName: file.name, fileSize: file.size, uploadedAt: now, documentPaths: newPaths }, "Document attached to payroll entry"),
    201,
  );
});

// ══════════════════════════════════════════════════════════════════════════════
//  AUTOMATION
// ══════════════════════════════════════════════════════════════════════════════

function formatAutomation(row: Record<string, unknown> | undefined | null) {
  if (!row) return null;
  return {
    startDate: row.start_date,
    frequency: row.frequency,
    isActive: row.is_active === 1,
    lastGeneratedDate: row.last_generated_date ?? null,
  };
}

// 7.1  GET /payroll/automation
payroll.get("/automation", (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const row = db.query("SELECT * FROM payroll_automation_configs WHERE client_id = ?").get(clientId) as Record<string, unknown> | undefined;
  return c.json(ok(formatAutomation(row), row ? "Automation config fetched" : "No automation configured"));
});

// 7.2  PUT /payroll/automation
payroll.put("/automation", async (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const body = await c.req.json<{ startDate: string; frequency: string; isActive: boolean }>();

  const allowed = ["weekly", "biweekly", "monthly"];
  if (!allowed.includes(body.frequency)) {
    return c.json(fail(`Invalid frequency. Allowed: ${allowed.join(", ")}`), 400);
  }

  const now = nowIso();
  const existing = db.query("SELECT id FROM payroll_automation_configs WHERE client_id = ?").get(clientId);

  if (existing) {
    db.run("UPDATE payroll_automation_configs SET start_date = ?, frequency = ?, is_active = ?, updated_at = ? WHERE client_id = ?",
      [body.startDate, body.frequency, body.isActive ? 1 : 0, now, clientId]);
  } else {
    db.run("INSERT INTO payroll_automation_configs (client_id, start_date, frequency, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?)",
      [clientId, body.startDate, body.frequency, body.isActive ? 1 : 0, now, now]);
  }

  const row = db.query("SELECT * FROM payroll_automation_configs WHERE client_id = ?").get(clientId) as Record<string, unknown>;
  return c.json(ok(formatAutomation(row), "Automation config saved"));
});

// 7.3  POST /payroll/automation/disable
payroll.post("/automation/disable", (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const existing = db.query("SELECT * FROM payroll_automation_configs WHERE client_id = ?").get(clientId) as Record<string, unknown> | undefined;
  if (!existing) return c.json(fail("No automation configured"), 404);

  db.run("UPDATE payroll_automation_configs SET is_active = 0, updated_at = ? WHERE client_id = ?", [nowIso(), clientId]);
  const row = db.query("SELECT * FROM payroll_automation_configs WHERE client_id = ?").get(clientId) as Record<string, unknown>;
  return c.json(ok(formatAutomation(row), "Automation disabled"));
});

// 7.4  POST /payroll/automation/run
payroll.post("/automation/run", (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const cfg = db.query("SELECT * FROM payroll_automation_configs WHERE client_id = ? AND is_active = 1").get(clientId) as Record<string, unknown> | undefined;
  if (!cfg) return c.json(fail("Automation is not configured or not active"), 400);

  const freq = cfg.frequency as string;
  const lastDate = cfg.last_generated_date ? new Date(cfg.last_generated_date as string) : new Date(cfg.start_date as string);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const generated: unknown[] = [];
  let cursor = new Date(lastDate);
  let iterations = 0;

  while (iterations < 52) {
    // Advance by frequency
    const nextStart = new Date(cursor);
    if (freq === "weekly") nextStart.setDate(nextStart.getDate() + 7);
    else if (freq === "biweekly") nextStart.setDate(nextStart.getDate() + 14);
    else nextStart.setMonth(nextStart.getMonth() + 1);

    const nextEnd = new Date(nextStart);
    if (freq === "weekly") nextEnd.setDate(nextEnd.getDate() + 6);
    else if (freq === "biweekly") nextEnd.setDate(nextEnd.getDate() + 13);
    else { nextEnd.setMonth(nextEnd.getMonth() + 1); nextEnd.setDate(0); }

    if (nextEnd > today) break;

    // Skip duplicates
    const label = nextStart.toLocaleString("en-CA", { month: "long", year: "numeric" });
    const dup = db.query("SELECT id FROM payroll_entries WHERE client_id = ? AND period_start = ?").get(clientId, nextStart.toISOString());
    if (!dup) {
      const id = `PAY_${Date.now()}_${iterations}`;
      const empIds = (db.query("SELECT id FROM employees WHERE client_id = ?").all(clientId) as { id: string }[]).map((e) => e.id);
      const now = nowIso();
      db.run(
        "INSERT INTO payroll_entries (id, client_id, period_label, period_start, period_end, status, employee_ids, metadata, is_auto_generated, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [id, clientId, label, nextStart.toISOString(), nextEnd.toISOString(), "pending", JSON.stringify(empIds), JSON.stringify({ employeeRows: [] }), 1, now, now],
      );
      generated.push({ id, periodLabel: label, periodStart: nextStart.toISOString(), periodEnd: nextEnd.toISOString(), isAutoGenerated: true });
    }

    cursor = nextStart;
    iterations++;
  }

  const now = nowIso();
  db.run("UPDATE payroll_automation_configs SET last_generated_date = ?, updated_at = ? WHERE client_id = ?", [cursor.toISOString(), now, clientId]);

  return c.json(ok({ entriesGenerated: generated.length, generatedEntries: generated, lastGeneratedDate: cursor.toISOString() }, "Automation completed"));
});

export default payroll;
