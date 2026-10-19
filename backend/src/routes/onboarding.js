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
const { sendOnboardingCompletedEmail } = require("../config/aws");
const { resolveNotificationEmails } = require("../notification-routing");

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
          attachmentUrl: "https://tax.diamondaccounts.ca/job-aid-authorize-representative.pdf",
          attachmentLabel: "View Job Aid",
        },
        {
          key: "incorporation_documents_ack",
          label: "I will provide the incorporation documents.",
          type: "ack",
          remarkLabel: "Remarks (optional)",
        },
        {
          key: "rotessa_authorization",
          label:
            "Step 3: Rotessa – Direct Debit Setup. Please click on the link and fill out this permission " +
            "form to sign up for monthly retainer payments. We'll automatically debit your account based " +
            "on your invoice total on 10th of every month. Bank payments are 100% secure, and if you ever " +
            "need to make a change, we will happily accommodate it.",
          type: "ack",
          remarkLabel: "Remarks (optional)",
          attachmentUrl: "https://app.rotessa.com/authorize/diamondaccounts",
          attachmentLabel: "Open Rotessa Authorization Form",
        },
      ],
    },
    {
      key: "company_details",
      title: "Company Details",
      fields: [
        { key: "company_name", label: "Company Name", type: "text", required: true },
        { key: "business_number", label: "Business Number", type: "text", required: true },
        {
          key: "registered_address_street",
          label: "Registered Address — Street Address",
          type: "text",
          required: true,
        },
        {
          key: "registered_address_apt_suite",
          label: "Registered Address — Apt / Suite / Unit (optional)",
          type: "text",
        },
        {
          key: "registered_address_city",
          label: "Registered Address — City",
          type: "text",
          required: true,
        },
        {
          key: "registered_address_province",
          label: "Registered Address — Province",
          type: "select",
          required: true,
          options: [
            "Alberta",
            "British Columbia",
            "Manitoba",
            "New Brunswick",
            "Newfoundland and Labrador",
            "Northwest Territories",
            "Nova Scotia",
            "Nunavut",
            "Ontario",
            "Prince Edward Island",
            "Quebec",
            "Saskatchewan",
            "Yukon",
          ],
        },
        {
          key: "registered_address_postal_code",
          label: "Registered Address — Postal Code",
          type: "text",
          required: true,
        },
        {
          key: "registered_address_country",
          label: "Registered Address — Country",
          type: "text",
          placeholder: "Canada",
        },
        { key: "incorporation_date", label: "Incorporation Date", type: "date" },
        {
          key: "is_active",
          label: "Is the corporation active?",
          type: "select",
          options: ["Yes", "No"],
        },
        {
          key: "principal_activity",
          label: "Principal Activity & Percentage",
          type: "text",
          placeholder: "e.g. Restaurant – 100%",
        },
        {
          key: "director_first_name",
          label: "Director – First Name",
          type: "text",
        },
        {
          key: "director_last_name",
          label: "Director – Last Name",
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
          required: true,
          repeatable: true,
          minItems: 1,
          addLabel: "Add shareholder",
          itemLabel: "Share Holder",
          fields: [
            { key: "first_name", label: "First Name", type: "text", required: true },
            { key: "last_name", label: "Last Name", type: "text", required: true },
            { key: "sin_bn", label: "SIN / BN", type: "text" },
            { key: "common_pct", label: "% Common Shares", type: "number" },
            { key: "preference_pct", label: "% Preference Shares", type: "number" },
          ],
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
    const isBlank = (val) => val === undefined || val === null || String(val).trim() === "";
    for (const section of ONBOARDING_SCHEMA.sections) {
      for (const f of section.fields) {
        if (!f.required) continue;
        if (f.type === "ack") {
          if (answers[f.key]?.confirmed !== true) missing.push(f.label);
        } else if (f.type === "group") {
          const items = Array.isArray(answers[f.key]) ? answers[f.key] : [];
          if ((f.minItems || 0) > items.length) {
            missing.push(f.label);
            continue;
          }
          // minItems only checks the group isn't empty — it doesn't check that
          // each item's own required fields (e.g. a shareholder's name) were
          // actually filled in. Previously an item with every field blank
          // still satisfied "at least 1 shareholder".
          const requiredSubFields = (f.fields || []).filter((sub) => sub.required);
          items.forEach((item, idx) => {
            for (const sub of requiredSubFields) {
              if (isBlank(item?.[sub.key])) {
                missing.push(`${f.itemLabel || f.label} ${idx + 1} — ${sub.label}`);
              }
            }
          });
        } else if (isBlank(answers[f.key])) {
          missing.push(f.label);
        }
      }
    }
    if (missing.length) {
      return res.status(400).json(fail(`Please complete: ${missing.join(", ")}`));
    }
  }

  // Only notify on the transition into submitted, not on every later re-save —
  // same rule as Client Take-On.
  const previous = await getSubmission(clientId);
  const wasSubmitted = previous?.status === "submitted";

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

  if (submit && !wasSubmitted) {
    (async () => {
      const emails = await resolveNotificationEmails("ONBOARDING", [
        "support@diamondaccounts.ca", "accounts@diamondaccounts.ca", "admin@diamondaccounts.ca",
      ]);
      if (!emails.length) return;
      const { rows: [client] } = await db.query("SELECT name, email FROM users WHERE id=$1", [clientId]);
      await sendOnboardingCompletedEmail({
        clientName: client?.name, clientEmail: client?.email,
        submittedAt: row.submitted_at, toEmails: emails,
      });
    })().catch((err) => console.error("Onboarding completion email failed:", err.message));
  }

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
