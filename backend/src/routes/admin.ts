/**
 * Admin-only Routes — /api/admin
 *
 * Clients management + Task creation/assignment + adminStatus updates.
 * Auth: requires valid admin JWT.
 */
import { Hono } from "hono";
import db from "../../db";
import { fail, ok, paged, formatTask, formatEmployee, formatEntry, nowIso, hashPassword } from "../../helpers";
import { requireAuth } from "../../middleware/auth";
import type { JwtPayload } from "../../middleware/auth";

// ─── Admin status options (from product spec) ─────────────────────────────────
export const ADMIN_STATUSES = [
  "On Hold",
  "Not to Do",
  "Data not received",
  "Partial Data received",
  "Data Missing Closed",
  "Work in Progress",
  "Query sent to Support team",
  "Query sent to client",
  "Partial Query received",
  "Review",
  "Sent for Approval to support team",
  "Sent for Approval to client",
  "Approval received",
  "Filed",
] as const;

export type AdminStatus = typeof ADMIN_STATUSES[number];

const admin = new Hono();
admin.use("/*", requireAuth("admin"));

// ══════════════════════════════════════════════════════════════════════════════
//  META
// ══════════════════════════════════════════════════════════════════════════════

/** Returns the list of valid admin statuses (for dropdown population) */
admin.get("/meta/admin-statuses", (c) => {
  return c.json(ok(ADMIN_STATUSES, "Admin statuses fetched"));
});

// ══════════════════════════════════════════════════════════════════════════════
//  CLIENTS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/admin/clients
admin.get("/clients", (c) => {
  const page = Math.max(1, Number(c.req.query("page") ?? 1));
  const per_page = Math.max(1, Number(c.req.query("per_page") ?? 20));
  const search = c.req.query("search") ?? "";
  const offset = (page - 1) * per_page;
  const like = `%${search}%`;

  const rows = db
    .query("SELECT id, email, name, phone, occupation, client_since, portal_status, created_at FROM users WHERE role = 'client' AND (name LIKE ? OR email LIKE ?) ORDER BY name ASC LIMIT ? OFFSET ?")
    .all(like, like, per_page, offset) as Record<string, unknown>[];

  const { total } = db
    .query("SELECT COUNT(*) as total FROM users WHERE role = 'client' AND (name LIKE ? OR email LIKE ?)")
    .get(like, like) as { total: number };

  const clients = rows.map((r) => ({
    id: r.id, email: r.email, name: r.name, phone: r.phone, occupation: r.occupation,
    clientSince: r.client_since, portalStatus: r.portal_status, createdAt: r.created_at,
  }));

  return c.json(paged(clients, "Clients fetched", page, per_page, total));
});

// GET /api/admin/clients/:clientId
admin.get("/clients/:clientId", (c) => {
  const row = db
    .query("SELECT id, email, name, phone, ssn, dob, occupation, client_since, portal_status, created_at FROM users WHERE id = ? AND role = 'client'")
    .get(c.req.param("clientId")) as Record<string, unknown> | undefined;
  if (!row) return c.json(fail("Client not found"), 404);

  return c.json(ok({
    id: row.id, email: row.email, name: row.name, phone: row.phone,
    ssn: row.ssn, dob: row.dob, occupation: row.occupation,
    clientSince: row.client_since, portalStatus: row.portal_status, createdAt: row.created_at,
  }, "Client fetched"));
});

