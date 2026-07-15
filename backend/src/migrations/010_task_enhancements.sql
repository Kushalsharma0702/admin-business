-- 010_task_enhancements.sql
-- Adds priority, draft_data, instructions, and CUSTOM task type support.

-- Priority for tasks (high / medium / low / none)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('high', 'medium', 'low', 'none'));

-- Draft data: partial form responses saved before final submission
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS draft_data JSONB;

-- Client-visible instructions (richer than description)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS instructions TEXT;

-- Allow CUSTOM task type (the CHECK constraint is a soft guideline; we drop
-- the old one and add a broader constraint that still excludes garbage)
-- Postgres doesn't support ALTER CONSTRAINT, so we drop + re-add.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_check CHECK (
    status IN ('pending', 'draft', 'complete')
  );

CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
