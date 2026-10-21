// routes/admin.js — admin-only routes (PostgreSQL async edition)
const express = require("express");
const db = require("../db");
const { fail, ok, paged, formatTask, formatUser, hashPassword, generateInviteToken, safeJson } = require("../helpers");
const { requireAuth } = require("../middleware/auth");
const { sendInviteEmail, getDownloadUrl, getObjectBuffer, sendDataRequestEmail } = require("../config/aws");
const env = require("../config/env");
const { TASK_TYPES, WORKFLOWS, getWorkflow, getAllClientProgressValues } = require("../workflows");
const { initializeSubtasks, advanceToSubtask, getSubtasks, getActivityLog, logActivity } = require("../workflow-service");
const { enrichTaskWithConfig, mergeConfigUpdate, getConfigSchemaForTaskType } = require("../config-fields");
const {
  DOCUMENT_CATALOG, REQUEST_FILE_TYPES,
  normalizeDocumentRequirements, normalizeDocumentRequests, buildDocumentRequirements,
  getDocumentRequirementsFromTask,
} = require("../document-requirements");
const { buildZip } = require("../zip");
const schedule = require("../schedule");
const { generateTasksForClient } = require("../task-generation");

const ADMIN_STATUSES = [
  "On Hold", "Not to Do", "Data not received", "Partial Data received",
  "Data Missing Closed", "Work in Progress", "Query sent to Support team",
  "Query sent to client", "Partial Query received", "Review",
  "Sent for Approval to support team", "Sent for Approval to client",
  "Approval received", "Send for automation", "Received from automation", "Filed",
];

const router = express.Router();
router.use(requireAuth("admin"));

// Assignee resolution: "" / null clears it, a uuid must belong to an active
// admin. Sentinel rather than a throw so the callers can return a clean 400.
const INVALID_ASSIGNEE = Symbol("invalid-assignee");

// The document-request keys a task actually asks for — the allowed set for a
// missing-data request's outstanding items.
function buildRequestKeys(task) {
  return getDocumentRequirementsFromTask(task).map((r) => r.key);
}

async function resolveAssignee(value) {
  if (value === undefined || value === null || value === "") return null;
  const { rows } = await db.query(
    "SELECT id FROM users WHERE id::text=$1 AND role IN ('admin','superadmin') AND is_active = TRUE",
    [String(value)]
  );
  return rows[0] ? rows[0].id : INVALID_ASSIGNEE;
}

// ── Meta ──────────────────────────────────────────────────────────────────────
const { getWorkflowMetadata } = require("../workflow-metadata");

router.get("/meta/task-types", (_, res) => {
  const types = Object.entries(WORKFLOWS).map(([key, wf]) => {
    const meta = getWorkflowMetadata(key);
    return {
      key,
      displayName: wf.displayName,
      subtaskCount: wf.subtasks.length,
      subtasks: wf.subtasks,
      configFields: wf.configFields,
      configSchema: getConfigSchemaForTaskType(key),
      subDetails: {
        generation:     meta.generation,
        subtaskWorkflow: meta.subtaskWorkflow,
        relatedTasks:   meta.relatedTasks,
        progressMilestones: meta.progressMilestones,
      },
    };
  });
  return res.json(ok(types, "Task types fetched"));
});

router.get("/meta/client-progress-values", (_, res) =>
  res.json(ok(getAllClientProgressValues(), "Client progress values fetched"))
);

