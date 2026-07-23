// config-fields.js — task config field definitions (admin + client forms)
const { getWorkflow } = require("./workflows");

const CONFIG_FIELD_CATALOG = {
  // Corporate Tax Return
  fiscalYearEnd:       { key: "fiscalYearEnd",       label: "Fiscal year end",            type: "date", required: true },
  craInstallmentInT2:  { key: "craInstallmentInT2",  label: "CRA installment in T2",      type: "boolean" },
  taxYearEnd:          { key: "taxYearEnd",          label: "Tax year end",               type: "date", dependsOn: { field: "craInstallmentInT2", value: true } },
  taxAmount:           { key: "taxAmount",           label: "Tax amount",                 type: "number", dependsOn: { field: "craInstallmentInT2", value: true } },

  // HST
  salesTaxFrequency:   { key: "salesTaxFrequency",   label: "Sales tax frequency",        type: "select", required: true, options: ["Annual", "Quarterly", "Monthly"] },
  salesTaxYearEnd:     {
    key: "salesTaxYearEnd", label: "Sales tax year end", type: "date",
    dependsOn: { field: "salesTaxFrequency", value: "Annual" },
  },
  hstQuarterOption:    {
    key: "hstQuarterOption", label: "Quarter option", type: "select",
    dependsOn: { field: "salesTaxFrequency", value: "Quarterly" },
    options: ["Jan/Apr/Jul/Oct", "Feb/May/Aug/Nov", "Mar/Jun/Sept/Dec"],
  },
  craInstallmentInHST: { key: "craInstallmentInHST", label: "CRA installment in HST",     type: "boolean" },

  // Bookkeeping
  bookkeepingFrequency: {
    key: "bookkeepingFrequency", label: "Bookkeeping frequency", type: "select", required: true,
    options: ["Monthly", "Quarterly", "Weekly"],
  },
  bookkeepingQuarterOption: {
    key: "bookkeepingQuarterOption", label: "Quarter option", type: "select",
    dependsOn: { field: "bookkeepingFrequency", value: "Quarterly" },
    options: ["Jan/Apr/Jul/Oct", "Feb/May/Aug/Nov", "Mar/Jun/Sept/Dec"],
  },

  // Payroll (from admin panel spec)
  nextPayDate:       { key: "nextPayDate",       label: "Next pay date",        type: "date",    required: true },
  payrollFrequency:  {
    key: "payrollFrequency", label: "Payroll frequency", type: "select", required: true,
    options: ["Weekly", "Monthly", "Bi-Weekly", "15th and Last day of Month"],
  },
  payPeriodEnds:     { key: "payPeriodEnds",     label: "Pay period ends",      type: "text" },
  wcbNumber:         { key: "wcbNumber",         label: "WCB/WSIB number",      type: "text" },
  pd7aFrequency:     {
    key: "pd7aFrequency", label: "PD7A frequency", type: "select",
    options: ["Monthly", "Quarterly", "Annual"],
  },
  wcbFrequency:      {
    key: "wcbFrequency", label: "WCB frequency", type: "select",
    options: ["Monthly", "Quarterly", "Annual"],
  },
  wcbUsername:       { key: "wcbUsername",       label: "WCB username",         type: "text" },
  wcbPassword:       { key: "wcbPassword",       label: "WCB password",         type: "password" },
  payrollType:       {
    key: "payrollType", label: "Fix or variable", type: "select",
    options: ["Fix", "Variable", "Both"],
  },
  notes:             { key: "notes",             label: "Important notes",      type: "textarea" },
  t5:                { key: "t5",                label: "T5",                   type: "boolean" },
  t4a:               { key: "t4a",               label: "T4A",                  type: "boolean" },
  t5018:             { key: "t5018",             label: "T5018",                type: "boolean" },
};

function getConfigSchemaForTaskType(taskType) {
  const wf = getWorkflow(taskType);
  if (!wf?.configFields?.length) return [];
  return wf.configFields
    .map((key) => CONFIG_FIELD_CATALOG[key])
    .filter(Boolean);
}

function buildConfigValues(taskType, stored = {}) {
  const wf = getWorkflow(taskType);
  if (!wf?.configFields?.length) {
    return Object.keys(stored).length ? stored : null;
  }
  const values = {};
  for (const key of wf.configFields) {
    values[key] = key in stored ? stored[key] : null;
  }
  return values;
}

function enrichTaskWithConfig(row, storedConfig) {
  const { getWorkflowMetadata } = require("./workflow-metadata");
  const config = typeof storedConfig === "object" ? storedConfig : {};
  const taskType = row.task_type ?? row.taskType ?? null;
  const schema = getConfigSchemaForTaskType(taskType);
  const subDetails = taskType ? getWorkflowMetadata(taskType) : null;
  const base = {
    subDetails: subDetails ? {
      generation:     subDetails.generation,
      subtaskWorkflow:  subDetails.subtaskWorkflow,
      relatedTasks:     subDetails.relatedTasks,
      progressMilestones: subDetails.progressMilestones,
    } : null,
  };
  if (!schema.length) {
    return { ...base, configSchema: [], config: Object.keys(config).length ? config : {} };
  }
  return {
    ...base,
    configSchema: schema,
    config: buildConfigValues(taskType, config),
  };
}

function mergeConfigUpdate(taskType, existing, patch) {
  const wf = getWorkflow(taskType);
  if (!wf?.configFields?.length) {
    return { ...existing, ...patch };
  }
  const allowed = new Set(wf.configFields);
  const merged = { ...existing };
  for (const [key, value] of Object.entries(patch)) {
    if (allowed.has(key)) merged[key] = value;
  }
  return merged;
}

module.exports = {
  CONFIG_FIELD_CATALOG,
  getConfigSchemaForTaskType,
  buildConfigValues,
  enrichTaskWithConfig,
  mergeConfigUpdate,
};
