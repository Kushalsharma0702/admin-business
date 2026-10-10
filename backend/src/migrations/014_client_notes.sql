-- 014_client_notes.sql
-- Internal admin notes per client, with optional image attachments.
-- Admin-only (requireAuth("admin")) — never exposed to the client app/mobile.

CREATE TABLE IF NOT EXISTS client_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id   UUID        REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT,
  text        TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_notes_client ON client_notes(client_id);

CREATE TABLE IF NOT EXISTS client_note_images (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id           UUID        NOT NULL REFERENCES client_notes(id) ON DELETE CASCADE,
  original_filename TEXT        NOT NULL,
  file_type         TEXT,
  file_size         BIGINT      NOT NULL DEFAULT 0,
  s3_key            TEXT,
  s3_bucket         TEXT        NOT NULL DEFAULT 'taxease-uploads',
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_note_images_note ON client_note_images(note_id);
