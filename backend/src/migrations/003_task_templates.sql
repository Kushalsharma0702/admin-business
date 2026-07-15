-- 003_task_templates.sql
-- Adds template system: task_templates + task_template_versions.
-- Adds template FKs to tasks table.

-- ── Task Templates ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  task_type   TEXT        NOT NULL DEFAULT 'form',
  category    TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_active     ON task_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON task_templates(created_by);

-- ── Template Versions (immutable once published) ──────────────────────────────
CREATE TABLE IF NOT EXISTS task_template_versions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  UUID        NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  version      INTEGER     NOT NULL,
  form_schema  JSONB       NOT NULL DEFAULT '[]',  -- array of FormField objects
  is_published BOOLEAN     NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_by   UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(template_id, version)
);

CREATE INDEX IF NOT EXISTS idx_template_versions_template  ON task_template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_versions_published ON task_template_versions(is_published);

-- ── Wire template FKs into tasks ─────────────────────────────────────────────
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS template_id         UUID REFERENCES task_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_version_id UUID REFERENCES task_template_versions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_template_id ON tasks(template_id);