router.get("/meta/document-types", (_, res) => {
  const sales = DOCUMENT_CATALOG.filter((d) => d.group === "sales");
  const general = DOCUMENT_CATALOG.filter((d) => d.group !== "sales");
  return res.json(ok({
    general,
    sales: { label: "Sales", items: sales },
    all: DOCUMENT_CATALOG,
  }, "Document types catalog"));
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get("/dashboard", async (_, res) => {
  const [counts, breakdown] = await Promise.all([
    db.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role='client')::int AS total_clients,
        (SELECT COUNT(*) FROM tasks)::int                     AS total_tasks,
        (SELECT COUNT(*) FROM tasks WHERE status='pending')::int  AS pending_tasks,
        (SELECT COUNT(*) FROM tasks WHERE status='complete')::int AS completed_tasks
    `),
    db.query(`
      SELECT admin_status, COUNT(*)::int AS count
      FROM tasks
      GROUP BY admin_status
      ORDER BY count DESC
    `),
  ]);

  const { total_clients, total_tasks, pending_tasks, completed_tasks } = counts.rows[0];
  return res.json(ok({
    totalClients:   total_clients,
    totalTasks:     total_tasks,
    pendingTasks:   pending_tasks,
    completedTasks: completed_tasks,
    statusBreakdown: breakdown.rows.map((r) => ({ adminStatus: r.admin_status, count: r.count })),
  }, "Dashboard data fetched"));
});

// ── Clients ───────────────────────────────────────────────────────────────────
router.get("/clients", async (req, res) => {
  const page     = Math.max(1, Number(req.query.page     || 1));
  const per_page = Math.max(1, Number(req.query.per_page || 20));
  const search   = req.query.search || "";
  const offset   = (page - 1) * per_page;
  const like     = `%${search}%`;

  const [{ rows }, { rows: cnt }] = await Promise.all([
    db.query(
      `SELECT id,email,name,phone,occupation,client_since,portal_status,created_at
       FROM users WHERE role='client' AND (name ILIKE $1 OR email ILIKE $2)
       ORDER BY name ASC LIMIT $3 OFFSET $4`,
      [like, like, per_page, offset]
    ),
    db.query(
      "SELECT COUNT(*)::int AS total FROM users WHERE role='client' AND (name ILIKE $1 OR email ILIKE $2)",
      [like, like]
    ),
  ]);

  return res.json(paged(
    rows.map((r) => ({
      id:           r.id,
      email:        r.email,
      name:         r.name,
      phone:        r.phone,
      occupation:   r.occupation,
      clientSince:  r.client_since,
      portalStatus: r.portal_status,
      createdAt:    r.created_at,
    })),
    "Clients fetched", page, per_page, cnt[0].total
  ));
});

router.get("/clients/:clientId", async (req, res) => {
  const { rows } = await db.query(
    `SELECT id,email,name,phone,ssn,dob,occupation,client_since,portal_status,must_change_password,created_at
     FROM users WHERE (id::text=$1 OR slug=$1) AND role='client'`,
    [req.params.clientId]
  );
  if (!rows[0]) return res.status(404).json(fail("Client not found"));
  const r = rows[0];
  return res.json(ok({
    id:                 r.id,
    email:              r.email,
    name:               r.name,
    phone:              r.phone,
    ssn:                r.ssn,
    dob:                r.dob,
    occupation:         r.occupation,
    clientSince:        r.client_since,
    portalStatus:       r.portal_status,
    mustChangePassword: r.must_change_password,
    createdAt:          r.created_at,
  }, "Client fetched"));
});

// POST /api/admin/clients — create client + send invite email
router.post("/clients", async (req, res) => {
  const b = req.body;
  if (!b.email || !b.name) return res.status(400).json(fail("email and name are required"));

  const { rows: ex } = await db.query("SELECT id FROM users WHERE email=$1", [b.email]);
  if (ex.length > 0) return res.status(409).json(fail("Email already in use"));

  // Cross-DB guard: block if this email is already registered for personal tax filing
  if (db.mainQuery) {
    try {
      const { rows: personalEx } = await db.mainQuery(
        "SELECT id, customer_type FROM users WHERE LOWER(email) = LOWER($1)",
        [b.email]
      );
      const personalUser = personalEx[0];
      if (personalUser && personalUser.customer_type !== "BusinessTax") {
        return res.status(409).json(fail(
          "This email is already registered as a Personal Tax user."
        ));
      }
    } catch (err) {
      console.error("Cross-DB personal-tax check failed (non-blocking):", err.message);
    }
  }

  // Create user with a random temp password (they'll set it via invite)
  const tempHash = await hashPassword(require("crypto").randomBytes(24).toString("hex"));
  const now = new Date().toISOString().split("T")[0];

  const { rows: [user] } = await db.query(
    `INSERT INTO users
       (email, password_hash, name, role, phone, occupation, client_since, portal_status, must_change_password)
     VALUES ($1,$2,$3,'client',$4,$5,$6,'pending',TRUE)
     RETURNING id,email,name,phone,portal_status,created_at`,
    [b.email, tempHash, b.name, b.phone || null, b.occupation || null, now]
  );

  // Generate invite token (7 day expiry)
  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await db.query(
    "INSERT INTO invite_tokens (user_id, token, expires_at, created_by) VALUES ($1,$2,$3,$4)",
    [user.id, token, expiresAt, req.user.sub]
  );

  const inviteUrl = `${env.FRONTEND_URL}/invite/${token}`;
  await sendInviteEmail({ toEmail: user.email, toName: user.name, inviteUrl });

  return res.status(201).json(ok({
    id:              user.id,
    email:           user.email,
    name:            user.name,
    phone:           user.phone,
    portalStatus:    user.portal_status,
    createdAt:       user.created_at,
    inviteSent:      true,
    inviteExpiresAt: expiresAt,
  }, "Client created and invite sent"));
});

// POST /api/admin/clients/:clientId/resend-invite
router.post("/clients/:clientId/resend-invite", async (req, res) => {
  const { rows } = await db.query(
    "SELECT * FROM users WHERE (id::text=$1 OR slug=$1) AND role='client'",
    [req.params.clientId]
  );
  if (!rows[0]) return res.status(404).json(fail("Client not found"));
  const user = rows[0];

  // Expire all existing unused tokens
  await db.query(
    "UPDATE invite_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL",
    [user.id]
  );

  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await db.query(
    "INSERT INTO invite_tokens (user_id, token, expires_at, created_by) VALUES ($1,$2,$3,$4)",
    [user.id, token, expiresAt, req.user.sub]
  );

  const inviteUrl = `${env.FRONTEND_URL}/invite/${token}`;
  await sendInviteEmail({ toEmail: user.email, toName: user.name, inviteUrl });

  return res.json(ok({ inviteExpiresAt: expiresAt }, "Invite resent"));
});

router.patch("/clients/:clientId", async (req, res) => {
  const { rows } = await db.query(
    "SELECT id FROM users WHERE (id::text=$1 OR slug=$1) AND role='client'",
    [req.params.clientId]
  );
  if (!rows[0]) return res.status(404).json(fail("Client not found"));
  const userId = rows[0].id;

  const b = req.body;
  const fieldMap = { name:"name", phone:"phone", occupation:"occupation", ssn:"ssn", dob:"dob", portalStatus:"portal_status" };
  const sets = ["updated_at=NOW()"]; const vals = [];
  let i = 1;
  for (const [camel, snake] of Object.entries(fieldMap)) {
    if (camel in b) { sets.push(`${snake}=$${i++}`); vals.push(b[camel]); }
  }
  vals.push(userId);
  await db.query(`UPDATE users SET ${sets.join(",")} WHERE id=$${i}`, vals);
  return res.json(ok({ id: userId, updatedAt: new Date().toISOString() }, "Client updated"));
});

router.delete("/clients/:clientId", async (req, res) => {
  const { rows } = await db.query(
    "SELECT id, email FROM users WHERE (id::text=$1 OR slug=$1) AND role='client'",
    [req.params.clientId]
  );
  if (!rows[0]) return res.status(404).json(fail("Client not found"));
  await db.query("DELETE FROM users WHERE id=$1", [rows[0].id]);
  // Cascade delete to Flutter DB so a re-invite always starts with a fresh UUID
  if (db.mainQuery) {
    try {
      await db.mainQuery("DELETE FROM users WHERE email=LOWER($1)", [rows[0].email]);
    } catch (err) {
      console.error(`Flutter DB cleanup failed for ${rows[0].email} (non-blocking):`, err.message);
    }
  }
  return res.json(ok({ id: rows[0].id, deletedAt: new Date().toISOString() }, "Client deleted"));
});

// ── Tasks — Admin management ──────────────────────────────────────────────────
router.get("/tasks", async (req, res) => {
  const { clientId, adminStatus, status, taskType, clientProgress } = req.query;
  const page     = Math.max(1, Number(req.query.page     || 1));
  const per_page = Math.max(1, Number(req.query.per_page || 20));
  const offset   = (page - 1) * per_page;

  const conds = []; const args = [];
  let i = 1;
  if (clientId)       { conds.push(`t.client_id=$${i++}`);       args.push(clientId); }
  if (adminStatus)    { conds.push(`t.admin_status=$${i++}`);    args.push(adminStatus); }
  if (status)         { conds.push(`t.status=$${i++}`);          args.push(status); }
  if (taskType)       { conds.push(`t.task_type=$${i++}`);       args.push(taskType); }
  if (clientProgress) { conds.push(`t.client_progress=$${i++}`); args.push(clientProgress); }

  const where = conds.length ? "WHERE " + conds.join(" AND ") : "";

  const [{ rows }, { rows: cnt }] = await Promise.all([
    db.query(
      `SELECT t.*, u.name AS client_name, u.email AS client_email
       FROM tasks t JOIN users u ON t.client_id=u.id
       ${where} ORDER BY t.created_at DESC LIMIT $${i++} OFFSET $${i++}`,
      [...args, per_page, offset]
    ),
    db.query(
      `SELECT COUNT(*)::int AS total FROM tasks t ${where}`,
      args
    ),
  ]);

  return res.json(paged(
    rows.map((r) => ({ ...formatTask(r), clientName: r.client_name, clientEmail: r.client_email })),
    "Tasks fetched", page, per_page, cnt[0].total
  ));
});

// GET /api/admin/clients/:clientId/tasks
//
// Default (no `closed` param) returns every task, unpaged — the long-standing
// contract this endpoint's callers rely on. The client detail screen asks for
// the two halves separately instead: `?closed=false` for the Active table and
// `?closed=true&page=N` for the Closed table, which pages so a client with
// years of history stays cheap to open while old rows remain reachable.
router.get("/clients/:clientId/tasks", async (req, res) => {
  const { rows: [client] } = await db.query(
    "SELECT id FROM users WHERE (id::text=$1 OR slug=$1) AND role='client'",
    [req.params.clientId]
  );
  if (!client) return res.status(404).json(fail("Client not found"));

  const SELECT = `
    SELECT t.*, a.name AS assigned_to_name, c.name AS closed_by_name
    FROM tasks t
    LEFT JOIN users a ON t.assigned_to = a.id
    LEFT JOIN users c ON t.closed_by   = c.id`;

  const closedParam = req.query.closed;
  if (closedParam === undefined) {
    const { rows } = await db.query(
      `${SELECT} WHERE t.client_id=$1 ORDER BY t.created_at DESC`, [client.id]);
    return res.json(ok(rows.map(formatTask), "Client tasks fetched"));
  }

  const wantClosed = closedParam === "true" || closedParam === "1";
  const page     = Math.max(1, Number(req.query.page || 1));
  const per_page = Math.max(1, Math.min(100, Number(req.query.per_page || 10)));
  const offset   = (page - 1) * per_page;
  const filter   = wantClosed ? "t.closed_at IS NOT NULL" : "t.closed_at IS NULL";
  // Closed reads newest-closed first; active keeps the existing newest-created order.
  const order    = wantClosed ? "t.closed_at DESC" : "t.created_at DESC";

  const [{ rows }, { rows: cnt }] = await Promise.all([
    db.query(`${SELECT} WHERE t.client_id=$1 AND ${filter} ORDER BY ${order} LIMIT $2 OFFSET $3`,
      [client.id, per_page, offset]),
    db.query(`SELECT COUNT(*)::int AS total FROM tasks t WHERE t.client_id=$1 AND ${filter}`,
      [client.id]),
  ]);

  return res.json(paged(rows.map(formatTask), "Client tasks fetched", page, per_page, cnt[0].total));
});

// GET /api/admin/assignable-admins
// Staff a task can be assigned to. Separate from the superadmin-only
// /api/admin/admins roster: every admin needs to be able to pick an assignee,
// but only a superadmin may see or change permissions and audit history.
router.get("/assignable-admins", async (_req, res) => {
  const { rows } = await db.query(
    `SELECT id, name, email FROM users
     WHERE role IN ('admin','superadmin') AND is_active = TRUE
     ORDER BY name ASC`
  );
  return res.json(ok(rows, "Assignable admins fetched"));
});

router.post("/clients/:clientId/tasks", async (req, res) => {
  const { rows: [client] } = await db.query(
    "SELECT id FROM users WHERE (id::text=$1 OR slug=$1) AND role='client'",
    [req.params.clientId]
  );
  if (!client) return res.status(404).json(fail("Client not found"));

  const b = req.body;
  const taskType = b.taskType || "info";

  // Workflow types get subtasks; legacy types (onboarding_form, info, etc.) are allowed too
  const wf = getWorkflow(taskType);
  const selectedSubtasks = Array.isArray(b.selectedSubtasks)
    ? [...new Set(b.selectedSubtasks.map((s) => String(s).trim()).filter(Boolean))]
    : [];
  if (wf && selectedSubtasks.length) {
    const invalid = selectedSubtasks.filter((s) => !wf.subtasks.includes(s));
    if (invalid.length) {
      return res.status(400).json(fail(`Invalid selectedSubtasks for ${taskType}: ${invalid.join(", ")}`));
    }
  }

  const title = b.title || (wf ? wf.displayName : null);
  if (!title) return res.status(400).json(fail("title is required (or provide a valid workflow taskType)"));

  const metadata = { ...(b.metadata || {}) };
  if (b.documentRequirements) {
    metadata.documentRequirements = normalizeDocumentRequirements(b.documentRequirements);
  }
  if (b.documentRequests) {
    metadata.documentRequests = normalizeDocumentRequests(b.documentRequests);
  }

  const assignedTo = await resolveAssignee(b.assignedTo);
  if (assignedTo === INVALID_ASSIGNEE) return res.status(400).json(fail("assignedTo is not an active admin"));

  const adminStatus = b.adminStatus && ADMIN_STATUSES.includes(b.adminStatus)
    ? b.adminStatus
    : "Data not received";

  // Auto-compute open/due dates for filing types from config (Excel schedule)
  // when the admin didn't supply them explicitly.
  let openDate = b.openDate || null;
  let dueDate = b.dueDate || null;
  let taxYear = b.taxYear || null;
  if (!openDate && !dueDate && b.config) {
    const d = schedule.computeDatesForTask(taskType, b.config);
    if (d.openDate) { openDate = d.openDate; dueDate = d.dueDate; taxYear = taxYear || d.taxYear; }
  }

  // For CUSTOM tasks, the configSchema lives in metadata.configSchema
  if (taskType === "CUSTOM" && Array.isArray(b.formFields)) {
    metadata.configSchema = b.formFields;
  }
  if (taskType === "CUSTOM" && b.documentRequirements) {
    metadata.documentRequirements = normalizeDocumentRequirements(b.documentRequirements);
  }

  const priority = ["high","medium","low","none"].includes(b.priority) ? b.priority : "medium";
  const instructions = b.instructions || null;

  const { rows: [task] } = await db.query(
    `INSERT INTO tasks
       (client_id, assigned_by, assigned_to, template_id, template_version_id,
        title, description, instructions, task_type, admin_status, metadata, config,
        tax_year, due_date, open_date, priority)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING *`,
    [
      client.id, req.user.sub, assignedTo,
      b.templateId || null, b.templateVersionId || null,
      title, b.description || null, instructions,
      taskType,
      adminStatus,
      JSON.stringify(metadata),
      b.config ? JSON.stringify(b.config) : "{}",
      taxYear, dueDate, openDate,
      priority,
    ]
  );

  await logActivity(task.id, "task_created", req.user.sub, `Created "${title}"`);

  // If this is a workflow task type, create subtask rows and set initial state
  if (wf) {
    await initializeSubtasks(task.id, taskType, selectedSubtasks.length ? selectedSubtasks : null);
    const { rows: [refreshed] } = await db.query("SELECT * FROM tasks WHERE id=$1", [task.id]);
    return res.status(201).json(ok({
      ...formatTask(refreshed),
      ...enrichTaskWithConfig(refreshed, safeJson(refreshed.config, {})),
    }, "Task created with workflow"));
  }

  return res.status(201).json(ok({
    ...formatTask(task),
    ...enrichTaskWithConfig(task, safeJson(task.config, {})),
  }, "Task assigned to client"));
});

// POST /api/admin/clients/:clientId/generate-tasks
// Given a service config (fiscalYearEnd, salesTaxFrequency, hstQuarterOption,
// bookkeepingFrequency, craInstallmentInT2/HST, taxYearEnd, ...), create every
// currently-active recurring filing task with Excel-accurate open/due dates.
// Idempotent: dedups on metadata.periodKey per (client, task_type).
router.post("/clients/:clientId/generate-tasks", async (req, res) => {
  const { rows: [client] } = await db.query(
    "SELECT id FROM users WHERE (id::text=$1 OR slug=$1) AND role='client'",
    [req.params.clientId]
  );
  if (!client) return res.status(404).json(fail("Client not found"));

  const config = req.body.config || req.body || {};
  const result = await generateTasksForClient(client.id, config, req.user.sub);

  return res.status(201).json(ok(result, `${result.count} task(s) generated`));
});

router.patch("/tasks/:taskId", async (req, res) => {
  const { rows: [existing] } = await db.query("SELECT * FROM tasks WHERE id=$1", [req.params.taskId]);
  if (!existing) return res.status(404).json(fail("Task not found"));

  const b = req.body;
  if (b.adminStatus && !ADMIN_STATUSES.includes(b.adminStatus)) {
    return res.status(400).json(fail(`Invalid adminStatus`));
  }

  const sets = ["updated_at=NOW()"]; const vals = []; let i = 1;
  // metadata is deliberately NOT listed here — the documentRequirements block
  // below owns it (it has to merge, not clobber). Listing it in both places
  // emitted "metadata=$n" twice in one UPDATE, which Postgres rejects.
  const map = {
    adminStatus: "admin_status", title: "title", description: "description",
    status: "status", dueDate: "due_date", openDate: "open_date",
  };
  const DATE_COLS = new Set(["due_date", "open_date"]);
  for (const [camel, snake] of Object.entries(map)) {
    if (camel in b) {
      sets.push(`${snake}=$${i++}`);
      // A cleared date input arrives as "" — a date column won't take that.
      vals.push(DATE_COLS.has(snake) && !b[camel] ? null : b[camel]);
    }
  }
  if ("assignedTo" in b) {
    const assignedTo = await resolveAssignee(b.assignedTo);
    if (assignedTo === INVALID_ASSIGNEE) return res.status(400).json(fail("assignedTo is not an active admin"));
    sets.push(`assigned_to=$${i++}`);
    vals.push(assignedTo);
  }
  if ("config" in b) {
    sets.push(`config=$${i++}`);
    vals.push(JSON.stringify(mergeConfigUpdate(
      existing.task_type, safeJson(existing.config, {}), b.config
    )));
  }
  if ("documentRequirements" in b || "documentRequests" in b || b.metadata) {
    const curMeta = safeJson(existing.metadata, {});
    const newMeta = { ...curMeta, ...(b.metadata || {}) };
    if ("documentRequirements" in b) {
      newMeta.documentRequirements = normalizeDocumentRequirements(b.documentRequirements);
    }
    if ("documentRequests" in b) {
      newMeta.documentRequests = normalizeDocumentRequests(b.documentRequests);
    }
    sets.push(`metadata=$${i++}`);
    vals.push(JSON.stringify(newMeta));
  }
  vals.push(req.params.taskId);
  const { rows: [updated] } = await db.query(
    `UPDATE tasks SET ${sets.join(",")} WHERE id=$${i} RETURNING *`,
    vals
  );

  // Human-readable diff for the "All activity" feed — only the fields a
  // reader would care about, not raw config/metadata JSON.
  const changes = [];
  if ("adminStatus" in b && b.adminStatus !== existing.admin_status) changes.push(`status: "${existing.admin_status}" → "${b.adminStatus}"`);
  if ("title" in b && b.title !== existing.title) changes.push(`title: "${existing.title}" → "${b.title}"`);
  if ("dueDate" in b && (b.dueDate || null) !== existing.due_date) changes.push(`due date → ${b.dueDate || "(cleared)"}`);
  if ("openDate" in b && (b.openDate || null) !== existing.open_date) changes.push(`open date → ${b.openDate || "(cleared)"}`);
  if ("description" in b && b.description !== existing.description) changes.push("description updated");
  if ("config" in b) changes.push("details updated");
  if ("documentRequests" in b) changes.push("document requests updated");
  if ("assignedTo" in b && (updated.assigned_to || null) !== (existing.assigned_to || null)) {
    const { rows: [who] } = await db.query("SELECT name FROM users WHERE id=$1", [updated.assigned_to]);
    changes.push(`assignee → ${who?.name || "(unassigned)"}`);
  }
  if (changes.length) {
    await logActivity(updated.id, "task_edited", req.user.sub, changes.join("; "));
  }

  // Re-read with the assignee/closer names joined on, so the caller's cache
  // gets the same shape the list endpoint returns.
  const { rows: [withNames] } = await db.query(
    `SELECT t.*, a.name AS assigned_to_name, c.name AS closed_by_name
     FROM tasks t LEFT JOIN users a ON t.assigned_to=a.id LEFT JOIN users c ON t.closed_by=c.id
     WHERE t.id=$1`,
    [updated.id]
  );

  return res.json(ok({
    ...formatTask(withNames || updated),
    ...enrichTaskWithConfig(updated, safeJson(updated.config, {})),
  }, "Task updated"));
});

// POST /api/admin/tasks/:taskId/close — the Tasks tab's "Mark as done".
//
// Admin-side only: it records closed_at/closed_by and moves the row into the
// Closed table. It deliberately does NOT touch `status`/`completed_at`, which
// mean "the client finished their part" and drive what the Flutter app shows
// — closing a task the client never submitted must not read back to them as
// something they completed.
router.post("/tasks/:taskId/close", async (req, res) => {
  const { rows: [task] } = await db.query("SELECT * FROM tasks WHERE id=$1", [req.params.taskId]);
  if (!task) return res.status(404).json(fail("Task not found"));
  if (task.closed_at) return res.status(409).json(fail("Task is already closed"));

  const note = (req.body?.note || "").trim() || null;
  const { rows: [updated] } = await db.query(
    "UPDATE tasks SET closed_at=NOW(), closed_by=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
    [req.user.sub, task.id]
  );
  await logActivity(task.id, "task_closed", req.user.sub, note ? `Marked done — ${note}` : "Marked done");

  return res.json(ok(formatTask(updated), "Task marked as done"));
});

// POST /api/admin/tasks/:taskId/reopen — undo a close.
router.post("/tasks/:taskId/reopen", async (req, res) => {
  const { rows: [task] } = await db.query("SELECT * FROM tasks WHERE id=$1", [req.params.taskId]);
  if (!task) return res.status(404).json(fail("Task not found"));
  if (!task.closed_at) return res.status(409).json(fail("Task is not closed"));

  const { rows: [updated] } = await db.query(
    "UPDATE tasks SET closed_at=NULL, closed_by=NULL, updated_at=NOW() WHERE id=$1 RETURNING *",
    [task.id]
  );
  await logActivity(task.id, "task_reopened", req.user.sub, "Reopened");

  return res.json(ok(formatTask(updated), "Task reopened"));
});

router.patch("/tasks/:taskId/reassign", async (req, res) => {
  const { clientId } = req.body;
  if (!clientId) return res.status(400).json(fail("clientId is required"));

  const [{ rows: [task] }, { rows: [client] }] = await Promise.all([
    db.query("SELECT id FROM tasks WHERE id=$1", [req.params.taskId]),
    db.query("SELECT id FROM users WHERE (id::text=$1 OR slug=$1) AND role='client'", [clientId]),
  ]);
  if (!task)   return res.status(404).json(fail("Task not found"));
  if (!client) return res.status(404).json(fail("Target client not found"));

  const { rows: [updated] } = await db.query(
    "UPDATE tasks SET client_id=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
    [client.id, task.id]
  );
  return res.json(ok(formatTask(updated), "Task reassigned"));
});

router.delete("/tasks/:taskId", async (req, res) => {
  const { rows: [task] } = await db.query("SELECT id FROM tasks WHERE id=$1", [req.params.taskId]);
  if (!task) return res.status(404).json(fail("Task not found"));
  await db.query("DELETE FROM tasks WHERE id=$1", [task.id]);
  return res.json(ok({ id: task.id, deletedAt: new Date().toISOString() }, "Task deleted"));
});

// ── Subtask workflow endpoints ────────────────────────────────────────────────

// PATCH /api/admin/tasks/:taskId/subtask — advance to a specific subtask
router.patch("/tasks/:taskId/subtask", async (req, res) => {
  const { subtaskName } = req.body;
  if (!subtaskName) return res.status(400).json(fail("subtaskName is required"));

  try {
    const result = await advanceToSubtask(req.params.taskId, subtaskName, req.user.sub);
    return res.json(ok(result, "Subtask advanced"));
  } catch (err) {
    return res.status(400).json(fail(err.message));
  }
});

// GET /api/admin/tasks/:taskId/subtasks — list all subtasks (admin view)
router.get("/tasks/:taskId/subtasks", async (req, res) => {
  const { rows: [task] } = await db.query("SELECT id, task_type FROM tasks WHERE id=$1", [req.params.taskId]);
  if (!task) return res.status(404).json(fail("Task not found"));

  const subtasks = await getSubtasks(task.id);
  const wf = task.task_type ? getWorkflow(task.task_type) : null;

  return res.json(ok({
    taskId:   task.id,
    taskType: task.task_type,
    workflow: wf ? wf.displayName : null,
    subtasks,
  }, "Subtasks fetched"));
});

// GET /api/admin/tasks/:taskId/activity — activity log
router.get("/tasks/:taskId/activity", async (req, res) => {
  const { rows: [task] } = await db.query("SELECT id FROM tasks WHERE id=$1", [req.params.taskId]);
  if (!task) return res.status(404).json(fail("Task not found"));

  const log = await getActivityLog(task.id);
  return res.json(ok(log, "Activity log fetched"));
});

// ── Missing-data request (admin_status "Partial Data received") ─────────────
//
// Once some documents have arrived, the admin narrows the ask: which of the
// task's existing document requests are still outstanding, for which period,
// plus a note to the client. Stored on the task so the chaser emails can
// switch from "send us your documents" to "we are still missing these"
// (see chaser-scheduler.js / sendDataRequestEmail).

// POST /api/admin/tasks/:taskId/missing-data-request
// body: { period?, note?, outstandingKeys?: string[], sendEmail?: boolean }
router.post("/tasks/:taskId/missing-data-request", async (req, res) => {
  const { rows: [task] } = await db.query("SELECT * FROM tasks WHERE id=$1", [req.params.taskId]);
  if (!task) return res.status(404).json(fail("Task not found"));

  const b = req.body || {};
  const period = String(b.period || "").trim() || null;
  const note = String(b.note || "").trim() || null;

  // Outstanding items must name requests the task actually has, otherwise the
  // client would be chased for something never asked of them.
  const configured = new Set(buildRequestKeys(task));
  const outstandingKeys = Array.isArray(b.outstandingKeys)
    ? [...new Set(b.outstandingKeys.map(String).filter((k) => configured.has(k)))]
    : [];

  if (!period && !note && !outstandingKeys.length) {
    return res.status(400).json(fail("Give at least a period, a note, or the outstanding documents"));
  }

  const meta = safeJson(task.metadata, {});
  meta.missingDataRequest = {
    period, note, outstandingKeys,
    requestedAt: new Date().toISOString(),
    requestedBy: req.user.sub,
    requestedByName: req.user.name || null,
  };

  // Recording a missing-data request IS the "partial data" state — set it here
  // so the chasers pick up the new wording without a second manual step.
  const { rows: [updated] } = await db.query(
    "UPDATE tasks SET metadata=$1, admin_status='Partial Data received', updated_at=NOW() WHERE id=$2 RETURNING *",
    [JSON.stringify(meta), task.id]
  );

  await logActivity(task.id, "missing_data_requested", req.user.sub,
    [period && `period ${period}`, outstandingKeys.length && `${outstandingKeys.length} document(s)`, note && "note added"]
      .filter(Boolean).join("; ") || "Missing-data request recorded");

  // Optional immediate send — otherwise the hourly chaser picks it up inside
  // the next Atlantic send window.
  let emailed = false;
  let emailError = null;
  if (b.sendEmail) {
    const { rows: [client] } = await db.query("SELECT name, email FROM users WHERE id=$1", [task.client_id]);
    if (!client?.email) {
      emailError = "This client has no email address on file";
    } else {
      try {
        await sendDataRequestEmail({
          toEmail: client.email, clientName: client.name,
          taskTitle: task.title, taskType: task.task_type,
          isChaser: true, isMissingData: true,
          missingDataNote: note, missingDataPeriod: period,
        });
        await db.query(
          "UPDATE tasks SET reminder_count=reminder_count+1, last_reminder_sent_at=NOW() WHERE id=$1",
          [task.id]
        );
        await logActivity(task.id, "missing_data_email_sent", req.user.sub, `Emailed ${client.email}`);
        emailed = true;
      } catch (err) {
        // The request itself is saved — report the send failure instead of
        // rolling back work the admin has already done.
        console.error(`Missing-data email failed for task ${task.id}:`, err.message);
        emailError = err.message;
      }
    }
  }

  return res.json(ok({
    ...formatTask(updated),
    missingDataRequest: meta.missingDataRequest,
    emailed, emailError,
  }, emailError ? `Saved, but the email could not be sent: ${emailError}` : "Missing-data request saved"));
});

// DELETE /api/admin/tasks/:taskId/missing-data-request — clear it
router.delete("/tasks/:taskId/missing-data-request", async (req, res) => {
  const { rows: [task] } = await db.query("SELECT * FROM tasks WHERE id=$1", [req.params.taskId]);
  if (!task) return res.status(404).json(fail("Task not found"));

  const meta = safeJson(task.metadata, {});
  delete meta.missingDataRequest;
  const { rows: [updated] } = await db.query(
    "UPDATE tasks SET metadata=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
    [JSON.stringify(meta), task.id]
  );
  await logActivity(task.id, "missing_data_cleared", req.user.sub, "Missing-data request cleared");
  return res.json(ok(formatTask(updated), "Missing-data request cleared"));
});

// ── Task documents — what the client uploaded against the task's requests ────

// GET /api/admin/meta/document-request-file-types
router.get("/meta/document-request-file-types", (_, res) =>
  res.json(ok(REQUEST_FILE_TYPES, "Accepted file types"))
);

// GET /api/admin/tasks/:taskId/documents
// The configured requests, each with the files the client has actually
// uploaded against it — what the admin panel's "Documents requested" section
// renders.
router.get("/tasks/:taskId/documents", async (req, res) => {
  const { rows: [task] } = await db.query("SELECT * FROM tasks WHERE id=$1", [req.params.taskId]);
  if (!task) return res.status(404).json(fail("Task not found"));

  const [requirements, { rows: docs }] = await Promise.all([
    buildDocumentRequirements(task),
    db.query(
      `SELECT id, category, slot_index, file_name, original_filename, file_type, file_size, s3_key, uploaded_at
       FROM task_documents WHERE task_id=$1 ORDER BY category, slot_index`,
      [task.id]
    ),
  ]);

  const uploads = docs.map((d) => ({
    id:               d.id,
    category:         d.category,
    slotIndex:        d.slot_index,
    fileName:         d.file_name,
    originalFilename: d.original_filename || d.file_name,
    fileType:         d.file_type,
    fileSize:         Number(d.file_size || 0),
    hasFile:          !!d.s3_key,
    uploadedAt:       d.uploaded_at,
  }));

  return res.json(ok({
    taskId:       task.id,
    requirements,
    uploads,
    uploadCount:  uploads.length,
    missingDataRequest: safeJson(task.metadata, {}).missingDataRequest || null,
  }, "Task documents fetched"));
});

// GET /api/admin/task-documents/:documentId/download[?download=1]
router.get("/task-documents/:documentId/download", async (req, res) => {
  const { rows: [doc] } = await db.query("SELECT * FROM task_documents WHERE id=$1", [req.params.documentId]);
  if (!doc) return res.status(404).json(fail("Document not found"));
  if (!doc.s3_key) return res.status(400).json(fail("No stored file for this upload"));

  try {
    const url = await getDownloadUrl({
      key: doc.s3_key,
      forceDownload: req.query.download === "1",
      fileName: doc.original_filename || doc.file_name,
    });
    return res.json(ok({ downloadUrl: url, fileName: doc.original_filename || doc.file_name }, "Download URL generated"));
  } catch {
    return res.status(500).json(fail("Could not generate download URL"));
  }
});

// GET /api/admin/tasks/:taskId/documents/archive
// Every uploaded file for the task as one .zip. Streams the bytes back
// directly rather than a JSON envelope — the browser saves it as a file.
router.get("/tasks/:taskId/documents/archive", async (req, res) => {
  const { rows: [task] } = await db.query("SELECT id, title FROM tasks WHERE id=$1", [req.params.taskId]);
  if (!task) return res.status(404).json(fail("Task not found"));

  const { rows: docs } = await db.query(
    `SELECT category, slot_index, file_name, original_filename, s3_key, uploaded_at
     FROM task_documents WHERE task_id=$1 AND s3_key IS NOT NULL ORDER BY category, slot_index`,
    [task.id]
  );
  if (!docs.length) return res.status(404).json(fail("This task has no uploaded documents yet"));

  const entries = [];
  const failed = [];
  for (const d of docs) {
    try {
      const data = await getObjectBuffer({ key: d.s3_key });
      // Prefix with the request key so a zip of several categories stays
      // readable when the client named two files the same thing.
      entries.push({
        name: `${d.category}_${d.slot_index}_${d.original_filename || d.file_name}`,
        data,
        date: d.uploaded_at,
      });
    } catch (err) {
      console.error(`Zip: could not read ${d.s3_key}:`, err.message);
      failed.push(d.original_filename || d.file_name);
    }
  }
  if (!entries.length) return res.status(502).json(fail("None of this task's files could be read from storage"));

  let zip;
  try {
    zip = buildZip(entries);
  } catch (err) {
    return res.status(413).json(fail(err.message));
  }

  const safeTitle = String(task.title || "task").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}_documents.zip"`);
  res.setHeader("Content-Length", String(zip.length));
  // Partial success has to be visible: the zip is still worth having, but the
  // caller must be able to tell that some files didn't make it in.
  if (failed.length) res.setHeader("X-Skipped-Files", String(failed.length));
  return res.end(zip);
});

// POST /api/admin/tasks/:taskId/query-sheet — set Excel rows
router.post("/tasks/:taskId/query-sheet", async (req, res) => {
  const { rows: [task] } = await db.query("SELECT * FROM tasks WHERE id=$1", [req.params.taskId]);
  if (!task) return res.status(404).json(fail("Task not found"));

  const { rows: rowsData, downloadUrl } = req.body;
  if (!Array.isArray(rowsData) || !rowsData.length) {
    return res.status(400).json(fail("rows array is required"));
  }

  for (const r of rowsData) {
    await db.query(
      `INSERT INTO query_sheet_rows
         (task_id, row_index, date, details, payment, receipt, hst, our_remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (task_id, row_index) DO UPDATE
         SET date=$3, details=$4, payment=$5, receipt=$6, hst=$7, our_remarks=$8, updated_at=NOW()`,
      [task.id, r.rowIndex, r.date||null, r.details||null, r.payment||null, r.receipt||null, r.hst||null, r.ourRemarks||null]
    );
  }

  if (downloadUrl) {
    const meta = { ...(task.metadata || {}), downloadUrl };
    await db.query("UPDATE tasks SET metadata=$1, updated_at=NOW() WHERE id=$2", [meta, task.id]);
  }

  return res.json(ok({ taskId: task.id, rowsUploaded: rowsData.length }, "Query sheet rows set"));
});

module.exports = router;
