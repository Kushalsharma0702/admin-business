// workflows.js — all 10 task type definitions with exact subtask names
// and internal→client progress mapping from the accounting workflow sheets.

const TASK_TYPES = {
  CORPORATE_TAX_RETURN: "CORPORATE_TAX_RETURN",
  HST:                  "HST",
  BOOKKEEPING:          "BOOKKEEPING",
  PAYROLL:              "PAYROLL",
  PD7A:                 "PD7A",
  WCB:                  "WCB",
  T4:                   "T4",
  T4A:                  "T4A",
  T5018:                "T5018",
  T5:                   "T5",
  CUSTOM:               "CUSTOM",  // Admin-defined custom business task
};

// ── Workflow definitions ──────────────────────────────────────────────────────
// Each entry: { subtasks: string[], clientProgressMap: { subtaskName → clientLabel } }

const WORKFLOWS = {

  // ──────────────────────────────────────────────────────────────────────────
  // 1. CORPORATE TAX RETURN (T2)
  // ──────────────────────────────────────────────────────────────────────────
  [TASK_TYPES.CORPORATE_TAX_RETURN]: {
    displayName: "Corporate Tax Return (T2)",
    subtasks: [
      "Request Tax return information",
      "On hold/Close the task",
      "Partial Data",
      "Data missing close",
      "Work in progress",
      "Query sent to support team",
      "Query sent to client",
      "Partial query reply received",
      "Bookkeeping completed",
      "Review",
      "Send Draft T2 to Canada office",
      "Sent draft T2 to client for approval",
      "T2 Approved by client",
      "Filing on hold due to overdue payment",
      "T2 Filed",
    ],
    clientProgressMap: {
      "Request Tax return information":        "Data pending",
      "On hold/Close the task":                "Data pending",
      "Partial Data":                          "Data pending",
      "Data missing close":                    "Data received",
      "Work in progress":                      "Work in Progress",
      "Query sent to support team":            "Work in Progress",
      "Query sent to client":                  "Query response pending",
      "Partial query reply received":          "Partial Query response pending",
      "Bookkeeping completed":                 "Work in Progress",
      "Review":                                "Work in Progress",
      "Send Draft T2 to Canada office":        "Work in Progress",
      "Sent draft T2 to client for approval":  "Draft Ready",
      "T2 Approved by client":                 "Approved filing pending",
      "Filing on hold due to overdue payment": "Payment overdue",
      "T2 Filed":                              "Filed",
    },
    configFields: ["fiscalYearEnd", "craInstallmentInT2", "taxYearEnd", "taxAmount"],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. HST
  // ──────────────────────────────────────────────────────────────────────────
  [TASK_TYPES.HST]: {
    displayName: "HST Return",
    subtasks: [
      "Request Tax return information",
      "On hold/Close the task",
      "Partial Data",
      "Data missing close",
      "Work in progress",
      "Query sent to support team",
      "Query sent to client",
      "Partial query reply received",
      "Bookkeeping completed",
      "Review",
      "Send Draft HST to Canada office",
      "Sent draft HST to client for approval",
      "HST Approved by client",
      "Filing on hold due to overdue payment",
      "HST Filed",
    ],
    clientProgressMap: {
      "Request Tax return information":         "Data pending",
      "On hold/Close the task":                 "Data pending",
      "Partial Data":                           "Data pending",
      "Data missing close":                     "Data received",
      "Work in progress":                       "Work in Progress",
      "Query sent to support team":             "Work in Progress",
      "Query sent to client":                   "Query response pending",
      "Partial query reply received":           "Partial Query response pending",
      "Bookkeeping completed":                  "Work in Progress",
      "Review":                                 "Work in Progress",
      "Send Draft HST to Canada office":        "Work in Progress",
      "Sent draft HST to client for approval":  "Draft Ready",
      "HST Approved by client":                 "Approved filing pending",
      "Filing on hold due to overdue payment":  "Payment overdue",
      "HST Filed":                              "Filed",
    },
    configFields: ["salesTaxFrequency", "salesTaxYearEnd", "hstQuarterOption", "craInstallmentInHST", "taxYearEnd", "taxAmount"],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3. BOOKKEEPING
  // ──────────────────────────────────────────────────────────────────────────
  [TASK_TYPES.BOOKKEEPING]: {
    displayName: "Bookkeeping",
    subtasks: [
      "Request Tax return information",
      "On hold/Close the task",
      "Partial Data",
      "Data missing close",
      "Work in progress",
      "Query sent to support team",
      "Query sent to client",
      "Partial query reply received",
      "Review",
      "Financials sent to support",
      "Financials sent to Client",
      "Bookkeeping completed",
    ],
    clientProgressMap: {
      "Request Tax return information":  "Data pending",
      "On hold/Close the task":          "Data pending",
      "Partial Data":                    "Data pending",
      "Data missing close":              "Data received",
      "Work in progress":                "Work in Progress",
      "Query sent to support team":      "Work in Progress",
      "Query sent to client":            "Query response pending",
      "Partial query reply received":    "Partial Query response pending",
      "Review":                          "Work in Progress",
      "Financials sent to support":      "Work in Progress",
      "Financials sent to Client":       "Financials Ready",
      "Bookkeeping completed":           "Financials Ready",
    },
    configFields: ["bookkeepingFrequency", "bookkeepingQuarterOption"],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 4. PAYROLL
  // ──────────────────────────────────────────────────────────────────────────
  [TASK_TYPES.PAYROLL]: {
    displayName: "Payroll",
    subtasks: [
      "Request payroll hours from client",
      "Query sent to client",
      "Query reply received from client",
      "Prepare Payroll",
      "Sent Pay stubs to client",
    ],
    clientProgressMap: {
      "Request payroll hours from client": "Hours pending",
      "Query sent to client":              "Query pending",
      "Query reply received from client":  "Work in progress",
      "Prepare Payroll":                   "Work in progress",
      "Sent Pay stubs to client":          "View Paystubs",
    },
    configFields: [
      "nextPayDate", "payrollFrequency", "payPeriodEnds",
      "wcbNumber", "pd7aFrequency", "wcbFrequency",
      "wcbUsername", "wcbPassword", "payrollType", "notes",
      "t5", "t4a", "t5018",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 5. PD7A
  // ──────────────────────────────────────────────────────────────────────────
  [TASK_TYPES.PD7A]: {
    displayName: "PD7A",
    subtasks: [
      "Prepare PD7A",
      "Send email to client",
    ],
    clientProgressMap: {
      "Prepare PD7A":         "Work in Progress",
      "Send email to client": "View PD7A",
    },
    configFields: [],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 6. WCB
  // ──────────────────────────────────────────────────────────────────────────
  [TASK_TYPES.WCB]: {
    displayName: "WCB",
    subtasks: [
      "Prepare WCB sheet",
      "Send email to client",
    ],
    clientProgressMap: {
      "Prepare WCB sheet":    "Work in Progress",
      "Send email to client": "View WCB",
    },
    configFields: [],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 7. T4
  // ──────────────────────────────────────────────────────────────────────────
  [TASK_TYPES.T4]: {
    displayName: "T4 Slips",
    subtasks: [
      "Prepare T4 slips",
      "Send Draft T4 slips to client for approval",
      "Approval received",
      "Filed",
    ],
    clientProgressMap: {
      "Prepare T4 slips":                          "Work in Progress",
      "Send Draft T4 slips to client for approval": "View Draft",
      "Approval received":                          "Approved",
      "Filed":                                      "Filed",
    },
    configFields: [],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 8. T4A
  // ──────────────────────────────────────────────────────────────────────────
  [TASK_TYPES.T4A]: {
    displayName: "T4A Slips",
    subtasks: [
      "Check with accounting team for T4A details",
      "Prepare T4A slips",
      "Send Draft T4A to client for approval",
      "Approval Received",
      "Filed",
    ],
    clientProgressMap: {
      "Check with accounting team for T4A details": "Work in Progress",
      "Prepare T4A slips":                          "Work in Progress",
      "Send Draft T4A to client for approval":      "View Draft",
      "Approval Received":                          "Approved",
      "Filed":                                      "Filed",
    },
    configFields: [],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 9. T5018
  // ──────────────────────────────────────────────────────────────────────────
  [TASK_TYPES.T5018]: {
    displayName: "T5018 Slips",
    subtasks: [
      "Check with accounting team for 5018 details",
      "Prepare T5018 slips",
      "Send Draft T5018 to client for approval",
      "Approval Received",
      "Filed",
    ],
    clientProgressMap: {
      "Check with accounting team for 5018 details": "Work in Progress",
      "Prepare T5018 slips":                         "Work in Progress",
      "Send Draft T5018 to client for approval":     "View Draft",
      "Approval Received":                           "Approved",
      "Filed":                                       "Filed",
    },
    configFields: [],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 10. T5
  // ──────────────────────────────────────────────────────────────────────────
  [TASK_TYPES.T5]: {
    displayName: "T5 Slips",
    subtasks: [
      "Prepare T5 slips",
      "Send Draft T5 slips to client for approval",
      "Approval received",
      "Filed",
    ],
    clientProgressMap: {
      "Prepare T5 slips":                           "Work in Progress",
      "Send Draft T5 slips to client for approval": "View Draft",
      "Approval received":                          "Approved",
      "Filed":                                      "Filed",
    },
    configFields: [],
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getWorkflow(taskType) {
  return WORKFLOWS[taskType] || null;
}

function getClientProgress(taskType, subtaskName) {
  const wf = WORKFLOWS[taskType];
  if (!wf) return null;
  return wf.clientProgressMap[subtaskName] || null;
}

function getSubtaskOrder(taskType, subtaskName) {
  const wf = WORKFLOWS[taskType];
  if (!wf) return -1;
  return wf.subtasks.indexOf(subtaskName);
}

function isValidSubtask(taskType, subtaskName) {
  const wf = WORKFLOWS[taskType];
  if (!wf) return false;
  return wf.subtasks.includes(subtaskName);
}

function getFirstSubtask(taskType) {
  const wf = WORKFLOWS[taskType];
  if (!wf || wf.subtasks.length === 0) return null;
  return wf.subtasks[0];
}

function getLastSubtask(taskType) {
  const wf = WORKFLOWS[taskType];
  if (!wf || wf.subtasks.length === 0) return null;
  return wf.subtasks[wf.subtasks.length - 1];
}

function isTerminalSubtask(taskType, subtaskName) {
  return subtaskName === getLastSubtask(taskType);
}

// All unique client-visible progress values across all task types
function getAllClientProgressValues() {
  const set = new Set();
  for (const wf of Object.values(WORKFLOWS)) {
    for (const v of Object.values(wf.clientProgressMap)) {
      set.add(v);
    }
  }
  return [...set].sort();
}

module.exports = {
  TASK_TYPES,
  WORKFLOWS,
  getWorkflow,
  getClientProgress,
  getSubtaskOrder,
  isValidSubtask,
  getFirstSubtask,
  getLastSubtask,
  isTerminalSubtask,
  getAllClientProgressValues,
};
