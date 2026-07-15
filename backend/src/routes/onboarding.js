// routes/onboarding.js — T2 On-Boarding Details form: admin view + client submit.
//
// The field schema is a FIXED standard T2 corporate onboarding form (mirrors the
// firm's "On-Boarding Details" spreadsheet). It is defined here as the single
// source of truth and returned to the client so the app renders the form
// dynamically. Only the client's answers are persisted (onboarding_submissions).
const express = require("express");
const db = require("../db");
const { fail, ok } = require("../helpers");
const { requireAuth } = require("../middleware/auth");

// ── Canonical T2 On-Boarding schema ───────────────────────────────────────────
// Field types the Flutter renderer understands:
//   text | textarea | number | date | select | ack | group(repeatable)
const ONBOARDING_SCHEMA = {
  version: 1,
  title: "On-Boarding Details",
  subtitle: "Please provide the details below so we can set up your corporate file.",
  sections: [
    {
      key: "cra_and_docs",
      title: "CRA Authorization & Documents",
      description:
        "Refer to the 'Authorization Request – Job Aid' shared with you. Confirm the items below; you will upload the actual files on the next screen (General Documents).",
      fields: [
        {
          key: "cra_authorization",
          label:
            "I have authorized Diamond Accounts on my CRA business account (per the Job Aid).",
          type: "ack",
          remarkLabel: "Remarks (optional)",
        },
        {
          key: "incorporation_documents_ack",
          label: "I will provide the incorporation documents.",
          type: "ack",
          remarkLabel: "Remarks (optional)",
        },
        {
          key: "payroll_enrollment_ack",
          label:
            "For payroll: I will return the duly filled Payroll Enrollment Form for all employees.",
          type: "ack",
          required: false,
          remarkLabel: "Remarks (optional)",
        },
      ],
    },
    {
      key: "company_details",
      title: "Company Details",
      fields: [
        { key: "company_name", label: "Company Name", type: "text", required: true },
        { key: "business_number", label: "Business Number", type: "text", required: true },
        { key: "registered_address", label: "Registered Address", type: "textarea", required: true },
        { key: "incorporation_date", label: "Incorporation Date", type: "date" },
        {
          key: "is_inactive",
          label: "Is the corporation inactive?",
          type: "select",
          options: ["No", "Yes"],
        },
        {
          key: "principal_activity",
          label: "Principal Activity & Percentage",
          type: "text",
          placeholder: "e.g. Restaurant – 100%",
        },
        {
          key: "director_name",
          label: "Director – Last Name & First Name",
          type: "text",
        },
        {
          key: "signing_officer",
          label: "Authorized Signing Officer – Last & First Name with position",
          type: "text",
        },
        {
          key: "signing_officer_phone",
          label: "Phone no. of Authorized Signing Officer",
          type: "text",
        },
        { key: "total_shares_issued", label: "Total No. of Shares issued", type: "number" },
        { key: "total_shares_amount", label: "Total amount of Shares", type: "number" },
      ],
    },
    {
      key: "shareholders",
      title: "Shareholders",
      description:
        "Add each shareholder with their SIN/BN and percentage of shareholding.",
      fields: [
        {
          key: "shareholders",
          label: "Shareholders",
          type: "group",
          repeatable: true,
          minItems: 1,
          addLabel: "Add shareholder",
          itemLabel: "Share Holder",
          fields: [
            { key: "name", label: "Name", type: "text", required: true },
            { key: "sin_bn", label: "SIN / BN", type: "text" },
            { key: "common_pct", label: "% Common Shares", type: "number" },
            { key: "preference_pct", label: "% Preference Shares", type: "number" },
          ],
        },
      ],
    },
    {
      key: "prior_records",
      title: "Prior Records & Other",
      fields: [
        {
          key: "prior_records_remark",
          label: "Previous year accounting records (previous T2 returns & last year FS)",
          type: "textarea",
          placeholder: "Any notes on what you can provide",
        },
        {
          key: "franchise_documents_remark",
          label: "Franchise documents (if applicable, else leave blank)",
          type: "textarea",
        },
      ],
    },
  ],
};

