// routes/admin.js — admin-only routes (PostgreSQL async edition)
const express = require("express");
const db = require("../db");
const { fail, ok, paged, formatTask, formatUser, hashPassword, generateInviteToken, safeJson } = require("../helpers");
const { requireAuth } = require("../middleware/auth");
const { sendInviteEmail } = require("../config/aws");
const env = require("../config/env");
const { TASK_TYPES, WORKFLOWS, getWorkflow, getAllClientProgressValues } = require("../workflows");
const { initializeSubtasks, advanceToSubtask, getSubtasks, getActivityLog } = require("../workflow-service");
const { enrichTaskWithConfig, mergeConfigUpdate, getConfigSchemaForTaskType } = require("../config-fields");
const { DOCUMENT_CATALOG, normalizeDocumentRequirements } = require("../document-requirements");
const schedule = require("../schedule");

const ADMIN_STATUSES = [
  "On Hold", "Not to Do", "Data not received", "Partial Data received",
  "Data Missing Closed", "Work in Progress", "Query sent to Support team",
  "Query sent to client", "Partial Query received", "Review",
  "Sent for Approval to support team", "Sent for Approval to client",
  "Approval received", "Filed",
];

const router = express.Router();
router.use(requireAuth("admin"));

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

router.get("/clients/:clientId/tasks", async (req, res) => {
  const { rows: [client] } = await db.query(
    "SELECT id FROM users WHERE (id::text=$1 OR slug=$1) AND role='client'",
    [req.params.clientId]
  );
  if (!client) return res.status(404).json(fail("Client not found"));

  const { rows } = await db.query(
    "SELECT * FROM tasks WHERE client_id=$1 ORDER BY created_at DESC",
    [client.id]
  );
  return res.json(ok(rows.map(formatTask), "Client tasks fetched"));
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

  const title = b.title || (wf ? wf.displayName : null);
  if (!title) return res.status(400).json(fail("title is required (or provide a valid workflow taskType)"));

  const metadata = { ...(b.metadata || {}) };
  if (b.documentRequirements) {
    metadata.documentRequirements = normalizeDocumentRequirements(b.documentRequirements);
  }

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
       (client_id, assigned_by, template_id, template_version_id,
        title, description, instructions, task_type, admin_status, metadata, config,
        tax_year, due_date, open_date, priority)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      client.id, req.user.sub,
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

  // If this is a workflow task type, create subtask rows and set initial state
  if (wf) {
    await initializeSubtasks(task.id, taskType);
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
  const planned = schedule.planFilingTasks(config, new Date());

  const { rows: existing } = await db.query(
    "SELECT metadata->>'periodKey' AS pk FROM tasks WHERE client_id=$1 AND metadata->>'periodKey' IS NOT NULL",
    [client.id]
  );
  const have = new Set(existing.map((r) => r.pk));

  const created = [];
  for (const p of planned) {
    if (have.has(p.periodKey)) continue;
    const wf = getWorkflow(p.taskType);
    const metadata = { periodKey: p.periodKey, autoGenerated: true };
    const { rows: [task] } = await db.query(
      `INSERT INTO tasks
         (client_id, assigned_by, title, task_type, admin_status, metadata, config, tax_year, due_date, open_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        client.id, req.user.sub,
        wf ? wf.displayName : p.taskType,
        p.taskType, "Data not received",
        JSON.stringify(metadata),
        JSON.stringify(config),
        p.taxYear, p.dueDate, p.openDate,
      ]
    );
    if (wf) await initializeSubtasks(task.id, p.taskType);
    created.push({ periodKey: p.periodKey, taskType: p.taskType, openDate: p.openDate, dueDate: p.dueDate });
  }

  return res.status(201).json(ok(
    { created, count: created.length, skipped: planned.length - created.length },
    `${created.length} task(s) generated`
  ));
});

router.patch("/tasks/:taskId", async (req, res) => {
  const { rows: [existing] } = await db.query("SELECT * FROM tasks WHERE id=$1", [req.params.taskId]);
  if (!existing) return res.status(404).json(fail("Task not found"));

  const b = req.body;
  if (b.adminStatus && !ADMIN_STATUSES.includes(b.adminStatus)) {
    return res.status(400).json(fail(`Invalid adminStatus`));
  }

  const sets = ["updated_at=NOW()"]; const vals = []; let i = 1;
  const map = {
    adminStatus: "admin_status", title: "title", description: "description",
    status: "status", metadata: "metadata",
  };
  for (const [camel, snake] of Object.entries(map)) {
    if (camel in b) {
      sets.push(`${snake}=$${i++}`);
      vals.push(camel === "metadata" ? JSON.stringify(b[camel]) : b[camel]);
    }
  }
  if ("config" in b) {
    sets.push(`config=$${i++}`);
    vals.push(JSON.stringify(mergeConfigUpdate(
      existing.task_type, safeJson(existing.config, {}), b.config
    )));
  }
  if ("documentRequirements" in b || b.metadata) {
    const curMeta = safeJson(existing.metadata, {});
    const newMeta = { ...curMeta, ...(b.metadata || {}) };
    if ("documentRequirements" in b) {
      newMeta.documentRequirements = normalizeDocumentRequirements(b.documentRequirements);
    }
    sets.push(`metadata=$${i++}`);
    vals.push(JSON.stringify(newMeta));
  }
  vals.push(req.params.taskId);
  const { rows: [updated] } = await db.query(
    `UPDATE tasks SET ${sets.join(",")} WHERE id=$${i} RETURNING *`,
    vals
  );
  return res.json(ok({
    ...formatTask(updated),
    ...enrichTaskWithConfig(updated, safeJson(updated.config, {})),
  }, "Task updated"));
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
