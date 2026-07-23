-- 013_client_take_on.sql
-- Stores business client take-on form (admin panel tab).

CREATE TABLE IF NOT EXISTS client_take_on_submissions (
  client_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  answers      JSONB NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'not_started'
               CHECK (status IN ('not_started', 'draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_take_on_status ON client_take_on_submissions(status);
