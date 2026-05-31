// routes/client-tasks.js — all 9 client task endpoints
const express = require("express");
const multer = require("multer");
const db = require("../db");
const { fail, ok, paged, formatTask, safeJson, nowIso, genId } = require("../helpers");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
router.use(requireAuth("client"));

// 3.1 GET /tasks
router.get("/", (req, res) => {
  const clientId = req.user.sub;
  const status = req.query.status || "all";
  const page = Math.max(1, Number(req.query.page || 1));
  const per_page = Math.max(1, Number(req.query.per_page || 20));
  const offset = (page - 1) * per_page;

  const where = status === "all" ? "" : "AND status = ?";
  const countArgs = status === "all" ? [clientId] : [clientId, status];
  const listArgs = status === "all" ? [clientId, per_page, offset] : [clientId, status, per_page, offset];

  const rows = db.prepare(`SELECT * FROM tasks WHERE client_id = ? ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...listArgs);
  const { total } = db.prepare(`SELECT COUNT(*) as total FROM tasks WHERE client_id = ? ${where}`).get(...countArgs);

  return res.json(paged(rows.map(formatTask), "Tasks fetched successfully", page, per_page, total));
});

// 3.2 GET /tasks/:task_id
router.get("/:task_id", (req, res) => {
  const row = db.prepare("SELECT * FROM tasks WHERE id=? AND client_id=?").get(req.params.task_id, req.user.sub);
  if (!row) return res.status(404).json(fail("Task not found"));
  return res.json(ok(formatTask(row), "Task fetched"));
});

// 3.3 POST /tasks/:task_id/complete
router.post("/:task_id/complete", (req, res) => {
  const row = db.prepare("SELECT * FROM tasks WHERE id=? AND client_id=?").get(req.params.task_id, req.user.sub);
  if (!row) return res.status(404).json(fail("Task not found"));
  if (row.status === "complete") return res.status(409).json(fail("Task is already completed"));
  const now = nowIso();
  db.prepare("UPDATE tasks SET status='complete',completion_note=?,completed_at=?,updated_at=? WHERE id=?")
    .run(req.body?.completionNote || null, now, now, row.id);
  return res.json(ok({ id: row.id, title: row.title, status: "complete", updatedAt: now }, "Task marked as completed"));
});

// 3.4 GET /tasks/:task_id/query-sheet
router.get("/:task_id/query-sheet", (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id=? AND client_id=?").get(req.params.task_id, req.user.sub);
  if (!task) return res.status(404).json(fail("Task not found"));
  const rows = db.prepare("SELECT * FROM query_sheet_rows WHERE task_id=? ORDER BY row_index ASC").all(task.id);
  const meta = safeJson(task.metadata, {});
  return res.json(ok({
    taskId: task.id, totalRows: rows.length,
    downloadUrl: meta.downloadUrl || null,
    rows: rows.map(r => ({ rowIndex: r.row_index, date: r.date, details: r.details, payment: r.payment, receipt: r.receipt, hst: r.hst, ourRemarks: r.our_remarks, clientRemarks: r.client_remarks || "" })),
  }, "Query sheet data fetched"));
});

// 3.5 POST /tasks/:task_id/query-sheet/upload
router.post("/:task_id/query-sheet/upload", upload.single("file"), (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id=? AND client_id=?").get(req.params.task_id, req.user.sub);
  if (!task) return res.status(404).json(fail("Task not found"));
  if (task.status === "complete") return res.status(409).json(fail("Task already completed"));
  if (!req.file) return res.status(400).json(fail("file is required"));
  const ext = "." + req.file.originalname.split(".").pop()?.toLowerCase();
  if (![".xlsx", ".xls"].includes(ext)) return res.status(400).json(fail("Only .xlsx or .xls accepted"));
  const now = nowIso();
  db.prepare("UPDATE tasks SET status='complete',completed_at=?,updated_at=? WHERE id=?").run(now, now, task.id);
  return res.json(ok({ taskId: task.id, status: "complete", uploadedFileName: req.file.originalname, uploadedAt: now }, "Query sheet uploaded and task completed"));
});

// 3.6 POST /tasks/:task_id/query-sheet/remarks
router.post("/:task_id/query-sheet/remarks", (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id=? AND client_id=?").get(req.params.task_id, req.user.sub);
  if (!task) return res.status(404).json(fail("Task not found"));
  if (task.status === "complete") return res.status(409).json(fail("Task already completed"));
  const { remarks } = req.body;
  if (!Array.isArray(remarks) || remarks.length === 0) return res.status(400).json(fail("remarks array is required"));
  const errors = remarks.filter(r => !r.clientRemarks?.trim()).map(r => ({ field: `remarks[${r.rowIndex}].clientRemarks`, message: "Client remarks cannot be empty" }));
  if (errors.length) return res.status(400).json(fail("All rows must have client remarks", errors));
  const now = nowIso();
  const updateRow = db.prepare("UPDATE query_sheet_rows SET client_remarks=?,updated_at=? WHERE task_id=? AND row_index=?");
  remarks.forEach(r => updateRow.run(r.clientRemarks, now, task.id, r.rowIndex));
  db.prepare("UPDATE tasks SET status='complete',completed_at=?,updated_at=? WHERE id=?").run(now, now, task.id);
  return res.json(ok({ taskId: task.id, status: "complete", totalRemarksSubmitted: remarks.length, submittedAt: now }, "Remarks submitted and task completed"));
});

// 3.7 GET /tasks/:task_id/document-buckets
router.get("/:task_id/document-buckets", (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id=? AND client_id=?").get(req.params.task_id, req.user.sub);
  if (!task) return res.status(404).json(fail("Task not found"));
  const meta = safeJson(task.metadata, {});
  const labels = meta.documentBuckets || [];
  const catMap = { "Business Bank Statements":"business_bank_statements","Business credit card statements":"business_credit_card","Loan Statements":"loan_statements","Line of credit statement":"loc_statement","Purchase/Expense Details":"purchase_expense","Doordash sales report":"doordash_sales","uber sales reports":"uber_sales","Skip sales reports":"skip_sales","Store sales reports":"store_sales","Sales invoices":"sales_invoices","Sales excel sheet":"sales_excel","Others":"others" };
  const required = new Set(["Business Bank Statements","Business credit card statements"]);
  const docs = db.prepare("SELECT * FROM task_documents WHERE task_id=?").all(task.id);
  const buckets = labels.map(label => ({
    label, category: catMap[label] || label.toLowerCase().replace(/\W+/g, "_"), required: required.has(label),
    uploadedFiles: docs.filter(d => d.category === label).map(d => ({ id: d.id, fileName: d.file_name, fileSize: d.file_size, uploadedAt: d.uploaded_at })),
  }));
  return res.json(ok({ taskId: task.id, buckets }, "Document buckets fetched"));
});

// 3.8 POST /tasks/:task_id/documents/upload
router.post("/:task_id/documents/upload", upload.single("file"), (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id=? AND client_id=?").get(req.params.task_id, req.user.sub);
  if (!task) return res.status(404).json(fail("Task not found"));
  if (!req.file) return res.status(400).json(fail("file is required"));
  const category = req.body?.category;
  if (!category) return res.status(400).json(fail("category is required"));
  const allowed = ["pdf","jpg","jpeg","png","xls","xlsx","csv","doc","docx"];
  const ext = req.file.originalname.split(".").pop()?.toLowerCase();
  if (!allowed.includes(ext)) return res.status(400).json(fail(`Invalid file type. Allowed: ${allowed.join(", ")}`));
  const id = genId("doc");
  const now = nowIso();
  db.prepare(`INSERT INTO task_documents (id,task_id,category,file_name,original_filename,file_type,file_size,storage_path,uploaded_at) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(id, task.id, category, req.file.originalname, req.file.originalname, req.file.mimetype, req.file.size, `uploads/${task.id}/${id}`, now);
  return res.status(201).json(ok({ id, taskId: task.id, category, fileName: req.file.originalname, originalFilename: req.file.originalname, fileType: req.file.mimetype, fileSize: req.file.size, status: "uploaded", uploadedAt: now }, "Document uploaded"));
});

// 3.9 POST /tasks/:task_id/documents/submit
router.post("/:task_id/documents/submit", (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id=? AND client_id=?").get(req.params.task_id, req.user.sub);
  if (!task) return res.status(404).json(fail("Task not found"));
  if (task.status === "complete") return res.status(409).json(fail("Task already completed"));
  const { uploadedDocuments } = req.body;
  const allIds = Object.values(uploadedDocuments || {}).flat();
  if (!allIds.length) return res.status(400).json(fail("No documents provided"));
  const now = nowIso();
  db.prepare("UPDATE tasks SET status='complete',completed_at=?,updated_at=? WHERE id=?").run(now, now, task.id);
  return res.json(ok({ taskId: task.id, status: "complete", totalDocuments: allIds.length, submittedAt: now }, "Documents submitted and task completed"));
});

module.exports = router;
