-- 009_general_documentation.sql
-- Per-client general documentation configuration and uploads.
-- "General Documentation" is a pre-task document checklist the admin
-- enables when inviting a client (e.g. bank statements, GST cert, etc.).

-- ── General Doc Config (per client) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS general_doc_configs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enabled     BOOLEAN     NOT NULL DEFAULT TRUE,
  -- Array of field objects: { key, name, placeholder, required, maxCount,
  --   acceptedTypes, notes, displayOrder }
  fields      JSONB       NOT NULL DEFAULT '[]',
  created_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id)
);

CREATE INDEX IF NOT EXISTS idx_general_doc_configs_client ON general_doc_configs(client_id);

-- ── General Doc Uploads (per client, per field, per slot) ─────────────────────
CREATE TABLE IF NOT EXISTS general_doc_uploads (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field_key         TEXT        NOT NULL,
  slot_index        INTEGER     NOT NULL DEFAULT 1,
  file_name         TEXT        NOT NULL,
  original_filename TEXT        NOT NULL,
  file_type         TEXT,
  file_size         BIGINT      NOT NULL DEFAULT 0,
  s3_key            TEXT,
  s3_bucket         TEXT        NOT NULL DEFAULT 'taxease-uploads',
  status            TEXT        NOT NULL DEFAULT 'uploaded',
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_general_doc_uploads_client    ON general_doc_uploads(client_id);
CREATE INDEX IF NOT EXISTS idx_general_doc_uploads_field_key ON general_doc_uploads(client_id, field_key);
