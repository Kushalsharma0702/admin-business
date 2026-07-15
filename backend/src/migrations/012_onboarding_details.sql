-- 012_onboarding_details.sql
-- T2 business On-Boarding Details form submitted by the client after first login.
-- The field schema is a FIXED standard T2 corporate onboarding form (defined
-- server-side in routes/onboarding.js). We only persist the client's answers here.

CREATE TABLE IF NOT EXISTS onboarding_submissions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Flat map of { fieldKey: value }. "shareholders" holds an array of objects.
  answers       JSONB       NOT NULL DEFAULT '{}',
  -- draft  = saved but not submitted;  submitted = client marked complete
  status        TEXT        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft', 'submitted')),
  submitted_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_client ON onboarding_submissions(client_id);
