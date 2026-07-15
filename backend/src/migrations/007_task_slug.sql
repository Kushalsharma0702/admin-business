-- 007_task_slug.sql — legacy slug IDs for mobile app compatibility (e.g. task-john-onboarding)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_tasks_slug ON tasks(slug);
