const express = require("express");
const db = require("../db");
const { fail, ok } = require("../helpers");
const { requireAuth } = require("../middleware/auth");
const { sendClientTakeOnCompletedEmail } = require("../config/aws");
const { generateTasksForClient } = require("../task-generation");

// Bridges this form's bookkeeping_period/bookkeeping_first_date answers (what
// the client/staff actually fill in) into the field names schedule.js's
// bookkeepingPeriods() reads (bookkeepingFrequency/bookkeepingQuarterOption) —
// these evolved as two separate representations of the same concept; this is
// the one place that reconciles them so submitting this form actually drives
// real task generation instead of just being stored, unused, in answers JSON.
const QUARTER_GROUP_BY_MONTH_MOD3 = { 1: "Jan/Apr/Jul/Oct", 2: "Feb/May/Aug/Nov", 0: "Mar/Jun/Sep/Dec" };

// Back-compat: submissions saved before Bookkeeping became an explicit Yes/No
// have a bookkeeping_period but no `bookkeeping` answer. Treat those as Yes, so
// existing clients keep their Bookkeeping tab and keep generating tasks. The
// value is persisted on their next save.
function withBookkeepingDefault(answers) {
  if (answers.bookkeeping == null && answers.bookkeeping_period) {
    return { ...answers, bookkeeping: "Yes" };
  }
  return answers;
}

function bookkeepingConfigFromAnswers(rawAnswers) {
  // Bookkeeping must be switched on in Services before any task is generated —
  // mirrors the spec's "if the Bookkeeping option is selected the bookkeeping
  // task should generate".
  const answers = withBookkeepingDefault(rawAnswers);
  if (answers.bookkeeping !== "Yes") return null;
  const freq = answers.bookkeeping_period;
  if (!freq) return null;
  const config = { bookkeepingFrequency: freq };
  if (answers.bookkeeping_first_date) {
    config.bookkeepingFirstDate = answers.bookkeeping_first_date;
    if (freq === "Quarterly") {
      const month = Number(String(answers.bookkeeping_first_date).slice(5, 7));
      config.bookkeepingQuarterOption = QUARTER_GROUP_BY_MONTH_MOD3[month % 3];
    }
  }
  return config;
}

const CLIENT_TAKE_ON_NOTIFY_EMAIL = process.env.CLIENT_TAKE_ON_NOTIFY_EMAIL || "admin@diamondaccounts.ca";

