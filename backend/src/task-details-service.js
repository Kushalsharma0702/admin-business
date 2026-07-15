// task-details-service.js — builds unified client task detail payload
const db = require("./db");
const { safeJson, formatSubmission, formatTemplateVersion } = require("./helpers");
const { getWorkflow, getClientProgress } = require("./workflows");
const { getConfigSchemaForTaskType, buildConfigValues } = require("./config-fields");
const { getWorkflowMetadata } = require("./workflow-metadata");

const { buildDocumentRequirements } = require("./document-requirements");

function formatClientTaskBase(row) {
  return {
    id:             row.id,
    slug:           row.slug ?? null,
    taskType:       row.task_type ?? null,
    taskName:       row.title,
    clientProgress: row.client_progress ?? null,
    dueDate:        row.due_date ?? null,
    openDate:       row.open_date ?? null,
    taxYear:        row.tax_year ?? null,
    status:         row.status,
    description:    row.description ?? null,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  };
}

async function buildDocumentBuckets(task) {
  return buildDocumentRequirements(task);
}

async function buildFormFields(task, clientId) {
  if (!task.template_version_id) {
    return { formSchema: [], templateVersion: null, submission: null };
  }

  const { rows: [tv] } = await db.query(
    "SELECT * FROM task_template_versions WHERE id=$1",
    [task.template_version_id]
  );

  const { rows: [submission] } = await db.query(
    "SELECT * FROM task_submissions WHERE task_id=$1 AND client_id=$2 ORDER BY created_at DESC LIMIT 1",
    [task.id, clientId]
  );

  return {
    formSchema:      tv?.form_schema || [],
    templateVersion: tv ? formatTemplateVersion(tv) : null,
    submission:      submission ? formatSubmission(submission) : null,
  };
}

async function buildClientSubtasks(task) {
  const { rows } = await db.query(
    `SELECT id, subtask_name, subtask_order, status, completed_at
     FROM task_subtasks WHERE task_id=$1 ORDER BY subtask_order ASC`,
    [task.id]
  );

  if (!rows.length) return [];

  const wf = task.task_type ? getWorkflow(task.task_type) : null;

  return rows.map((r) => ({
    id:             r.id,
    order:          r.subtask_order,
    clientProgress: wf
      ? (getClientProgress(task.task_type, r.subtask_name) || r.subtask_name)
      : r.subtask_name,
    status:         r.status,
    completedAt:    r.completed_at,
  }));
}

function buildConfigBlock(task) {
  const stored = safeJson(task.config, {});
  const schema = getConfigSchemaForTaskType(task.task_type);
  if (!schema.length) {
    return {
      config:       Object.keys(stored).length ? stored : null,
      configSchema: [],
    };
  }
  return {
    config:       buildConfigValues(task.task_type, stored),
    configSchema: schema,
  };
}

function deriveActions({ task, formSchema, documentBuckets, querySheetRowCount, metadata }) {
  const actions = [];

  if (formSchema?.length) actions.push("fill_form");
  if (documentBuckets?.length) actions.push("upload_documents");
  if (querySheetRowCount > 0) actions.push("view_query_sheet");
  if (metadata.route) actions.push("navigate");
  if (metadata.submissionModes?.includes("excel_upload")) actions.push("upload_query_sheet");
  if (metadata.configSchema?.length) actions.push("save_config");
  if (task.status === "pending") actions.push("mark_complete");

  return [...new Set(actions)];
}

async function buildClientTaskDetails(task, clientId) {
  const meta = safeJson(task.metadata, {});
  const wf = task.task_type ? getWorkflow(task.task_type) : null;

  const [subtasks, documentBuckets, formBlock, qsCount] = await Promise.all([
    buildClientSubtasks(task),
    buildDocumentBuckets(task),
    buildFormFields(task, clientId),
    db.query("SELECT COUNT(*)::int AS c FROM query_sheet_rows WHERE task_id=$1", [task.id])
      .then((r) => r.rows[0].c),
  ]);

  const { config, configSchema } = buildConfigBlock(task);

  const totalDocSlots = documentBuckets.reduce((n, b) => n + b.quantity, 0);
  const uploadedDocSlots = documentBuckets.reduce((n, b) => n + b.uploadedCount, 0);

  const fields = {
    config,
    configSchema,
    formSchema:      formBlock.formSchema,
    documentRequirements: documentBuckets.length ? documentBuckets : null,
    documentBuckets: documentBuckets.length ? documentBuckets : null, // alias for backward compat
    documentSummary: documentBuckets.length ? {
      totalSlots:     totalDocSlots,
      uploadedSlots:  uploadedDocSlots,
      pendingSlots:   totalDocSlots - uploadedDocSlots,
      complete:       uploadedDocSlots >= totalDocSlots,
    } : null,
    querySheet: qsCount > 0 ? {
      totalRows:   qsCount,
      downloadUrl: meta.downloadUrl || null,
    } : null,
    metadata: {
      route:           meta.route || null,
      submissionModes: meta.submissionModes || null,
      editableField:   meta.editableField || null,
      readOnlyFields:  meta.readOnlyFields || null,
    },
  };

  const actions = deriveActions({
    task,
    formSchema: formBlock.formSchema,
    documentBuckets,
    querySheetRowCount: qsCount,
    metadata: { ...meta, configSchema },
  });

  const workflowMeta = task.task_type ? getWorkflowMetadata(task.task_type) : null;

  return {
    task: formatClientTaskBase(task),
    workflow: workflowMeta ? {
      taskType:              task.task_type,
      displayName:           workflowMeta.displayName,
      currentClientProgress: task.client_progress,
      progressMilestones:    workflowMeta.progressMilestones,
      subtaskWorkflow:       workflowMeta.subtaskWorkflow,
      generation:            workflowMeta.generation,
      relatedTasks:          workflowMeta.relatedTasks,
    } : null,
    subtasks,
    fields,
    templateVersion: formBlock.templateVersion,
    submission:      formBlock.submission,
    actions,
  };
}

module.exports = { buildClientTaskDetails };
