const express = require("express");
const db = require("../db");
const { fail, ok } = require("../helpers");
const { requireAuth } = require("../middleware/auth");
const { sendClientTakeOnCompletedEmail } = require("../config/aws");

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
        { key: "address_line_1", label: "Address Line 1", type: "text", required: true },
        { key: "address_line_2", label: "Address Line 2", type: "text" },
        { key: "city", label: "Town/City", type: "text", required: true },
        { key: "province", label: "Province/Territory", type: "text", required: true },
        { key: "postal_code", label: "Postal Code", type: "text", required: true },
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
        { key: "bookkeeping_period", label: "Bookkeeping Period", type: "select", options: ["Weekly", "Monthly", "Quarterly", "Yearly"] },
        { key: "payroll_period", label: "Payroll Period", type: "select", options: ["Weekly", "Monthly", "Bi-Weekly", "Four-Weekly", "15th and Last day of Month", "Six-Monthly", "Annual"] },
        { key: "hst_period", label: "HST Period", type: "select", options: ["Monthly", "Quarterly", "Yearly", "Jan/Apr/Jul/Oct", "Feb/May/Aug/Nov", "Mar/Jun/Sept/Dec"] },
        { key: "corporation_tax_period", label: "Corporation Tax Period", type: "select", options: ["Yearly"] },
        { key: "services_remarks", label: "Services Remarks", type: "textarea" },
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
    answers: row?.answers || {},
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
  const status = submit ? "submitted" : "draft";

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

  if (submit) {
    sendClientTakeOnCompletedEmail({
      clientName: client.name,
      clientEmail: client.email,
      submittedAt: row.submitted_at,
      toEmail: CLIENT_TAKE_ON_NOTIFY_EMAIL,
    }).catch((err) => {
      console.error("Client take-on completion email failed:", err.message);
    });
  }

  return res.json(ok(
    serializeSubmission(row),
    submit ? "Client take-on submitted" : "Client take-on draft saved"
  ));
});

module.exports = { adminRouter, CLIENT_TAKE_ON_SCHEMA };