const CLIENT_TAKE_ON_SCHEMA = {
  version: 1,
  title: "Client Take-On",
  sections: [
    {
      key: "basic_details",
      title: "Basic Details",
      fields: [
        { key: "client_name", label: "Client Name", type: "text", required: true },
        { key: "business_name", label: "Business Name", type: "text", required: true },
        {
          key: "business_structure",
          label: "Business Structure",
          type: "select",
          required: true,
          options: ["Sole Proprietor", "Partnership", "Incorporation"],
        },
        {
          key: "nature_of_business",
          label: "Nature of Business",
          type: "select",
          required: true,
          options: [
            "Financial Services", "Insurance Providers", "Real Estate", "Legal & Consulting Services",
            "Investment & Asset Management", "Fintech & Payment Services", "E-commerce & Online Marketplaces",
            "Gambling & Gaming", "Telecommunications & Utilities", "Shipping & Logistics",
            "Precious Metals & Gemstone Trading", "Art Dealing & Auctions", "Charities & Non-Profit Organizations",
            "Healthcare & Pharmaceutical", "Public Sector & Government Contracts", "Corporate Services & Company Formation",
            "Cryptocurrency Exchanges", "Restaurants & Cafes", "Meat Shops & Butcheries",
            "Convenience Stores", "Retail Businesses (Clothing, Electronics, etc.)", "Supermarkets & Grocery Stores",
            "Wholesale Trading (Food, Electronics, etc.)", "Hospitality & Hotels", "Construction Companies & Contractors",
            "Automobile Dealerships", "Bars & Nightclubs", "Fitness Centers & Gyms",
            "Franchises (fast food, retail chains, etc.)", "Professional Services (accountants, consultants, etc.)",
            "Garages & Auto Repair Shops", "Car Wash Services", "Fuel Stations",
            "Transportation Services (Taxi, Ride-sharing)", "Rental Services (Car, Equipment, Property)",
            "Manufacturing & Assembly Plants", "Farming & Agriculture", "Beauty Salons & Barbershops",
            "Tattoo Parlors", "Event Management & Catering Services", "Dry Cleaning & Laundry Services",
            "Printing & Publishing Businesses", "Construction Materials Suppliers (building materials, hardware)",
            "Heavy Machinery Rental Services", "Property & Equipment Leasing", "Scaffolding & Crane Services",
            "Interior Design & Renovation Services", "Home Maintenance Services (plumbing, electrical, HVAC)",
            "Landscaping & Gardening Services", "Moving & Storage Companies",
          ],
        },
        { key: "business_details", label: "More Details About Business", type: "textarea" },
        { key: "specific_notes", label: "Specific Details Regarding Client/Business for Accounting", type: "textarea" },
        { key: "support_staff", label: "Support Staff Handling Client", type: "text" },
      ],
    },
    {
      key: "address",
      title: "Address",
      fields: [
        { key: "street", label: "Street Address", type: "text", required: true },
        { key: "apt_suite", label: "Apt / Suite / Unit (optional)", type: "text" },
        { key: "city", label: "Town/City", type: "text", required: true },
        {
          key: "province",
          label: "Province/Territory",
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
        { key: "postal_code", label: "Postal Code", type: "text", required: true },
        { key: "country", label: "Country", type: "text", placeholder: "Canada" },
      ],
    },
    {
      key: "contacts",
      title: "Contact Information",
      fields: [
        { key: "main_contact_name", label: "Main Contact Name", type: "text", required: true },
        { key: "main_contact_email", label: "Main Contact Email", type: "text", required: true },
        { key: "main_contact_phone", label: "Main Contact Telephone/Mobile No.", type: "text", required: true },
        { key: "main_contact_sin", label: "Main Contact SIN No.", type: "text" },
        { key: "sec_contact_name", label: "Secondary Contact Name", type: "text" },
        { key: "sec_contact_email", label: "Secondary Contact Email", type: "text" },
        { key: "sec_contact_phone", label: "Secondary Contact Telephone/Mobile No.", type: "text" },
        { key: "sec_contact_sin", label: "Secondary Contact SIN No.", type: "text" },
      ],
    },
    {
      key: "tax_setup",
      title: "Tax Setup",
      fields: [
        { key: "business_number", label: "Business Number", type: "text", required: true },
        { key: "cra_access", label: "CRA Access", type: "select", options: ["Yes", "No"], required: true },
        { key: "incorporation_date", label: "Business Incorporation Date", type: "date", required: true },
        { key: "effective_hst_date", label: "Effective HST Date of Registration", type: "date" },
      ],
    },
    {
      key: "services",
      title: "Services",
      fields: [
        // Bookkeeping is a yes/no here on purpose. Saying Yes reveals a
        // dedicated Bookkeeping tab holding the period/date/method/software
        // detail — those change over a client's life and are edited there,
        // not buried in the one-off take-on sheet.
        { key: "bookkeeping", label: "Bookkeeping", type: "select", options: ["Yes", "No"] },
        { key: "payroll_period", label: "Payroll Period", type: "select", options: ["Weekly", "Monthly", "Bi-Weekly", "Four-Weekly", "15th and Last day of Month", "Six-Monthly", "Annual"] },
        { key: "hst_period", label: "HST Period", type: "select", options: ["Monthly", "Quarterly", "Yearly", "Jan/Apr/Jul/Oct", "Feb/May/Aug/Nov", "Mar/Jun/Sept/Dec"] },
        { key: "corporation_tax_period", label: "Corporation Tax Period", type: "select", options: ["Yearly"] },
        { key: "corporation_tax_year_end_date", label: "Corporation Tax Year End Date", type: "date" },
        { key: "services_remarks", label: "Services Remarks", type: "textarea" },
      ],
    },
    {
      // Rendered on its own "Bookkeeping" tab, not inside the Client Take-On
      // form. `tab` tells the frontend to skip it in the main form; the tab
      // only appears at all when services.bookkeeping === "Yes".
      key: "bookkeeping_details",
      title: "Bookkeeping",
      tab: "bookkeeping",
      showWhen: { field: "bookkeeping", value: "Yes" },
      fields: [
        { key: "bookkeeping_period", label: "Bookkeeping Period", type: "select", options: ["Weekly", "Monthly", "Quarterly", "Yearly"] },
        { key: "bookkeeping_first_date", label: "First Bookkeeping Date", type: "date" },
        { key: "bookkeeping_method", label: "Bookkeeping Method", type: "select", options: ["Paper record", "Spreadsheet", "Desktop", "Online"] },
        { key: "accounting_software", label: "Accounting Software", type: "select", options: ["Quickbook", "Xero", "Zoho", "VT"] },
      ],
    },
    {
      key: "fees",
      title: "Fees",
      fields: [
        { key: "monthly_retainer", label: "Monthly Retainer ($)", type: "number" },
        { key: "pending_task_fees", label: "Specific Fees for Pending Task ($)", type: "number" },
      ],
    },
    {
      key: "incorporation_docs",
      title: "Incorporation Documents (where applicable)",
      fields: [
        {
          key: "incorporation_documents",
          label: "Documents",
          type: "group",
          repeatable: true,
          itemLabel: "Document",
          minItems: 0,
          fields: [
            {
              key: "document_name",
              label: "Document Name",
              type: "select",
              options: ["Certificate of Registration", "Registers", "Shareholder Certificate", "Notice of Directors", "Business no. Certificate"],
            },
            { key: "remarks", label: "Additional Remarks", type: "textarea" },
          ],
        },
      ],
    },
  ],
};

const VALID_KEYS = new Set(
  CLIENT_TAKE_ON_SCHEMA.sections.flatMap((s) => s.fields.map((f) => f.key))
);

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
    "SELECT * FROM client_take_on_submissions WHERE client_id=$1",
    [clientId]
  );
  return row || null;
}

