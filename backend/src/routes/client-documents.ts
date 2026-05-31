/**
 * Client-facing OCR / Document Routes — /v3/api/v1/documents
 */
import { Hono } from "hono";
import db from "../../db";
import { fail, ok, genId, nowIso } from "../../helpers";
import { requireAuth } from "../../middleware/auth";
import type { JwtPayload } from "../../middleware/auth";

const documents = new Hono();
documents.use("/*", requireAuth("client"));

// ─── 4.1  POST /documents/upload ─────────────────────────────────────────────
documents.post("/upload", async (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;

  const form = await c.req.formData().catch(() => null);
  const file = form?.get("file") as File | null;
  const category = (form?.get("category") as string) ?? "ocr";
  const filing_id = (form?.get("filing_id") as string) ?? null;

  if (!file) return c.json(fail("file is required"), 400);

  const allowed = ["pdf", "jpg", "jpeg", "png"];
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowed.includes(ext)) {
    return c.json(fail(`Invalid file type. Allowed: ${allowed.join(", ")}`), 400);
  }

  const id = genId("ocr-doc");
  const now = nowIso();
  const name = file.name.replace(/\.[^.]+$/, "");
  const storagePath = `uploads/ocr/${clientId}/${id}_${file.name}`;

  db.run(
    `INSERT INTO documents
       (id, client_id, filing_id, name, original_filename, file_type, file_size,
        section_name, document_type, storage_path, status, ocr_status, uploaded_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, clientId, filing_id, name, file.name, file.type || "application/octet-stream", file.size, null, category, storagePath, "uploaded", "pending", now, now],
  );

  return c.json(
    ok(
      {
        id,
        filing_id,
        name,
        original_filename: file.name,
        file_type: file.type,
        file_size: file.size,
        section_name: null,
        document_type: category,
        status: "uploaded",
        ocr_status: "pending",
        uploaded_at: now,
        created_at: now,
      },
      "Document uploaded for OCR processing",
    ),
    201,
  );
});

// ─── 4.2  GET /documents/ocr-status ──────────────────────────────────────────
documents.get("/ocr-status", (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const idsParam = c.req.query("document_ids") ?? "";
  const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);

  if (ids.length === 0) return c.json(fail("document_ids query param is required"), 400);

  const placeholders = ids.map(() => "?").join(", ");
  const rows = db
    .query(`SELECT id, ocr_status, ocr_processed_at FROM documents WHERE id IN (${placeholders}) AND client_id = ?`)
    .all(...ids, clientId) as Record<string, unknown>[];

  const data = rows.map((r) => ({
    documentId: r.id,
    ocrStatus: r.ocr_status,
    processedAt: r.ocr_processed_at ?? null,
  }));

  return c.json(ok(data, "OCR status fetched"));
});

// ─── 4.3  GET /documents/:document_id/ocr-result ─────────────────────────────
documents.get("/:document_id/ocr-result", (c) => {
  const { sub: clientId } = c.get("jwtPayload") as JwtPayload;
  const row = db
    .query("SELECT * FROM documents WHERE id = ? AND client_id = ?")
    .get(c.req.param("document_id"), clientId) as Record<string, unknown> | undefined;

  if (!row) return c.json(fail("Document not found"), 404);
  if (row.ocr_status !== "completed") {
    return c.json(fail(`OCR is not yet completed. Current status: ${row.ocr_status}`), 400);
  }

  let result: Record<string, unknown> = {};
  try { result = JSON.parse(row.ocr_result as string); } catch { /* empty */ }

  return c.json(
    ok(
      {
        documentId: row.id,
        ocrStatus: row.ocr_status,
        extractedText: result.extractedText ?? "",
        extractedFields: result.extractedFields ?? {},
        confidence: row.ocr_confidence ?? null,
        processedAt: row.ocr_processed_at,
      },
      "OCR result fetched",
    ),
  );
});

export default documents;