// POST /api/admin/clients
admin.post("/clients", async (c) => {
  const body = await c.req.json<{
    email: string; name: string; password?: string; phone?: string;
    occupation?: string; ssn?: string; dob?: string;
  }>();

  if (!body.email || !body.name) {
    return c.json(fail("Validation failed", [
      { field: "email", message: "email is required" },
      { field: "name", message: "name is required" },
    ].filter((e) => !(body as Record<string, unknown>)[e.field])), 400);
  }

  const exists = db.query("SELECT id FROM users WHERE email = ?").get(body.email);
  if (exists) return c.json(fail("A user with this email already exists"), 409);

  const id = `client-${Date.now()}`;
  const now = nowIso();
  const passwordHash = await hashPassword(body.password ?? "client123");

  db.run(
    `INSERT INTO users (id, email, password_hash, name, role, phone, ssn, dob, occupation, client_since, portal_status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, body.email, passwordHash, body.name, "client", body.phone ?? null,
      body.ssn ?? null, body.dob ?? null, body.occupation ?? null, now.split("T")[0], "active", now, now],
  );

  const row = db.query("SELECT id, email, name, phone, portal_status, created_at FROM users WHERE id = ?").get(id) as Record<string, unknown>;
  return c.json(ok({
    id: row.id, email: row.email, name: row.name, phone: row.phone,
    portalStatus: row.portal_status, createdAt: row.created_at,
    temporaryPassword: body.password ?? "client123",
  }, "Client created"), 201);
});

// PATCH /api/admin/clients/:clientId
admin.patch("/clients/:clientId", async (c) => {
  const row = db.query("SELECT id FROM users WHERE id = ? AND role = 'client'").get(c.req.param("clientId"));
  if (!row) return c.json(fail("Client not found"), 404);

  const body = await c.req.json<Record<string, unknown>>();
  const now = nowIso();
  const fieldMap: Record<string, string> = {
    name: "name", phone: "phone", occupation: "occupation", ssn: "ssn", dob: "dob", portalStatus: "portal_status",
  };

  const sets = ["updated_at = ?"];
  const vals: unknown[] = [now];
  for (const [camel, snake] of Object.entries(fieldMap)) {
    if (camel in body) { sets.push(`${snake} = ?`); vals.push(body[camel]); }
  }

  vals.push(c.req.param("clientId"));
  db.run(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, vals);

  return c.json(ok({ id: c.req.param("clientId"), updatedAt: now }, "Client updated"));
});

// DELETE /api/admin/clients/:clientId
admin.delete("/clients/:clientId", (c) => {
  const row = db.query("SELECT id FROM users WHERE id = ? AND role = 'client'").get(c.req.param("clientId"));
  if (!row) return c.json(fail("Client not found"), 404);
  db.run("DELETE FROM users WHERE id = ?", [c.req.param("clientId")]);
  return c.json(ok({ id: c.req.param("clientId"), deletedAt: nowIso() }, "Client deleted"));
});

// ══════════════════════════════════════════════════════════════════════════════
//  TASKS — ADMIN MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

/** GET /api/admin/tasks — all tasks across all clients, with optional filters */
admin.get("/tasks", (c) => {
  const clientId = c.req.query("clientId");
  const adminStatus = c.req.query("adminStatus");
  const status = c.req.query("status");
  const page = Math.max(1, Number(c.req.query("page") ?? 1));
  const per_page = Math.max(1, Number(c.req.query("per_page") ?? 20));
  const offset = (page - 1) * per_page;

  const conditions: string[] = [];
  const args: unknown[] = [];

  if (clientId) { conditions.push("t.client_id = ?"); args.push(clientId); }
  if (adminStatus) { conditions.push("t.admin_status = ?"); args.push(adminStatus); }
  if (status) { conditions.push("t.status = ?"); args.push(status); }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

  const rows = db
    .query(`SELECT t.*, u.name as client_name, u.email as client_email FROM tasks t JOIN users u ON t.client_id = u.id ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`)
    .all(...args, per_page, offset) as Record<string, unknown>[];

  const { total } = db
    .query(`SELECT COUNT(*) as total FROM tasks t ${where}`)
    .get(...args) as { total: number };

  const data = rows.map((r) => ({ ...formatTask(r), clientName: r.client_name, clientEmail: r.client_email }));

  return c.json(paged(data, "Tasks fetched", page, per_page, total));
});

/** GET /api/admin/clients/:clientId/tasks */
admin.get("/clients/:clientId/tasks", (c) => {
  const clientId = c.req.param("clientId");
  const rows = db
    .query("SELECT * FROM tasks WHERE client_id = ? ORDER BY created_at DESC")
    .all(clientId) as Record<string, unknown>[];
  return c.json(ok(rows.map(formatTask), "Client tasks fetched"));
});

/** POST /api/admin/clients/:clientId/tasks — assign a new task to a client */
admin.post("/clients/:clientId/tasks", async (c) => {
  const { sub: adminId } = c.get("jwtPayload") as JwtPayload;
  const clientId = c.req.param("clientId");

  const client = db.query("SELECT id FROM users WHERE id = ? AND role = 'client'").get(clientId);
  if (!client) return c.json(fail("Client not found"), 404);

  const body = await c.req.json<{
    title: string;
    description?: string;
    taskType?: string;
    adminStatus?: AdminStatus;
    metadata?: Record<string, unknown>;
  }>();

  if (!body.title) return c.json(fail("title is required"), 400);

  // Validate adminStatus
  const adminStatus = body.adminStatus ?? "Data not received";
  if (!ADMIN_STATUSES.includes(adminStatus as AdminStatus)) {
    return c.json(fail(`Invalid adminStatus. Allowed values: ${ADMIN_STATUSES.join(", ")}`), 400);
  }

  const id = `task-${clientId.slice(0, 8)}-${Date.now()}`;
  const now = nowIso();

  db.run(
    `INSERT INTO tasks (id, client_id, assigned_by, title, description, status, admin_status, task_type, metadata, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, clientId, adminId, body.title, body.description ?? null, "pending",
      adminStatus, body.taskType ?? "info", JSON.stringify(body.metadata ?? {}), now, now],
  );

  const row = db.query("SELECT * FROM tasks WHERE id = ?").get(id) as Record<string, unknown>;
  return c.json(ok(formatTask(row), "Task assigned to client"), 201);
});