function serializeSubmission(row) {
  return {
    answers: withBookkeepingDefault(row?.answers || {}),
    status: row?.status || "not_started",
    submittedAt: row?.submitted_at || null,
    updatedAt: row?.updated_at || null,
  };
}

const adminRouter = express.Router();
adminRouter.use(requireAuth("admin"));

adminRouter.get("/clients/:clientId/client-take-on", async (req, res) => {
  const { rows: [client] } = await db.query(
    "SELECT id FROM users WHERE (id::text=$1 OR slug=$1) AND role='client'",
    [req.params.clientId]
  );
  if (!client) return res.status(404).json(fail("Client not found"));

  const submission = await getSubmission(client.id);
  return res.json(ok({
    clientId: client.id,
    schema: CLIENT_TAKE_ON_SCHEMA,
    submission: serializeSubmission(submission),
  }, "Client take-on fetched"));
});

adminRouter.put("/clients/:clientId/client-take-on", async (req, res) => {
  const { rows: [client] } = await db.query(
    "SELECT id, name, email FROM users WHERE (id::text=$1 OR slug=$1) AND role='client'",
    [req.params.clientId]
  );
  if (!client) return res.status(404).json(fail("Client not found"));

  const answers = sanitizeAnswers(req.body?.answers);
  const submit = req.body?.submit === true;

  // A plain save must never drag an already-completed take-on back to "draft" —
  // the Bookkeeping tab saves through this same endpoint long after the sheet
  // was completed.
  const previous = await getSubmission(client.id);
  const wasSubmitted = previous?.status === "submitted";
  const status = submit || wasSubmitted ? "submitted" : "draft";

  const { rows: [row] } = await db.query(
    `INSERT INTO client_take_on_submissions (client_id, answers, status, submitted_at)
     VALUES ($1, $2, $3, CASE WHEN $3='submitted' THEN NOW() ELSE NULL END)
     ON CONFLICT (client_id) DO UPDATE
       SET answers=$2,
           status=$3,
           submitted_at=CASE WHEN $3='submitted' THEN NOW()
                             ELSE client_take_on_submissions.submitted_at END,
           updated_at=NOW()
     RETURNING *`,
    [client.id, JSON.stringify(answers), status]
  );

  // Notify once, on the transition into completed — not on every later edit.
  if (submit && !wasSubmitted) {
    sendClientTakeOnCompletedEmail({
      clientName: client.name,
      clientEmail: client.email,
      submittedAt: row.submitted_at,
      toEmail: CLIENT_TAKE_ON_NOTIFY_EMAIL,
    }).catch((err) => {
      console.error("Client take-on completion email failed:", err.message);
    });
  }

  // Regenerate on any save of a completed take-on, so changing the frequency or
  // first date on the Bookkeeping tab actually produces tasks. Generation dedups
  // on periodKey, so re-running is a no-op for periods that already have one.
  if (status === "submitted") {
    const bkConfig = bookkeepingConfigFromAnswers(answers);
    if (bkConfig) {
      generateTasksForClient(client.id, bkConfig, req.user.sub).catch((err) => {
        console.error(`Bookkeeping task generation failed for client ${client.id}:`, err.message);
      });
    }
  }

  return res.json(ok(
    serializeSubmission(row),
    submit ? "Client take-on submitted" : "Saved"
  ));
});

module.exports = { adminRouter, CLIENT_TAKE_ON_SCHEMA, bookkeepingConfigFromAnswers };
