// document-requirements.js — document catalog + quantity-based slot builder
const db = require("./db");

const DOCUMENT_CATALOG = [
  { key: "business_bank_statements",  label: "Business bank statements",       group: null,    required: true },
  { key: "business_credit_card",      label: "Business credit card statements", group: null,    required: true },
  { key: "loan_statements",           label: "Loan statements",                 group: null },
  { key: "loc_statement",             label: "Line of credit statement",        group: null },
  { key: "purchase_expense",          label: "Purchase/expense details",        group: null },
  { key: "doordash_sales",            label: "Doordash sales reports",          group: "sales" },
  { key: "uber_sales",                label: "Uber sales reports",              group: "sales" },
  { key: "skip_sales",                label: "Skip sales reports",              group: "sales" },
  { key: "store_sales",               label: "Store sales reports",             group: "sales" },
  { key: "sales_invoices",            label: "Sales invoices",                  group: "sales" },
  { key: "sales_excel",               label: "Sales excel sheet",               group: "sales" },
  { key: "others",                    label: "Others",                          group: null },
];

const CATALOG_BY_KEY = Object.fromEntries(DOCUMENT_CATALOG.map((d) => [d.key, d]));

// Legacy label → key map (seed data compatibility)
const LEGACY_LABEL_MAP = {
  "Business Bank Statements":        "business_bank_statements",
  "Business credit card statements": "business_credit_card",
  "Loan Statements":                 "loan_statements",
  "Line of credit statement":        "loc_statement",
  "Purchase/Expense Details":        "purchase_expense",
  "Doordash sales report":           "doordash_sales",
  "uber sales reports":              "uber_sales",
  "Skip sales reports":              "skip_sales",
  "Store sales reports":             "store_sales",
  "Sales invoices":                  "sales_invoices",
  "Sales excel sheet":               "sales_excel",
  "Others":                          "others",
};

const TASK_TYPES_WITH_DOCUMENTS = new Set([
  "CORPORATE_TAX_RETURN", "HST", "BOOKKEEPING", "basic_docs_upload",
]);

function normalizeDocumentRequirements(input, metadata = {}) {
  if (Array.isArray(input) && input.length) {
    return input
      .filter((r) => r?.key && CATALOG_BY_KEY[r.key])
      .map((r) => ({
        key:      r.key,
        label:    CATALOG_BY_KEY[r.key].label,
        quantity: Math.max(0, Math.min(50, Number(r.quantity) || 0)),
        group:    CATALOG_BY_KEY[r.key].group ?? null,
      }))
      .filter((r) => r.quantity > 0);
  }

  // Legacy: documentBuckets string array → quantity 1 each
  const legacy = metadata.documentBuckets || [];
  if (!legacy.length) return [];

  return legacy
    .map((label) => {
      const key = LEGACY_LABEL_MAP[label] || label.toLowerCase().replace(/\W+/g, "_");
      const cat = CATALOG_BY_KEY[key];
      return cat ? { key, label: cat.label, quantity: 1, group: cat.group ?? null } : null;
    })
    .filter(Boolean);
}

// ── Per-task document requests (metadata.documentRequests) ──────────────────
//
// The catalog-based `documentRequirements` above only answers "how many of
// this fixed type?". The admin task panel needs the richer per-request fields
// the General Documentation editor already has — a free-text name, a
// placeholder, its own accepted file types and notes — plus the ability to ask
// for the SAME kind of document more than once ("Business bank statement
// ...0010" and "...0547" as two separate requests). That needs a free-form
// key, so these are stored per task in metadata.documentRequests and shaped
// exactly like general_doc_configs.fields.
//
// Both representations resolve to one slot-based structure (buildSlots below),
// which is what the Flutter app already consumes — a task configured either
// way looks identical to the client.

const REQUEST_FILE_TYPES = ["pdf", "jpg", "jpeg", "png", "xls", "xlsx", "doc", "docx", "csv"];

function slugifyRequestKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

