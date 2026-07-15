-- 004_task_submissions.sql
-- Adds task_submissions table for storing dynamic form responses,
-- draft saves, attachments, and review workflow.

CREATE TABLE IF NOT EXISTS task_submissions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id             UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  client_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_version_id UUID        REFERENCES task_template_versions(id) ON DELETE SET NULL,
  status              TEXT        NOT NULL DEFAULT 'draft'
                                  CHECK (status IN ('draft', 'submitted', 'reviewed', 'rejected')),
  form_data           JSONB       NOT NULL DEFAULT '{}',
  -- attachments: [{ fieldId, s3Key, s3Bucket, fileName, fileSize, uploadedAt }]
  attachments         JSONB       NOT NULL DEFAULT '[]',
  submitted_at        TIMESTAMPTZ,
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         UUID        REFERENCES users(id) ON DELETE SET NULL,
  review_notes        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_task_id   ON task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_submissions_client_id ON task_submissions(client_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status    ON task_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_tmpl_ver  ON task_submissions(template_version_id);

-- GIN index for querying inside form_data JSONB
CREATE INDEX IF NOT EXISTS idx_submissions_form_data_gin ON task_submissions USING GIN (form_data);
