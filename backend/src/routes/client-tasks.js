// routes/client-tasks.js — client task endpoints (PostgreSQL async edition)
const express = require("express");
const multer = require("multer");
const db = require("../db");
const { fail, ok, paged, safeJson, isUuid } = require("../helpers");
const { requireAuth } = require("../middleware/auth");
const { buildClientTaskDetails } = require("../task-details-service");
const { enrichTaskWithConfig, mergeConfigUpdate } = require("../config-fields");
const { buildDocumentRequirements, validateUploadSlot } = require("../document-requirements");
const { notifyTaskChange } = require("../notify-task-change");
const { putObject } = require("../config/aws");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
router.use(requireAuth("client"));

// A task only becomes visible to the client once its scheduled open_date
// arrives (or it was never scheduled at all) — no admin approval step needed,
// it just appears on its own the day it opens.
const OPEN_DATE_CLAUSE = "(open_date IS NULL OR open_date <= CURRENT_DATE)";

// Resolve task by UUID or legacy slug (e.g. task-john-onboarding from mobile app)
async function findClientTask(taskIdOrSlug, clientId) {
  if (isUuid(taskIdOrSlug)) {
    const { rows } = await db.query(
      `SELECT * FROM tasks WHERE id=$1 AND client_id=$2 AND ${OPEN_DATE_CLAUSE}`,
      [taskIdOrSlug, clientId]
    );
    return rows[0] || null;
  }
  const { rows } = await db.query(
    `SELECT * FROM tasks WHERE slug=$1 AND client_id=$2 AND ${OPEN_DATE_CLAUSE}`,
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

  const filtered = status !== "all";
  const statusClause = filtered ? "AND status=$2" : "";

  const listSql  = `SELECT * FROM tasks WHERE client_id=$1 AND ${OPEN_DATE_CLAUSE} ${statusClause} ORDER BY created_at DESC LIMIT $${filtered ? 3 : 2} OFFSET $${filtered ? 4 : 3}`;
  const countSql = `SELECT COUNT(*)::int AS total FROM tasks WHERE client_id=$1 AND ${OPEN_DATE_CLAUSE} ${statusClause}`;

  const [{ rows }, { rows: cnt }] = await Promise.all([
    db.query(listSql,  filtered ? [clientId, status, per_page, offset] : [clientId, per_page, offset]),
    db.query(countSql, filtered ? [clientId, status] : [clientId]),
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
  notifyTaskChange(updated, "marked complete");
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
  notifyTaskChange(updated, "completed (query sheet uploaded)");
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

  // When the admin has narrowed the ask to specific outstanding items
  // ("Partial Data received"), tell the client which ones and why — the same
  // information the chaser email carries.
  const meta = safeJson(task.metadata, {});
  const mdr = meta.missingDataRequest || null;
  const outstanding = new Set(mdr?.outstandingKeys || []);
  const annotated = mdr
    ? requirements.map((r) => ({ ...r, outstanding: outstanding.has(r.key) }))
    : requirements;

  return res.json(ok({
    taskId: task.id,
    requirements: annotated,
    buckets: annotated, // backward compat alias
    missingDataRequest: mdr && {
      period: mdr.period ?? null,
      note: mdr.note ?? null,
      outstandingKeys: mdr.outstandingKeys || [],
      requestedAt: mdr.requestedAt ?? null,
    },
    summary: {
      totalSlots,
      uploadedSlots,
      pendingSlots: totalSlots - uploadedSlots,
      complete: uploadedSlots >= totalSlots && totalSlots > 0,
    },
  }, "Document requirements fetched"));
});

// 3.8 POST /v3/api/v1/tasks/:task_id/documents/upload
//
// Accepts either a single `file` (the long-standing mobile-app contract) or a
// multi-select batch under `files`. With a batch and no explicit slotIndex,
// each file lands in the next free slot for that category, so the client can
// pick several documents at once instead of tapping one slot at a time.
router.post(
  "/:task_id/documents/upload",
  upload.fields([{ name: "file", maxCount: 1 }, { name: "files", maxCount: 50 }]),
  async (req, res) => {
    const task = await findClientTask(req.params.task_id, req.user.sub);
    if (!task) return res.status(404).json(fail("Task not found"));

    const files = [...(req.files?.file || []), ...(req.files?.files || [])];
    if (!files.length) return res.status(400).json(fail("file is required"));

    const category = req.body?.category;
    if (!category) return res.status(400).json(fail("category is required"));

    const rawSlot = req.body?.slotIndex ?? req.body?.slot_index;
    const baseCheck = validateUploadSlot(task, category, rawSlot ?? 1);
    if (!baseCheck.ok) return res.status(400).json(fail(baseCheck.message));

    const allowed = baseCheck.acceptedTypes?.length
      ? baseCheck.acceptedTypes
      : ["pdf", "jpg", "jpeg", "png", "xls", "xlsx", "csv", "doc", "docx"];
    for (const f of files) {
      const ext = f.originalname.split(".").pop()?.toLowerCase();
      if (!allowed.includes(ext)) {
        return res.status(400).json(fail(`Invalid file type .${ext} for ${f.originalname}. Allowed: ${allowed.join(", ")}`));
      }
    }

    // Slots to fill: the explicit one for a single targeted upload, otherwise
    // the free slots in order. Running out is a 400, not a silent truncation.
    let targets;
    if (rawSlot !== undefined && files.length === 1) {
      targets = [Number(rawSlot)];
    } else {
      const { rows: taken } = await db.query(
        "SELECT slot_index FROM task_documents WHERE task_id=$1 AND category=$2",
        [task.id, category]
      );
      const used = new Set(taken.map((r) => r.slot_index));
      targets = [];
      for (let s = 1; s <= baseCheck.requirement.quantity && targets.length < files.length; s++) {
        if (!used.has(s)) targets.push(s);
      }
      if (targets.length < files.length) {
        return res.status(400).json(fail(
          `Only ${targets.length} free upload slot(s) left for ${baseCheck.requirement.label} (max ${baseCheck.requirement.quantity})`
        ));
      }
    }

    const uploaded = [];
    for (const [i, file] of files.entries()) {
      const slotIndex = targets[i];
      const s3Key = `uploads/${task.client_id}/${task.id}/${category}_slot${slotIndex}_${Date.now()}_${file.originalname}`;

      // The row used to be written with an s3_key that nothing had ever
      // uploaded to, so every admin-side download of a client's task document
      // 404'd at S3. Store the bytes first; fall back to a null key (local dev
      // with no credentials) rather than recording a key that isn't there.
      let s3KeyFinal = s3Key;
      try {
        await putObject({ key: s3Key, body: file.buffer, contentType: file.mimetype });
      } catch (err) {
        console.error(`S3 upload failed for task ${task.id} (${file.originalname}):`, err.message);
        s3KeyFinal = null;
      }

      const { rows: [doc] } = await db.query(
        `INSERT INTO task_documents
           (task_id, category, slot_index, file_name, original_filename, file_type, file_size, s3_key, storage_path)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)
         ON CONFLICT (task_id, category, slot_index)
         DO UPDATE SET
           file_name=$4, original_filename=$5, file_type=$6, file_size=$7,
           s3_key=$8, storage_path=$8, uploaded_at=NOW()
         RETURNING *`,
        [task.id, category, slotIndex, file.originalname, file.originalname,
         file.mimetype, file.size, s3KeyFinal]
      );

      uploaded.push({
        id:         doc.id,
        taskId:     task.id,
        category,
        slotIndex,
        fileName:   file.originalname,
        fileType:   file.mimetype,
        fileSize:   file.size,
        status:     "uploaded",
        uploadedAt: doc.uploaded_at,
      });
    }

    // Single-file callers (the mobile app today) still get the bare object
    // they already parse; batches get the array under `documents`.
    return res.status(201).json(ok(
      uploaded.length === 1 ? { ...uploaded[0], documents: uploaded } : { documents: uploaded },
      uploaded.length === 1 ? "Document uploaded" : `${uploaded.length} documents uploaded`
    ));
  }
);

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
  notifyTaskChange(updated, "submitted");

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
  notifyTaskChange(updated, "completed (documents submitted)");
  return res.json(ok({
    taskId:         task.id,
    status:         "complete",
    totalDocuments: allIds.length,
    submittedAt:    updated.updated_at,
  }, "Documents submitted and task completed"));
});

module.exports = router;
