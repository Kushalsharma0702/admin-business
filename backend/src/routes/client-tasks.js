// routes/client-tasks.js — client task endpoints (PostgreSQL async edition)
const express = require("express");
const multer = require("multer");
const db = require("../db");
const { fail, ok, paged, safeJson, isUuid } = require("../helpers");
const { requireAuth } = require("../middleware/auth");
const { buildClientTaskDetails } = require("../task-details-service");
const { enrichTaskWithConfig, mergeConfigUpdate } = require("../config-fields");
const { buildDocumentRequirements, validateUploadSlot } = require("../document-requirements");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
router.use(requireAuth("client"));

// Resolve task by UUID or legacy slug (e.g. task-john-onboarding from mobile app)
async function findClientTask(taskIdOrSlug, clientId) {
  if (isUuid(taskIdOrSlug)) {
    const { rows } = await db.query(
      "SELECT * FROM tasks WHERE id=$1 AND client_id=$2",
      [taskIdOrSlug, clientId]
    );
    return rows[0] || null;
  }
  const { rows } = await db.query(
    "SELECT * FROM tasks WHERE slug=$1 AND client_id=$2",
    [taskIdOrSlug, clientId]
  );
  return rows[0] || null;
}

// Client-safe formatter — hides internal admin details, exposes clientProgress
function formatClientTask(row) {
  if (!row) return null;
  return {
    id:              row.id,
    taskType:        row.task_type ?? null,
    taskName:        row.title,
    clientProgress:  row.client_progress ?? null,
    dueDate:         row.due_date ?? null,
    openDate:        row.open_date ?? null,
    taxYear:         row.tax_year ?? null,
    status:          row.status,
    description:     row.description ?? null,
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
  };
}

// 3.1 GET /v3/api/v1/tasks — simplified client view
router.get("/", async (req, res) => {
  const clientId = req.user.sub;
  const status   = req.query.status || "all";
  const page     = Math.max(1, Number(req.query.page     || 1));
  const per_page = Math.max(1, Number(req.query.per_page || 20));
  const offset   = (page - 1) * per_page;

  const statusClause = status === "all" ? "" : "AND status=$3";

  const listSql  = `SELECT * FROM tasks WHERE client_id=$1 ${statusClause} ORDER BY created_at DESC LIMIT $${status === "all" ? 2 : 4} OFFSET $${status === "all" ? 3 : 5}`;
  const countSql = `SELECT COUNT(*)::int AS total FROM tasks WHERE client_id=$1 ${statusClause}`;

  const [{ rows }, { rows: cnt }] = await Promise.all([
    db.query(listSql,  status === "all" ? [clientId, per_page, offset] : [clientId, status, per_page, offset]),
    db.query(countSql, status === "all" ? [clientId] : [clientId, status]),
  ]);

  return res.json(paged(rows.map(formatClientTask), "Tasks fetched successfully", page, per_page, cnt[0].total));
});

// 3.2 GET /v3/api/v1/tasks/:task_id/details — full client task payload (subtasks + fields)
router.get("/:task_id/details", async (req, res) => {
  const task = await findClientTask(req.params.task_id, req.user.sub);
  if (!task) return res.status(404).json(fail("Task not found"));

  const details = await buildClientTaskDetails(task, req.user.sub);
  return res.json(ok(details, "Task details fetched"));
});

// 3.3 PATCH /v3/api/v1/tasks/:task_id/config — save task config (payroll fields, etc.)
router.patch("/:task_id/config", async (req, res) => {
  const task = await findClientTask(req.params.task_id, req.user.sub);
  if (!task) return res.status(404).json(fail("Task not found"));
  if (task.status === "complete") return res.status(409).json(fail("Task already completed"));

  const patch = req.body?.config ?? req.body;
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return res.status(400).json(fail("config object is required"));
  }

  const merged = mergeConfigUpdate(task.task_type, safeJson(task.config, {}), patch);
  const { rows: [updated] } = await db.query(
    "UPDATE tasks SET config=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
    [JSON.stringify(merged), task.id]
  );

  const enriched = enrichTaskWithConfig(updated, merged);
  return res.json(ok({
    taskId:       updated.id,
    config:       enriched.config,
    configSchema: enriched.configSchema,
    updatedAt:    updated.updated_at,
  }, "Task config saved"));
});

// 3.4 GET /v3/api/v1/tasks/:task_id — simplified client view
router.get("/:task_id", async (req, res) => {
  const row = await findClientTask(req.params.task_id, req.user.sub);
  if (!row) return res.status(404).json(fail("Task not found"));
  return res.json(ok(formatClientTask(row), "Task fetched"));
});

