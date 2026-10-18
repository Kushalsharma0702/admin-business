-- 017_task_comments_attachments.sql
-- Internal admin comments and general-purpose file attachments per task, plus
-- the task-detail view that surfaces them. Mirrors client_notes/client_note_images
-- (014) but scoped to a task instead of a client, and attachments accept any
-- file type rather than just images. Admin-only — never exposed to the client app.

CREATE TABLE IF NOT EXISTS task_comments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id   UUID        REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT,
  text        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);

CREATE TABLE IF NOT EXISTS task_attachments (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id           UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by       UUID        REFERENCES users(id) ON DELETE SET NULL,
  uploaded_by_name  TEXT,
  original_filename TEXT        NOT NULL,
  file_type         TEXT,
  file_size         BIGINT      NOT NULL DEFAULT 0,
  s3_key            TEXT,
  s3_bucket         TEXT        NOT NULL DEFAULT 'taxease-uploads',
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments(task_id);