// Normalizes the editor's rows and guarantees unique keys, so adding the same
// document type twice produces two independent requests (…, …_2) rather than
// one silently overwriting the other's uploads.
function normalizeDocumentRequests(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const out = [];
  for (const [idx, raw] of input.entries()) {
    if (!raw || typeof raw !== "object") continue;
    const name = String(raw.name || "").trim();
    let key = slugifyRequestKey(raw.key) || slugifyRequestKey(name);
    if (!key) continue;
    if (seen.has(key)) {
      let n = 2;
      while (seen.has(`${key}_${n}`)) n++;
      key = `${key}_${n}`;
    }
    seen.add(key);
    const accepted = Array.isArray(raw.acceptedTypes)
      ? raw.acceptedTypes.map((t) => String(t).toLowerCase()).filter((t) => REQUEST_FILE_TYPES.includes(t))
      : [];
    out.push({
      key,
      name:          name || key,
      placeholder:   String(raw.placeholder || "").trim(),
      required:      raw.required === true,
      maxCount:      Math.max(1, Math.min(50, Number(raw.maxCount) || 1)),
      acceptedTypes: accepted.length ? [...new Set(accepted)] : REQUEST_FILE_TYPES,
      notes:         String(raw.notes || "").trim(),
      displayOrder:  typeof raw.displayOrder === "number" ? raw.displayOrder : idx + 1,
    });
  }
  return out.sort((a, b) => a.displayOrder - b.displayOrder);
}

function taskMetadata(task) {
  return typeof task.metadata === "string"
    ? JSON.parse(task.metadata || "{}")
    : (task.metadata || {});
}

function getDocumentRequirementsFromTask(task) {
  const meta = taskMetadata(task);

  // The richer per-task requests win when configured; the catalog form stays
  // the fallback so tasks created before this feature keep working untouched.
  const requests = normalizeDocumentRequests(meta.documentRequests);
  if (requests.length) {
    return requests.map((r) => ({
      key:      r.key,
      label:    r.name,
      quantity: r.maxCount,
      group:    null,
      request:  r,
    }));
  }

  if (Array.isArray(meta.documentRequirements) && meta.documentRequirements.length) {
    return normalizeDocumentRequirements(meta.documentRequirements);
  }
  return normalizeDocumentRequirements(null, meta);
}

function buildSlots(quantity, docs, categoryKey) {
  const bySlot = {};
  for (const d of docs.filter((doc) => doc.category === categoryKey)) {
    bySlot[d.slot_index || 1] = {
      id:         d.id,
      fileName:   d.file_name,
      fileSize:   d.file_size,
      fileType:   d.file_type ?? null,
      uploadedAt: d.uploaded_at,
    };
  }

  return Array.from({ length: quantity }, (_, i) => {
    const slotIndex = i + 1;
    return {
      slotIndex,
      label:        `Upload ${slotIndex} of ${quantity}`,
      uploadedFile: bySlot[slotIndex] || null,
      status:       bySlot[slotIndex] ? "uploaded" : "pending",
    };
  });
}

async function buildDocumentRequirements(task) {
  const requirements = getDocumentRequirementsFromTask(task);
  if (!requirements.length) return [];

  const { rows: docs } = await db.query(
    "SELECT id, category, slot_index, file_name, file_type, file_size, uploaded_at FROM task_documents WHERE task_id=$1",
    [task.id]
  );

  return requirements.map((req) => {
    const cat = CATALOG_BY_KEY[req.key];
    const uploaded = docs.filter((d) => d.category === req.key).length;
    return {
      key:      req.key,
      label:    req.label,
      group:    req.group,
      category: req.key,
      quantity: req.quantity,
      required: req.request ? req.request.required : (cat?.required ?? false),
      // Only present for metadata.documentRequests-configured tasks — the
      // Flutter app ignores unknown keys, and uses them when it has them.
      placeholder:   req.request?.placeholder ?? null,
      acceptedTypes: req.request?.acceptedTypes ?? null,
      notes:         req.request?.notes ?? null,
      slots:    buildSlots(req.quantity, docs, req.key),
      uploadedCount: uploaded,
      pendingCount:  Math.max(0, req.quantity - uploaded),
    };
  });
}

function validateUploadSlot(task, categoryKey, slotIndex) {
  const requirements = getDocumentRequirementsFromTask(task);
  const req = requirements.find((r) => r.key === categoryKey);
  if (!req) return { ok: false, message: `Unknown document category: ${categoryKey}` };

  const slot = Number(slotIndex);
  if (!slot || slot < 1 || slot > req.quantity) {
    return { ok: false, message: `slotIndex must be between 1 and ${req.quantity} for ${req.label}` };
  }
  return { ok: true, requirement: req, slotIndex: slot, acceptedTypes: req.request?.acceptedTypes ?? null };
}

module.exports = {
  DOCUMENT_CATALOG,
  CATALOG_BY_KEY,
  TASK_TYPES_WITH_DOCUMENTS,
  REQUEST_FILE_TYPES,
  normalizeDocumentRequirements,
  normalizeDocumentRequests,
  getDocumentRequirementsFromTask,
  buildDocumentRequirements,
  validateUploadSlot,
};