// 3.3 POST /v3/api/v1/tasks/:task_id/complete
router.post("/:task_id/complete", async (req, res) => {
  const row = await findClientTask(req.params.task_id, req.user.sub);
  if (!row) return res.status(404).json(fail("Task not found"));
  if (row.status === "complete") return res.status(409).json(fail("Task is already completed"));

  const { rows: [updated] } = await db.query(
    "UPDATE tasks SET status='complete', completion_note=$1, completed_at=NOW(), updated_at=NOW() WHERE id=$2 RETURNING *",
    [req.body?.completionNote || null, row.id]
  );
  return res.json(ok({ id: updated.id, title: updated.title, status: "complete", updatedAt: updated.updated_at }, "Task marked as completed"));
});

// 3.4 GET /v3/api/v1/tasks/:task_id/query-sheet
router.get("/:task_id/query-sheet", async (req, res) => {
  const task = await findClientTask(req.params.task_id, req.user.sub);
  if (!task) return res.status(404).json(fail("Task not found"));

  const { rows } = await db.query(
    "SELECT * FROM query_sheet_rows WHERE task_id=$1 ORDER BY row_index ASC",
    [task.id]
  );
  const meta = safeJson(task.metadata, {});

  return res.json(ok({
    taskId:      task.id,
    totalRows:   rows.length,
    downloadUrl: meta.downloadUrl || null,
    rows: rows.map((r) => ({
      rowIndex:      r.row_index,
      date:          r.date,
      details:       r.details,
      payment:       r.payment,
      receipt:       r.receipt,
      hst:           r.hst,
      ourRemarks:    r.our_remarks,
      clientRemarks: r.client_remarks || "",
    })),
  }, "Query sheet data fetched"));
});

// 3.5 POST /v3/api/v1/tasks/:task_id/query-sheet/upload
router.post("/:task_id/query-sheet/upload", upload.single("file"), async (req, res) => {
  const task = await findClientTask(req.params.task_id, req.user.sub);
  if (!task)                       return res.status(404).json(fail("Task not found"));
  if (task.status === "complete")  return res.status(409).json(fail("Task already completed"));
  if (!req.file)                   return res.status(400).json(fail("file is required"));

  const ext = "." + req.file.originalname.split(".").pop()?.toLowerCase();
  if (![".xlsx", ".xls"].includes(ext)) return res.status(400).json(fail("Only .xlsx or .xls accepted"));

  const { rows: [updated] } = await db.query(
    "UPDATE tasks SET status='complete', completed_at=NOW(), updated_at=NOW() WHERE id=$1 RETURNING *",
    [task.id]
  );
  return res.json(ok({
    taskId:           task.id,
    status:           "complete",
    uploadedFileName: req.file.originalname,
    uploadedAt:       updated.updated_at,
  }, "Query sheet uploaded and task completed"));
});

// 3.6 POST /v3/api/v1/tasks/:task_id/query-sheet/remarks
router.post("/:task_id/query-sheet/remarks", async (req, res) => {
  const task = await findClientTask(req.params.task_id, req.user.sub);
  if (!task)                      return res.status(404).json(fail("Task not found"));
  if (task.status === "complete") return res.status(409).json(fail("Task already completed"));

  const { remarks } = req.body;
  if (!Array.isArray(remarks) || !remarks.length) {
    return res.status(400).json(fail("remarks array is required"));
  }
  const errors = remarks.filter((r) => !r.clientRemarks?.trim())
    .map((r) => ({ field: `remarks[${r.rowIndex}].clientRemarks`, message: "Client remarks cannot be empty" }));
  if (errors.length) return res.status(400).json(fail("All rows must have client remarks", errors));

  for (const r of remarks) {
    await db.query(
      "UPDATE query_sheet_rows SET client_remarks=$1, updated_at=NOW() WHERE task_id=$2 AND row_index=$3",
      [r.clientRemarks, task.id, r.rowIndex]
    );
  }
  await db.query(
    "UPDATE tasks SET status='complete', completed_at=NOW(), updated_at=NOW() WHERE id=$1",
    [task.id]
  );
  return res.json(ok({
    taskId:                task.id,
    status:                "complete",
    totalRemarksSubmitted: remarks.length,
    submittedAt:           new Date().toISOString(),
  }, "Remarks submitted and task completed"));
});

// 3.7 GET /v3/api/v1/tasks/:task_id/document-buckets
router.get("/:task_id/document-buckets", async (req, res) => {
  const task = await findClientTask(req.params.task_id, req.user.sub);
  if (!task) return res.status(404).json(fail("Task not found"));

  const requirements = await buildDocumentRequirements(task);
  const totalSlots = requirements.reduce((n, r) => n + r.quantity, 0);
  const uploadedSlots = requirements.reduce((n, r) => n + r.uploadedCount, 0);

  return res.json(ok({
    taskId: task.id,
    requirements,
    buckets: requirements, // backward compat alias
    summary: {
      totalSlots,
      uploadedSlots,
      pendingSlots: totalSlots - uploadedSlots,
      complete: uploadedSlots >= totalSlots && totalSlots > 0,
    },
  }, "Document requirements fetched"));
});

