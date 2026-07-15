-- 001_initial_schema.sql
-- Base schema: replaces SQLite tables with PostgreSQL equivalents.
-- Uses UUIDs, JSONB, TIMESTAMPTZ, and proper constraints.
-- Safe to run multiple times (all statements use IF NOT EXISTS).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email                TEXT        UNIQUE NOT NULL,
  password_hash        TEXT        NOT NULL,
  name                 TEXT        NOT NULL,
  role                 TEXT        NOT NULL DEFAULT 'client'
                                   CHECK (role IN ('admin', 'client')),
  phone                TEXT,
  ssn                  TEXT,
  dob                  DATE,
  occupation           TEXT,
  client_since         DATE,
  portal_status        TEXT        NOT NULL DEFAULT 'pending'
                                   CHECK (portal_status IN ('active', 'pending', 'none')),
  must_change_password BOOLEAN     NOT NULL DEFAULT FALSE,
  slug                 TEXT        UNIQUE,   -- preserves old text IDs during migration
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_slug   ON users(slug);

-- ── Tasks ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by         UUID        REFERENCES users(id) ON DELETE SET NULL,
  template_id         UUID,       -- FK added in migration 003
  template_version_id UUID,       -- FK added in migration 003
  title               TEXT        NOT NULL,
  description         TEXT,
  status              TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'complete')),
  admin_status        TEXT        NOT NULL DEFAULT 'Data not received',
  task_type           TEXT,
  metadata            JSONB       NOT NULL DEFAULT '{}',
  completion_note     TEXT,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_client_id    ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status       ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_admin_status ON tasks(admin_status);

-- ── Query Sheet Rows ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS query_sheet_rows (
  id             BIGSERIAL   PRIMARY KEY,
  task_id        UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  row_index      INTEGER     NOT NULL,
  date           TEXT,
  details        TEXT,
  payment        TEXT,
  receipt        TEXT,
  hst            TEXT,
  our_remarks    TEXT,
  client_remarks TEXT        NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, row_index)
);

-- ── Task Documents ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_documents (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id           UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  category          TEXT,
  file_name         TEXT        NOT NULL,
  original_filename TEXT        NOT NULL,
  file_type         TEXT,
  file_size         BIGINT      NOT NULL DEFAULT 0,
  s3_key            TEXT,
  s3_bucket         TEXT        NOT NULL DEFAULT 'taxease-uploads',
  storage_path      TEXT,       -- legacy column, kept for migration compatibility
  status            TEXT        NOT NULL DEFAULT 'uploaded',
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_documents_task ON task_documents(task_id);

-- ── OCR Documents ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filing_id         TEXT,
  name              TEXT,
  original_filename TEXT        NOT NULL,
  file_type         TEXT,
  file_size         BIGINT      NOT NULL DEFAULT 0,
  section_name      TEXT,
  document_type     TEXT        NOT NULL DEFAULT 'ocr',
  s3_key            TEXT,
  s3_bucket         TEXT        NOT NULL DEFAULT 'taxease-uploads',
  storage_path      TEXT,       -- legacy column
  status            TEXT        NOT NULL DEFAULT 'uploaded',
  ocr_status        TEXT        NOT NULL DEFAULT 'pending',
  ocr_result        JSONB,
  ocr_confidence    REAL,
  ocr_processed_at  TIMESTAMPTZ,
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_client     ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_ocr_status ON documents(ocr_status);

-- ── Employees ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                  TEXT        NOT NULL,
  email                 TEXT,
  first_name            TEXT,
  last_name             TEXT,
  middle_name           TEXT,
  date_of_birth         DATE,
  gender                TEXT,
  phone                 TEXT,
  sin                   TEXT,
  address_line_1        TEXT,
  address_line_2        TEXT,
  city                  TEXT,
  country               TEXT,
  province_state        TEXT,
  postal_code           TEXT,
  start_date            DATE,
  position              TEXT,
  department            TEXT,
  hourly_rate           NUMERIC(10, 2),
  federal_tax_credit    NUMERIC(10, 2),
  provincial_tax_credit NUMERIC(10, 2),
  salary                NUMERIC(10, 2),
  metadata              JSONB       NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_client ON employees(client_id);

-- ── Payroll Entries ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_entries (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_label      TEXT        NOT NULL,
  period_start      TIMESTAMPTZ NOT NULL,
  period_end        TIMESTAMPTZ NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'submitted')),
  employee_ids      JSONB       NOT NULL DEFAULT '[]',
  total_amount      NUMERIC(12, 2),
  notes             TEXT        NOT NULL DEFAULT '',
  document_paths    JSONB       NOT NULL DEFAULT '[]',
  metadata          JSONB       NOT NULL DEFAULT '{}',
  is_auto_generated BOOLEAN     NOT NULL DEFAULT FALSE,
  submitted_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_client ON payroll_entries(client_id);

-- ── Payroll Automation ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_automation_configs (
  id                  BIGSERIAL   PRIMARY KEY,
  client_id           UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  start_date          DATE        NOT NULL,
  frequency           TEXT        NOT NULL
                                  CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  last_generated_date TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
