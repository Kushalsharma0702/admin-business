-- 005_s3_columns.sql
-- Ensures S3 columns exist on document tables (idempotent).
-- Safe to run even if 001 already included these columns.

ALTER TABLE task_documents
  ADD COLUMN IF NOT EXISTS s3_key    TEXT,
  ADD COLUMN IF NOT EXISTS s3_bucket TEXT NOT NULL DEFAULT 'taxease-uploads';

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS s3_key    TEXT,
  ADD COLUMN IF NOT EXISTS s3_bucket TEXT NOT NULL DEFAULT 'taxease-uploads';

-- Index for fast S3 key lookups
CREATE INDEX IF NOT EXISTS idx_task_documents_s3_key ON task_documents(s3_key);
CREATE INDEX IF NOT EXISTS idx_documents_s3_key      ON documents(s3_key);
