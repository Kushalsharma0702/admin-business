-- 015_admin_management.sql
-- Superadmin tier + per-admin permissions + admin audit log + per-task-type
-- client-change notification email routing (configurable by superadmin).

-- Widen the role check to allow a 'superadmin' tier above 'admin'.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'client', 'superadmin'));

-- Fine-grained permission keys for 'admin' rows (superadmin implicitly has all).
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions TEXT[] NOT NULL DEFAULT '{}';

-- Soft-disable instead of hard delete, so historical FKs (assigned_by,
-- performed_by, author_id, etc.) referencing this admin stay intact.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  admin_name  TEXT,
  action      TEXT        NOT NULL,   -- e.g. 'admin_created' | 'admin_permissions_updated' | 'admin_disabled' | 'admin_enabled' | 'notification_config_saved' | 'notification_config_deleted'
  target_type TEXT,                   -- e.g. 'admin_user' | 'notification_config'
  target_id   TEXT,
  details     JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin   ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log(created_at DESC);

-- Task-type -> notification email routing, e.g. HST -> a@gmail.com,
-- PAYROLL -> b@gmail.com. Managed by superadmin; checked when a client
-- completes/submits a task of that type.
CREATE TABLE IF NOT EXISTS task_type_notification_configs (
  task_type  TEXT        PRIMARY KEY,
  email      TEXT        NOT NULL,
  updated_by UUID        REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