function flattenFieldKeys() {
  const keys = [];
  for (const section of ONBOARDING_SCHEMA.sections) {
    for (const f of section.fields) keys.push(f.key);
  }
  return keys;
}
const VALID_KEYS = new Set(flattenFieldKeys());

// Keep only recognised keys; drop anything unexpected the client might post.
function sanitizeAnswers(answers) {
  if (!answers || typeof answers !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(answers)) {
    if (VALID_KEYS.has(k)) out[k] = v;
  }
  return out;
}

async function getSubmission(clientId) {
  const { rows: [row] } = await db.query(
    "SELECT * FROM onboarding_submissions WHERE client_id=$1",
    [clientId]
  );
  return row || null;
}

function serializeSubmission(row) {
  return {
    answers: row?.answers || {},
    status: row?.status || "not_started",
    submittedAt: row?.submitted_at || null,
    updatedAt: row?.updated_at || null,
  };
}

// ── Client Router ─────────────────────────────────────────────────────────────
const clientRouter = express.Router();
clientRouter.use(requireAuth("client"));

// GET /v3/api/v1/onboarding — schema + this client's saved answers/status
clientRouter.get("/", async (req, res) => {
  const submission = await getSubmission(req.user.sub);
  return res.json(ok({
    schema: ONBOARDING_SCHEMA,
    submission: serializeSubmission(submission),
  }, "Onboarding fetched"));
});

// PUT /v3/api/v1/onboarding — save draft or submit
// body: { answers: {...}, submit: boolean }
clientRouter.put("/", async (req, res) => {
  const clientId = req.user.sub;
  const answers = sanitizeAnswers(req.body?.answers);
  const submit = req.body?.submit === true;

  if (submit) {
    // Validate required fields on submit.
    const missing = [];
    for (const section of ONBOARDING_SCHEMA.sections) {
      for (const f of section.fields) {
        if (!f.required) continue;
        if (f.type === "ack") {
          if (answers[f.key]?.confirmed !== true) missing.push(f.label);
        } else if (f.type === "group") {
          const items = Array.isArray(answers[f.key]) ? answers[f.key] : [];
          if ((f.minItems || 0) > items.length) missing.push(f.label);
        } else {
          const val = answers[f.key];
          if (val === undefined || val === null || String(val).trim() === "") {
            missing.push(f.label);
          }
        }
      }
    }
    if (missing.length) {
      return res.status(400).json(fail(`Please complete: ${missing.join(", ")}`));
    }
  }

  const status = submit ? "submitted" : "draft";
  const { rows: [row] } = await db.query(
    `INSERT INTO onboarding_submissions (client_id, answers, status, submitted_at)
     VALUES ($1, $2, $3, CASE WHEN $3='submitted' THEN NOW() ELSE NULL END)
     ON CONFLICT (client_id) DO UPDATE
       SET answers=$2,
           status=$3,
           submitted_at=CASE WHEN $3='submitted' THEN NOW()
                             ELSE onboarding_submissions.submitted_at END,
           updated_at=NOW()
     RETURNING *`,
    [clientId, JSON.stringify(answers), status]
  );

  return res.json(ok(serializeSubmission(row),
    submit ? "Onboarding submitted" : "Draft saved"));
});

// ── Admin Router ──────────────────────────────────────────────────────────────
const adminRouter = express.Router();
adminRouter.use(requireAuth("admin"));

// GET /api/admin/clients/:clientId/onboarding — schema + client's answers (read-only)
adminRouter.get("/clients/:clientId/onboarding", async (req, res) => {
  const { rows: [client] } = await db.query(
    "SELECT id FROM users WHERE (id::text=$1 OR slug=$1) AND role='client'",
    [req.params.clientId]
  );
  if (!client) return res.status(404).json(fail("Client not found"));

  const submission = await getSubmission(client.id);
  return res.json(ok({
    clientId: client.id,
    schema: ONBOARDING_SCHEMA,
    submission: serializeSubmission(submission),
  }, "Onboarding fetched"));
});

module.exports = { adminRouter, clientRouter, ONBOARDING_SCHEMA };
