-- 020_task_assignee_close_doc_requests.sql
-- Three additions to the task model, all driven by the admin task panel:
--
--  1. assigned_to  — which staff member owns the task. `assigned_by` (001)
--     already records who handed it to the client; that is a different fact
--     and is deliberately left alone.
--  2. closed_at/closed_by — an admin-side "done". Kept separate from
--     `status`/`completed_at`, which mean "the CLIENT finished their part":
--     an admin closing a task the client never submitted must not make the
--     task read as complete in the Flutter app.
--  3. Per-task document requests live in tasks.metadata->'documentRequests'
--     (JSONB, no DDL needed) — same shape as general_doc_configs.fields.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS closed_at   TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS closed_by   UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
-- Partial index: the Active list is "closed_at IS NULL", the Closed list pages
-- by closed_at DESC. Both are per-client, hence the leading client_id.
CREATE INDEX IF NOT EXISTS idx_tasks_open_by_client   ON tasks(client_id) WHERE closed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_closed_by_client ON tasks(client_id, closed_at DESC) WHERE closed_at IS NOT NULL;
