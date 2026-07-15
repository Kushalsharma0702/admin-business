-- 011_user_profiles.sql
-- User profiles: one login can have multiple business profiles.
-- Each profile corresponds to a business context for the same email.

CREATE TABLE IF NOT EXISTS user_profiles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_type  TEXT        NOT NULL DEFAULT 'business'
                              CHECK (profile_type IN ('personal', 'business')),
  profile_name  TEXT        NOT NULL,
  business_name TEXT,
  is_default    BOOLEAN     NOT NULL DEFAULT FALSE,
  metadata      JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Back-fill one profile per existing client so the profile picker works
-- immediately for existing data.
INSERT INTO user_profiles (user_id, profile_type, profile_name, is_default)
SELECT id, 'business', name, TRUE
FROM users
WHERE role = 'client'
ON CONFLICT DO NOTHING;
