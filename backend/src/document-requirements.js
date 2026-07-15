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

function getDocumentRequirementsFromTask(task) {
  const meta = typeof task.metadata === "string"
    ? JSON.parse(task.metadata || "{}")
    : (task.metadata || {});

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
    return {
      key:      req.key,
      label:    req.label,
      group:    req.group,
      category: req.key,
      quantity: req.quantity,
      required: cat?.required ?? false,
      slots:    buildSlots(req.quantity, docs, req.key),
      uploadedCount: docs.filter((d) => d.category === req.key).length,
      pendingCount:  req.quantity - docs.filter((d) => d.category === req.key).length,
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
  return { ok: true, requirement: req, slotIndex: slot };
}

module.exports = {
  DOCUMENT_CATALOG,
  CATALOG_BY_KEY,
  TASK_TYPES_WITH_DOCUMENTS,
  normalizeDocumentRequirements,
  getDocumentRequirementsFromTask,
  buildDocumentRequirements,
  validateUploadSlot,
};
