// workflow-service.js — core engine for subtask lifecycle management
const db = require("./db");
const { getWorkflow, getClientProgress, isValidSubtask, isTerminalSubtask } = require("./workflows");

// ── Create subtask rows for a new task ────────────────────────────────────────
// Called when a task is created with a known task_type.
async function initializeSubtasks(taskId, taskType) {
  const wf = getWorkflow(taskType);
  if (!wf) return;

  for (let i = 0; i < wf.subtasks.length; i++) {
    const status = i === 0 ? "active" : "pending";
    await db.query(
      `INSERT INTO task_subtasks (task_id, subtask_name, subtask_order, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (task_id, subtask_order) DO NOTHING`,
      [taskId, wf.subtasks[i], i, status]
    );
  }

  const firstSubtask    = wf.subtasks[0];
  const clientProgress  = getClientProgress(taskType, firstSubtask);

  await db.query(
    `UPDATE tasks
     SET current_subtask=$1, client_progress=$2, admin_status=$1, updated_at=NOW()
     WHERE id=$3`,
    [firstSubtask, clientProgress, taskId]
  );

  return { currentSubtask: firstSubtask, clientProgress };
}

// ── Advance to a specific subtask ─────────────────────────────────────────────
// This is the main operation: admin sets the current subtask, we:
//   1. Validate the subtask name
//   2. Mark all prior subtasks as completed
//   3. Mark the target subtask as active
//   4. Mark all subsequent subtasks as pending
//   5. Recalculate client_progress
//   6. Log activity
//   7. If terminal subtask → mark task complete
async function advanceToSubtask(taskId, subtaskName, performedBy) {
  // Load the task
  const { rows: [task] } = await db.query("SELECT * FROM tasks WHERE id=$1", [taskId]);
  if (!task) throw new Error("Task not found");

  const taskType = task.task_type;
  if (!taskType) throw new Error("Task has no task_type — cannot advance subtask");

  if (!isValidSubtask(taskType, subtaskName)) {
    const wf = getWorkflow(taskType);
    throw new Error(
      `Invalid subtask "${subtaskName}" for ${taskType}. Valid: ${wf.subtasks.join(", ")}`
    );
  }

  const wf = getWorkflow(taskType);
  const targetOrder = wf.subtasks.indexOf(subtaskName);
  const oldSubtask  = task.current_subtask;
  const oldProgress = task.client_progress;
  const newProgress = getClientProgress(taskType, subtaskName);
  const now = new Date().toISOString();

  // Mark all subtasks before targetOrder as completed
  await db.query(
    `UPDATE task_subtasks
     SET status='completed', completed_at=$1, completed_by=$2
     WHERE task_id=$3 AND subtask_order < $4 AND status != 'completed'`,
    [now, performedBy, taskId, targetOrder]
  );

  // Mark the target subtask as active
  await db.query(
    `UPDATE task_subtasks SET status='active', completed_at=NULL, completed_by=NULL
     WHERE task_id=$1 AND subtask_order=$2`,
    [taskId, targetOrder]
  );

  // Mark all subtasks after targetOrder as pending
  await db.query(
    `UPDATE task_subtasks SET status='pending', completed_at=NULL, completed_by=NULL
     WHERE task_id=$1 AND subtask_order > $2`,
    [taskId, targetOrder]
  );

  // If this is the terminal subtask, mark it completed and the task as complete
  const isTerminal = isTerminalSubtask(taskType, subtaskName);
  let taskStatus = "pending";

  if (isTerminal) {
    await db.query(
      `UPDATE task_subtasks SET status='completed', completed_at=$1, completed_by=$2
       WHERE task_id=$3 AND subtask_order=$4`,
      [now, performedBy, taskId, targetOrder]
    );
    taskStatus = "complete";
  }

  // Update the task itself
  await db.query(
    `UPDATE tasks
     SET current_subtask=$1, client_progress=$2, admin_status=$1,
         status=$3, ${isTerminal ? "completed_at=NOW()," : ""}
         updated_at=NOW()
     WHERE id=$4`,
    [subtaskName, newProgress, taskStatus, taskId]
  );

  // Activity log
  await db.query(
    `INSERT INTO task_activity_log
       (task_id, action, from_subtask, to_subtask, from_progress, to_progress, performed_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [taskId, isTerminal ? "task_completed" : "subtask_advanced",
     oldSubtask, subtaskName, oldProgress, newProgress, performedBy]
  );

  return {
    taskId,
    previousSubtask:  oldSubtask,
    currentSubtask:   subtaskName,
    previousProgress: oldProgress,
    clientProgress:   newProgress,
    taskStatus,
    isTerminal,
  };
}

// ── Get subtask list for a task (admin view) ──────────────────────────────────
async function getSubtasks(taskId) {
  const { rows } = await db.query(
    `SELECT id, subtask_name, subtask_order, status, completed_at, completed_by
     FROM task_subtasks WHERE task_id=$1 ORDER BY subtask_order ASC`,
    [taskId]
  );
  return rows.map((r) => ({
    id:           r.id,
    subtaskName:  r.subtask_name,
    subtaskOrder: r.subtask_order,
    status:       r.status,
    completedAt:  r.completed_at,
    completedBy:  r.completed_by,
  }));
}

// ── Get activity log for a task ───────────────────────────────────────────────
async function getActivityLog(taskId) {
  const { rows } = await db.query(
    `SELECT al.*, u.name AS performed_by_name
     FROM task_activity_log al
     LEFT JOIN users u ON al.performed_by = u.id
     WHERE al.task_id=$1
     ORDER BY al.created_at DESC`,
    [taskId]
  );
  return rows.map((r) => ({
    id:              r.id,
    action:          r.action,
    fromSubtask:     r.from_subtask,
    toSubtask:       r.to_subtask,
    fromProgress:    r.from_progress,
    toProgress:      r.to_progress,
    performedBy:     r.performed_by,
    performedByName: r.performed_by_name,
    notes:           r.notes,
    createdAt:       r.created_at,
  }));
}

module.exports = {
  initializeSubtasks,
  advanceToSubtask,
  getSubtasks,
  getActivityLog,
};
