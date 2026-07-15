-- 002_invite_tokens.sql
-- Adds secure invite token system for client onboarding.

ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS invite_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT        UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,           -- NULL = not yet consumed
  created_by UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_token   ON invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_user_id ON invite_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_unused
  ON invite_tokens(user_id) WHERE used_at IS NULL;
