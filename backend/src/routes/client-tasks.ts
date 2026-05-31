/**
 * Client-facing Task Routes — /v3/api/v1/tasks
 *
 * All 9 task endpoints + query-sheet + document-bucket endpoints.
 * Auth: requires valid client JWT.
 */
import { Hono } from "hono";
import db from "../../db";
import { fail, ok, paged, formatTask, safeJson, nowIso, genId } from "../../helpers";
import { requireAuth } from "../../middleware/auth";
import type { JwtPayload } from "../../middleware/auth";

const tasks = new Hono();
tasks.use("/*", requireAuth("client"));

// ─── 3.1  GET /tasks ──────────────────────────────────────────────────────────
tasks.get("/", (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const status = c.req.query("status") ?? "all";
  const page = Math.max(1, Number(c.req.query("page") ?? 1));
  const per_page = Math.max(1, Number(c.req.query("per_page") ?? 20));
  const offset = (page - 1) * per_page;

  const where = status === "all" ? "" : "AND status = ?";
  const args = status === "all" ? [clientId, per_page, offset] : [clientId, status, per_page, offset];

  const rows = db
    .query(`SELECT * FROM tasks WHERE client_id = ? ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...args) as Record<string, unknown>[];

  const { total } = db
    .query(`SELECT COUNT(*) as total FROM tasks WHERE client_id = ? ${where}`)
    .get(...(status === "all" ? [clientId] : [clientId, status])) as { total: number };

  return c.json(paged(rows.map(formatTask), "Tasks fetched successfully", page, per_page, total));
});

// ─── 3.2  GET /tasks/:task_id ────────────────────────────────────────────────
tasks.get("/:task_id", (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const row = db
    .query("SELECT * FROM tasks WHERE id = ? AND client_id = ?")
    .get(c.req.param("task_id"), clientId) as Record<string, unknown> | undefined;

  if (!row) return c.json(fail("Task not found"), 404);
  return c.json(ok(formatTask(row), "Task fetched"));
});

// ─── 3.3  POST /tasks/:task_id/complete ──────────────────────────────────────
tasks.post("/:task_id/complete", async (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const row = db
    .query("SELECT * FROM tasks WHERE id = ? AND client_id = ?")
    .get(c.req.param("task_id"), clientId) as Record<string, unknown> | undefined;

  if (!row) return c.json(fail("Task not found"), 404);
  if (row.status === "complete") return c.json(fail("Task is already completed"), 409);

  const body = await c.req.json<{ completionNote?: string }>().catch(() => ({}));
  const now = nowIso();

  db.run(
    "UPDATE tasks SET status = 'complete', completion_note = ?, completed_at = ?, updated_at = ? WHERE id = ?",
    [body.completionNote ?? null, now, now, row.id as string],
  );

  return c.json(ok({ id: row.id, title: row.title, status: "complete", updatedAt: now }, "Task marked as completed"));
});

// ─── 3.4  GET /tasks/:task_id/query-sheet ────────────────────────────────────
tasks.get("/:task_id/query-sheet", (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const task = db
    .query("SELECT * FROM tasks WHERE id = ? AND client_id = ?")
    .get(c.req.param("task_id"), clientId) as Record<string, unknown> | undefined;

  if (!task) return c.json(fail("Task not found"), 404);

  const rows = db
    .query("SELECT * FROM query_sheet_rows WHERE task_id = ? ORDER BY row_index ASC")
    .all(task.id as string) as Record<string, unknown>[];

  const meta = safeJson(task.metadata as string, {} as Record<string, unknown>);

  return c.json(
    ok(
      {
        taskId: task.id,
        totalRows: rows.length,
        downloadUrl: (meta as Record<string, unknown>).downloadUrl ?? null,
        rows: rows.map((r) => ({
          rowIndex: r.row_index,
          date: r.date,
          details: r.details,
          payment: r.payment,
          receipt: r.receipt,
          hst: r.hst,
          ourRemarks: r.our_remarks,
          clientRemarks: r.client_remarks ?? "",
        })),
      },
      "Query sheet data fetched",
    ),
  );
});

// ─── 3.5  POST /tasks/:task_id/query-sheet/upload ────────────────────────────
tasks.post("/:task_id/query-sheet/upload", async (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const task = db
    .query("SELECT * FROM tasks WHERE id = ? AND client_id = ?")
    .get(c.req.param("task_id"), clientId) as Record<string, unknown> | undefined;

  if (!task) return c.json(fail("Task not found"), 404);
  if (task.status === "complete") return c.json(fail("Task already completed"), 409);

  const form = await c.req.formData().catch(() => null);
  const file = form?.get("file") as File | null;
  if (!file) return c.json(fail("file is required"), 400);

  const allowed = [".xlsx", ".xls"];
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!allowed.includes(ext)) return c.json(fail("Only .xlsx or .xls files accepted"), 400);

  const now = nowIso();
  db.run("UPDATE tasks SET status = 'complete', completed_at = ?, updated_at = ? WHERE id = ?", [now, now, task.id as string]);

  return c.json(
    ok({ taskId: task.id, status: "complete", uploadedFileName: file.name, uploadedAt: now }, "Query sheet uploaded and task completed"),
  );
});

// ─── 3.6  POST /tasks/:task_id/query-sheet/remarks ───────────────────────────
tasks.post("/:task_id/query-sheet/remarks", async (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const task = db
    .query("SELECT * FROM tasks WHERE id = ? AND client_id = ?")
    .get(c.req.param("task_id"), clientId) as Record<string, unknown> | undefined;

  if (!task) return c.json(fail("Task not found"), 404);
  if (task.status === "complete") return c.json(fail("Task already completed"), 409);

  const { remarks } = await c.req.json<{ remarks: { rowIndex: number; clientRemarks: string }[] }>();
  if (!Array.isArray(remarks) || remarks.length === 0) {
    return c.json(fail("remarks array is required"), 400);
  }

  // Validate all rows have non-empty clientRemarks
  const errors = remarks
    .filter((r) => !r.clientRemarks?.trim())
    .map((r) => ({ field: `remarks[${r.rowIndex}].clientRemarks`, message: "Client remarks cannot be empty" }));
  if (errors.length > 0) {
    return c.json(fail("All rows must have client remarks", errors), 400);
  }

  const now = nowIso();
  for (const r of remarks) {
    db.run(
      "UPDATE query_sheet_rows SET client_remarks = ?, updated_at = ? WHERE task_id = ? AND row_index = ?",
      [r.clientRemarks, now, task.id as string, r.rowIndex],
    );
  }

  db.run("UPDATE tasks SET status = 'complete', completed_at = ?, updated_at = ? WHERE id = ?", [now, now, task.id as string]);

  return c.json(
    ok({ taskId: task.id, status: "complete", totalRemarksSubmitted: remarks.length, submittedAt: now }, "Remarks submitted and task completed"),
  );
});

// ─── 3.7  GET /tasks/:task_id/document-buckets ───────────────────────────────
tasks.get("/:task_id/document-buckets", (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const task = db
    .query("SELECT * FROM tasks WHERE id = ? AND client_id = ?")
    .get(c.req.param("task_id"), clientId) as Record<string, unknown> | undefined;

  if (!task) return c.json(fail("Task not found"), 404);

  const meta = safeJson(task.metadata as string, {} as { documentBuckets?: string[] });
  const bucketLabels: string[] = (meta as { documentBuckets?: string[] }).documentBuckets ?? [];

  const categoryMap: Record<string, string> = {
    "Business Bank Statements": "business_bank_statements",
    "Business credit card statements": "business_credit_card",
    "Loan Statements": "loan_statements",
    "Line of credit statement": "loc_statement",
    "Purchase/Expense Details": "purchase_expense",
    "Doordash sales report": "doordash_sales",
    "uber sales reports": "uber_sales",
    "Skip sales reports": "skip_sales",
    "Store sales reports": "store_sales",
    "Sales invoices": "sales_invoices",
    "Sales excel sheet": "sales_excel",
    Others: "others",
  };

  const requiredBuckets = new Set(["Business Bank Statements", "Business credit card statements"]);

  const uploadedDocs = db
    .query("SELECT * FROM task_documents WHERE task_id = ?")
    .all(task.id as string) as Record<string, unknown>[];

  const buckets = bucketLabels.map((label) => ({
    label,
    category: categoryMap[label] ?? label.toLowerCase().replace(/\W+/g, "_"),
    required: requiredBuckets.has(label),
    uploadedFiles: uploadedDocs
      .filter((d) => d.category === label)
      .map((d) => ({ id: d.id, fileName: d.file_name, fileSize: d.file_size, uploadedAt: d.uploaded_at })),
  }));

  return c.json(ok({ taskId: task.id, buckets }, "Document buckets fetched"));
});

// ─── 3.8  POST /tasks/:task_id/documents/upload ──────────────────────────────
tasks.post("/:task_id/documents/upload", async (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const task = db
    .query("SELECT * FROM tasks WHERE id = ? AND client_id = ?")
    .get(c.req.param("task_id"), clientId) as Record<string, unknown> | undefined;

  if (!task) return c.json(fail("Task not found"), 404);

  const form = await c.req.formData().catch(() => null);
  const file = form?.get("file") as File | null;
  const category = form?.get("category") as string | null;

  if (!file) return c.json(fail("file is required"), 400);
  if (!category) return c.json(fail("category is required"), 400);

  const allowed = ["pdf", "jpg", "jpeg", "png", "xls", "xlsx", "csv", "doc", "docx"];
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowed.includes(ext)) {
    return c.json(fail(`Invalid file type. Allowed: ${allowed.join(", ")}`), 400);
  }

  const id = genId("doc");
  const now = nowIso();
  const storagePath = `uploads/tasks/${task.id}/${category}/${id}_${file.name}`;

  db.run(
    `INSERT INTO task_documents (id, task_id, category, file_name, original_filename, file_type, file_size, storage_path, uploaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, task.id as string, category, file.name, file.name, file.type || "application/octet-stream", file.size, storagePath, now],
  );

  return c.json(
    ok(
      { id, taskId: task.id, category, fileName: file.name, originalFilename: file.name, fileType: file.type, fileSize: file.size, status: "uploaded", uploadedAt: now },
      "Document uploaded",
    ),
    201,
  );
});

// ─── 3.9  POST /tasks/:task_id/documents/submit ──────────────────────────────
tasks.post("/:task_id/documents/submit", async (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const task = db
    .query("SELECT * FROM tasks WHERE id = ? AND client_id = ?")
    .get(c.req.param("task_id"), clientId) as Record<string, unknown> | undefined;

  if (!task) return c.json(fail("Task not found"), 404);
  if (task.status === "complete") return c.json(fail("Task already completed"), 409);

  const { uploadedDocuments } = await c.req.json<{ uploadedDocuments: Record<string, string[]> }>();
  const allDocIds = Object.values(uploadedDocuments ?? {}).flat();
  if (allDocIds.length === 0) return c.json(fail("No documents provided"), 400);

  const now = nowIso();
  db.run("UPDATE tasks SET status = 'complete', completed_at = ?, updated_at = ? WHERE id = ?", [now, now, task.id as string]);

  return c.json(
    ok({ taskId: task.id, status: "complete", totalDocuments: allDocIds.length, submittedAt: now }, "Documents submitted and task completed"),
  );
});

export default tasks;