// 3.8 POST /v3/api/v1/tasks/:task_id/documents/upload
router.post("/:task_id/documents/upload", upload.single("file"), async (req, res) => {
  const task = await findClientTask(req.params.task_id, req.user.sub);
  if (!task)   return res.status(404).json(fail("Task not found"));
  if (!req.file) return res.status(400).json(fail("file is required"));

  const category  = req.body?.category;
  const slotIndex = Number(req.body?.slotIndex ?? req.body?.slot_index ?? 1);
  if (!category) return res.status(400).json(fail("category is required"));

  const slotCheck = validateUploadSlot(task, category, slotIndex);
  if (!slotCheck.ok) return res.status(400).json(fail(slotCheck.message));

  const allowed = ["pdf","jpg","jpeg","png","xls","xlsx","csv","doc","docx"];
  const ext = req.file.originalname.split(".").pop()?.toLowerCase();
  if (!allowed.includes(ext)) return res.status(400).json(fail(`Invalid file type. Allowed: ${allowed.join(", ")}`));

  const s3Key = `uploads/${task.client_id}/${task.id}/${category}_slot${slotIndex}_${Date.now()}_${req.file.originalname}`;

  const { rows: [doc] } = await db.query(
    `INSERT INTO task_documents
       (task_id, category, slot_index, file_name, original_filename, file_type, file_size, s3_key, storage_path)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)
     ON CONFLICT (task_id, category, slot_index)
     DO UPDATE SET
       file_name=$4, original_filename=$5, file_type=$6, file_size=$7,
       s3_key=$8, storage_path=$8, uploaded_at=NOW()
     RETURNING *`,
    [task.id, category, slotIndex, req.file.originalname, req.file.originalname,
     req.file.mimetype, req.file.size, s3Key]
  );

  return res.status(201).json(ok({
    id:               doc.id,
    taskId:           task.id,
    category,
    slotIndex,
    fileName:         req.file.originalname,
    fileType:         req.file.mimetype,
    fileSize:         req.file.size,
    status:           "uploaded",
    uploadedAt:       doc.uploaded_at,
  }, "Document uploaded"));
});

// 3.8b PATCH /v3/api/v1/tasks/:task_id/draft — save partial form response without submitting
router.patch("/:task_id/draft", async (req, res) => {
  const task = await findClientTask(req.params.task_id, req.user.sub);
  if (!task) return res.status(404).json(fail("Task not found"));
  if (task.status === "complete") return res.status(409).json(fail("Task already completed"));

  const { formData } = req.body;
  if (!formData || typeof formData !== "object") {
    return res.status(400).json(fail("formData object is required"));
  }

  const { rows: [updated] } = await db.query(
    "UPDATE tasks SET draft_data=$1, status='draft', updated_at=NOW() WHERE id=$2 RETURNING *",
    [JSON.stringify(formData), task.id]
  );
  return res.json(ok({
    taskId:    updated.id,
    status:    updated.status,
    draftData: updated.draft_data,
    savedAt:   updated.updated_at,
  }, "Draft saved"));
});

// 3.8c POST /v3/api/v1/tasks/:task_id/submit-form — final submit of custom task form
router.post("/:task_id/submit-form", async (req, res) => {
  const task = await findClientTask(req.params.task_id, req.user.sub);
  if (!task) return res.status(404).json(fail("Task not found"));
  if (task.status === "complete") return res.status(409).json(fail("Task already completed"));

  const { formData } = req.body;
  if (!formData || typeof formData !== "object") {
    return res.status(400).json(fail("formData object is required"));
  }

  const merged = mergeConfigUpdate(task.task_type, safeJson(task.config, {}), formData);
  const { rows: [updated] } = await db.query(
    `UPDATE tasks
     SET config=$1, draft_data=NULL, status='complete', completed_at=NOW(), updated_at=NOW()
     WHERE id=$2 RETURNING *`,
    [JSON.stringify(merged), task.id]
  );

  return res.json(ok({
    taskId:      updated.id,
    status:      "complete",
    submittedAt: updated.completed_at,
  }, "Task form submitted successfully"));
});

// 3.9 POST /v3/api/v1/tasks/:task_id/documents/submit
router.post("/:task_id/documents/submit", async (req, res) => {
  const task = await findClientTask(req.params.task_id, req.user.sub);
  if (!task)                      return res.status(404).json(fail("Task not found"));
  if (task.status === "complete") return res.status(409).json(fail("Task already completed"));

  const { uploadedDocuments } = req.body;
  const allIds = Object.values(uploadedDocuments || {}).flat();
  if (!allIds.length) return res.status(400).json(fail("No documents provided"));

  const { rows: [updated] } = await db.query(
    "UPDATE tasks SET status='complete', completed_at=NOW(), updated_at=NOW() WHERE id=$1 RETURNING *",
    [task.id]
  );
  return res.json(ok({
    taskId:         task.id,
    status:         "complete",
    totalDocuments: allIds.length,
    submittedAt:    updated.updated_at,
  }, "Documents submitted and task completed"));
});

module.exports = router;
