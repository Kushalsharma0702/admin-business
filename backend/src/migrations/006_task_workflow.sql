-- 006_task_workflow.sql
-- Adds subtask workflow system: task_subtasks table + new workflow columns on tasks.
-- This enables the two-layer model: internal subtasks → client-visible progress.

-- ── New columns on tasks ──────────────────────────────────────────────────────
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS current_subtask  TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS client_progress  TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date         DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS open_date        DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tax_year         INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS config           JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_tasks_task_type       ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_client_progress ON tasks(client_progress);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date        ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_tax_year        ON tasks(tax_year);

-- ── Task Subtasks ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_subtasks (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id        UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  subtask_name   TEXT        NOT NULL,
  subtask_order  INTEGER     NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'active', 'completed', 'skipped')),
  completed_at   TIMESTAMPTZ,
  completed_by   UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, subtask_order)
);

CREATE INDEX IF NOT EXISTS idx_task_subtasks_task   ON task_subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_task_subtasks_status ON task_subtasks(status);

-- ── Activity Log ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_activity_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id        UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  action         TEXT        NOT NULL,  -- e.g. 'subtask_advanced', 'subtask_completed'
  from_subtask   TEXT,
  to_subtask     TEXT,
  from_progress  TEXT,
  to_progress    TEXT,
  performed_by   UUID        REFERENCES users(id) ON DELETE SET NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_task ON task_activity_log(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_time ON task_activity_log(created_at);