/** PATCH /api/admin/tasks/:taskId — update task metadata + adminStatus */
admin.patch("/tasks/:taskId", async (c) => {
  const row = db.query("SELECT * FROM tasks WHERE id = ?").get(c.req.param("taskId")) as Record<string, unknown> | undefined;
  if (!row) return c.json(fail("Task not found"), 404);

  const body = await c.req.json<{
    adminStatus?: AdminStatus;
    title?: string;
    description?: string;
    metadata?: Record<string, unknown>;
    status?: "pending" | "complete";
  }>();

  if (body.adminStatus && !ADMIN_STATUSES.includes(body.adminStatus as AdminStatus)) {
    return c.json(fail(`Invalid adminStatus. Allowed: ${ADMIN_STATUSES.join(", ")}`), 400);
  }

  const now = nowIso();
  const sets = ["updated_at = ?"];
  const vals: unknown[] = [now];

  if ("adminStatus" in body) { sets.push("admin_status = ?"); vals.push(body.adminStatus); }
  if ("title" in body) { sets.push("title = ?"); vals.push(body.title); }
  if ("description" in body) { sets.push("description = ?"); vals.push(body.description); }
  if ("metadata" in body) { sets.push("metadata = ?"); vals.push(JSON.stringify(body.metadata)); }
  if ("status" in body) { sets.push("status = ?"); vals.push(body.status); }

  vals.push(c.req.param("taskId"));
  db.run(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`, vals);

  const updated = db.query("SELECT * FROM tasks WHERE id = ?").get(c.req.param("taskId")) as Record<string, unknown>;
  return c.json(ok(formatTask(updated), "Task updated"));
});

/** DELETE /api/admin/tasks/:taskId */
admin.delete("/tasks/:taskId", (c) => {
  const row = db.query("SELECT id FROM tasks WHERE id = ?").get(c.req.param("taskId"));
  if (!row) return c.json(fail("Task not found"), 404);
  db.run("DELETE FROM tasks WHERE id = ?", [c.req.param("taskId")]);
  return c.json(ok({ id: c.req.param("taskId"), deletedAt: nowIso() }, "Task deleted"));
});

/** POST /api/admin/tasks/:taskId/query-sheet — upload Excel rows for client to review */
admin.post("/tasks/:taskId/query-sheet", async (c) => {
  const row = db.query("SELECT * FROM tasks WHERE id = ?").get(c.req.param("taskId")) as Record<string, unknown> | undefined;
  if (!row) return c.json(fail("Task not found"), 404);

  const body = await c.req.json<{
    rows: {
      rowIndex: number;
      date?: string;
      details?: string;
      payment?: string;
      receipt?: string;
      hst?: string;
      ourRemarks?: string;
    }[];
    downloadUrl?: string;
  }>();

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return c.json(fail("rows array is required"), 400);
  }

  // Upsert rows
  for (const r of body.rows) {
    db.run(
      `INSERT INTO query_sheet_rows (task_id, row_index, date, details, payment, receipt, hst, our_remarks, client_remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '')
       ON CONFLICT(task_id, row_index) DO UPDATE SET
         date = excluded.date, details = excluded.details, payment = excluded.payment,
         receipt = excluded.receipt, hst = excluded.hst, our_remarks = excluded.our_remarks,
         updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`,
      [c.req.param("taskId"), r.rowIndex, r.date ?? null, r.details ?? null, r.payment ?? null, r.receipt ?? null, r.hst ?? null, r.ourRemarks ?? null],
    );
  }

  // Optionally store downloadUrl in metadata
  if (body.downloadUrl) {
    const meta = JSON.parse((row.metadata as string) ?? "{}");
    meta.downloadUrl = body.downloadUrl;
    db.run("UPDATE tasks SET metadata = ?, updated_at = ? WHERE id = ?", [JSON.stringify(meta), nowIso(), c.req.param("taskId")]);
  }

  return c.json(ok({ taskId: c.req.param("taskId"), rowsUploaded: body.rows.length }, "Query sheet rows set"));
});

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN DASHBOARD OVERVIEW
// ══════════════════════════════════════════════════════════════════════════════

admin.get("/dashboard", (c) => {
  const totalClients = (db.query("SELECT COUNT(*) as n FROM users WHERE role = 'client'").get() as { n: number }).n;
  const totalTasks = (db.query("SELECT COUNT(*) as n FROM tasks").get() as { n: number }).n;
  const pendingTasks = (db.query("SELECT COUNT(*) as n FROM tasks WHERE status = 'pending'").get() as { n: number }).n;
  const completedTasks = (db.query("SELECT COUNT(*) as n FROM tasks WHERE status = 'complete'").get() as { n: number }).n;

  const statusBreakdown = db
    .query("SELECT admin_status, COUNT(*) as count FROM tasks GROUP BY admin_status ORDER BY count DESC")
    .all() as { admin_status: string; count: number }[];

  return c.json(
    ok({ totalClients, totalTasks, pendingTasks, completedTasks, statusBreakdown }, "Dashboard data fetched"),
  );
});

export default admin;
