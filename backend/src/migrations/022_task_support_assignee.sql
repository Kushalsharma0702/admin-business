-- 022_task_support_assignee.sql
-- Every task gets a second, independent assignee alongside the existing
-- `assigned_to` (now labelled "Processing team" in the UI): `support_assigned_to`
-- ("Support team"). Deliberately a separate column, not a rename of
-- assigned_to - both are populated independently and a task can have one,
-- the other, both or neither.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS support_assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_support_assigned_to ON tasks(support_assigned_to);
