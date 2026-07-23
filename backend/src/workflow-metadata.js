// workflow-metadata.js — business rules & subtask workflow details per task type
const { TASK_TYPES, WORKFLOWS } = require("./workflows");
const { DOCUMENT_CATALOG } = require("./document-requirements");

function buildSubtaskWorkflow(wf) {
  if (!wf) return [];
  return wf.subtasks.map((name, order) => ({
    order,
    subtask:        name,
    clientProgress: wf.clientProgressMap[name] || name,
  }));
}

const WORKFLOW_METADATA = {

  [TASK_TYPES.CORPORATE_TAX_RETURN]: {
    documentCatalog: DOCUMENT_CATALOG,
    documentNote: "Admin sets quantity per document type — client uploads one file per slot",
    generation: {
      trigger: "Fiscal year end filled in client general information",
      frequency: "Annual",
      dueDateRule: "3 months after fiscal year end",
      openDateRule: "3 months before fiscal year end",
      examples: [
        { label: "Year end 31-Dec-25", openDate: "01-Oct-25", dueDate: "31-Mar-26" },
      ],
    },
    relatedTasks: [
      {
        taskKey:    TASK_TYPES.CORPORATE_TAX_QUARTERLY_PAYMENT,
        displayName: "Corporate tax quarterly payment",
        subtask:    "Email client for quarterly payment",
        condition:  "Only when CRA Installment in T2 is Yes and tax year end is filled",
        generation: {
          frequency: "Quarterly (last day of month at 4, 7, 10, 13 months after tax year end)",
          openDateRule: "1 month before quarterly task date",
          examples: [
            { taxYearEnd: "31-Dec-25", taskDate: "30-Apr-26", openDate: "31-Mar-26" },
            { taxYearEnd: "31-Dec-25", taskDate: "31-Jul-26", openDate: "30-Jun-26" },
            { taxYearEnd: "31-Dec-25", taskDate: "31-Oct-26", openDate: "30-Sep-26" },
            { taxYearEnd: "31-Dec-25", taskDate: "31-Jan-27", openDate: "31-Dec-26" },
          ],
        },
      },
    ],
  },

  [TASK_TYPES.HST]: {
    documentCatalog: DOCUMENT_CATALOG,
    documentNote: "Admin sets quantity per document type — client uploads one file per slot",
    generation: {
      trigger: "Sales tax details filled in client general information",
      frequencies: [
        {
          value: "Annual",
          dueDateRule: "3 months after sales tax year end",
          openDateRule: "3 months before year end",
          example: { yearEnd: "31-Dec-25", openDate: "31-Oct-25", dueDate: "31-Mar-26" },
        },
        {
          value: "Quarterly",
          dueDateRule: "3 months after quarter end",
          openDateRule: "3 months before quarter end",
          quarterOptions: ["Jan/Apr/Jul/Oct", "Feb/May/Aug/Nov", "Mar/Jun/Sept/Dec"],
          example: { quarterEnd: "31-Jan-25", openDate: "01-Oct-24", dueDate: "30-Apr-25" },
        },
        {
          value: "Monthly",
          dueDateRule: "End of the following month",
          openDateRule: "3 months before month end",
          example: { monthEnd: "31-Jan-26", openDate: "31-Oct-25", dueDate: "28-Feb-26" },
        },
      ],
    },
    relatedTasks: [
      {
        taskKey:    TASK_TYPES.HST_QUARTERLY_PAYMENT,
        displayName: "HST quarterly payment",
        subtask:    "Email client for quarterly tax payment",
        condition:  "Only when CRA Installment in HST is Yes and tax year end is filled",
        generation: {
          frequency: "Quarterly based on tax year end",
          openDateRule: "1 month before quarterly task date",
          examples: [
            { taxYearEnd: "31-Dec-25", taskDate: "30-Apr-26", openDate: "31-Mar-26" },
            { taxYearEnd: "31-Dec-25", taskDate: "31-Jul-26", openDate: "30-Jun-26" },
          ],
        },
      },
    ],
  },

  [TASK_TYPES.BOOKKEEPING]: {
    documentCatalog: DOCUMENT_CATALOG,
    documentNote: "Admin sets quantity per document type — client uploads one file per slot",
    generation: {
      trigger: "Bookkeeping option selected in client general information",
      frequencies: [
        {
          value: "Quarterly",
          dueDateRule: "1 month after quarter end",
          openDateRule: "3 months before quarter end",
          quarterOptions: ["Jan/Apr/Jul/Oct", "Feb/May/Aug/Nov", "Mar/Jun/Sept/Dec"],
          example: { quarterEnd: "31-Jan-25", openDate: "01-Oct-24", dueDate: "30-Apr-25" },
        },
        {
          value: "Monthly",
          dueDateRule: "End of the following month",
          openDateRule: "3 months before month end",
          example: { monthEnd: "31-Jan-26", openDate: "31-Oct-24", dueDate: "28-Feb-26" },
        },
        {
          value: "Weekly",
          dueDateRule: "Every Friday",
          openDateRule: "Task created every Friday",
        },
      ],
    },
    relatedTasks: [],
  },

  [TASK_TYPES.PAYROLL]: {
    generation: {
      trigger: "Payroll service enabled for client",
      frequencies: [
        { value: "Weekly",        openDateRule: "5 days before pay date" },
        { value: "Bi-Weekly",     openDateRule: "5 days before pay date" },
        { value: "Monthly",       openDateRule: "25th of the same month as pay date" },
        { value: "15th and Last day of Month", openDateRule: "5 days before pay date" },
      ],
    },
    relatedTasks: [
      {
        taskKey: "PD7A", displayName: "PD7A",
        condition: "Clients with payroll service",
        generation: { frequency: "25th of each month", dueDateRule: "15th of following month" },
      },
      {
        taskKey: "WCB", displayName: "WCB",
        condition: "Clients with WCB service",
        generation: { frequency: "25th of each month", dueDateRule: "15th of following month" },
      },
      {
        taskKey: "T4",  displayName: "T4",  condition: "When T4 selected at client setup" },
      { taskKey: "T4A", displayName: "T4A", condition: "When T4A selected at client setup" },
      { taskKey: "T5018", displayName: "T5018", condition: "When T5018 selected at client setup" },
      { taskKey: "T5",  displayName: "T5",  condition: "When T5 selected at client setup" },
    ],
  },

  [TASK_TYPES.PD7A]: {
    generation: {
      trigger: "Client has payroll service",
      frequency: "25th of each month",
      dueDateRule: "15th of the following month",
    },
    relatedTasks: [],
  },

  [TASK_TYPES.WCB]: {
    generation: {
      trigger: "Client has WCB service",
      frequency: "25th of each month",
      dueDateRule: "15th of the following month",
    },
    relatedTasks: [],
  },

  [TASK_TYPES.T4]: {
    generation: {
      trigger: "T4 service selected for client",
      frequency: "December 1 every year",
      dueDateRule: "February 28 of the following year",
    },
    relatedTasks: [],
  },

  [TASK_TYPES.T4A]: {
    generation: {
      trigger: "T4A service selected for client",
      frequency: "December 1 every year",
      dueDateRule: "February 28 of the following year",
    },
    relatedTasks: [],
  },

  [TASK_TYPES.T5018]: {
    generation: {
      trigger: "T5018 service selected for client",
      dueDateRule: "6 months after T2 year end",
      openDateRule: "3 months before filing deadline",
      examples: [
        { t2YearEnd: "31-Mar-26", filingDeadline: "30-Sep-26", taskGenerated: "30-Jun-26" },
        { t2YearEnd: "31-Jan-26", filingDeadline: "31-Jul-26", taskGenerated: "31-Oct-25" },
      ],
    },
    relatedTasks: [],
  },

  [TASK_TYPES.T5]: {
    generation: {
      trigger: "T5 service selected for client",
      frequency: "December 1 every year",
      dueDateRule: "February 28 of the following year",
    },
    relatedTasks: [],
  },

  [TASK_TYPES.CORPORATE_TAX_QUARTERLY_PAYMENT]: {
    generation: {
      trigger: "CRA Installment in T2 is Yes and tax year end is filled",
      frequency: "Quarterly based on tax year end",
      openDateRule: "1 month before quarterly task date",
    },
    relatedTasks: [],
  },

  [TASK_TYPES.HST_QUARTERLY_PAYMENT]: {
    generation: {
      trigger: "CRA Installment in HST is Yes and tax year end is filled",
      frequency: "Quarterly based on tax year end",
      openDateRule: "1 month before quarterly task date",
    },
    relatedTasks: [],
  },
};

function getWorkflowMetadata(taskType) {
  const wf = WORKFLOWS[taskType];
  const meta = WORKFLOW_METADATA[taskType];
  if (!wf) return null;

  return {
    taskType,
    displayName:     wf.displayName,
    subtaskWorkflow: buildSubtaskWorkflow(wf),
    progressMilestones: [...new Set(wf.subtasks.map((s) => wf.clientProgressMap[s]).filter(Boolean))],
    configFields:    wf.configFields,
    documentCatalog: meta?.documentCatalog || null,
    documentNote:    meta?.documentNote || null,
    generation:      meta?.generation || null,
    relatedTasks:    meta?.relatedTasks || [],
  };
}

function getAllWorkflowMetadata() {
  return Object.keys(WORKFLOWS).map(getWorkflowMetadata);
}

module.exports = {
  WORKFLOW_METADATA,
  buildSubtaskWorkflow,
  getWorkflowMetadata,
  getAllWorkflowMetadata,
};
