-- 021_task_period_end.sql
-- Exposes each auto-generated filing task's reporting-period end date as its
-- own column so the admin Tasks tab can filter by it directly, instead of it
-- only being reachable by parsing metadata->>'periodKey' (T2/HST) or reading
-- metadata->'bookkeepingPeriod'->>'end' (Bookkeeping). Backfilled for existing
-- rows from whichever of those two the task actually has; NULL for anything
-- without one (e.g. installment-payment tasks, which aren't period-based).

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS period_end DATE;

UPDATE tasks SET period_end = (metadata->'bookkeepingPeriod'->>'end')::date
WHERE period_end IS NULL AND metadata->'bookkeepingPeriod'->>'end' IS NOT NULL;

UPDATE tasks SET period_end = substring(metadata->>'periodKey' from '\d{4}-\d{2}-\d{2}$')::date
WHERE period_end IS NULL
  AND metadata->>'periodKey' ~ '^(T2|HST):\d{4}-\d{2}-\d{2}$';

CREATE INDEX IF NOT EXISTS idx_tasks_period_end ON tasks(period_end);
