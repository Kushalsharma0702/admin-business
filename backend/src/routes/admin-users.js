// routes/admin-users.js — Superadmin-only: manage staff (admin) accounts,
// their fine-grained permissions, and view the admin audit log.
//
// Enforced permission keys today (extend by adding more requirePermission()
// calls on other routers as they're wired up):
//   manage_admins        — this router (create/disable/permission staff)
//   manage_notifications — task-type -> notification-email routing
const express = require("express");
const db = require("../db");
const { fail, ok } = require("../helpers");
const { requireAuth } = require("../middleware/auth");
const { requireSuperAdmin, logAdminAction } = require("../middleware/permissions");
const { hashPassword } = require("../helpers");

const PERMISSION_KEYS = ["manage_admins", "manage_notifications"];

const router = express.Router();
router.use(requireAuth("admin"));
router.use(requireSuperAdmin);

function serializeAdmin(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    permissions: row.permissions || [],
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

// GET /api/admin/admins — list all staff (admin + superadmin) accounts
router.get("/admins", async (_req, res) => {
  const { rows } = await db.query(
    "SELECT * FROM users WHERE role IN ('admin','superadmin') ORDER BY created_at"
  );
  return res.json(ok(rows.map(serializeAdmin), "Admins fetched"));
});

// GET /api/admin/permission-keys — the fixed set of grantable permission keys
router.get("/permission-keys", (_req, res) => {
  return res.json(ok(PERMISSION_KEYS, "Permission keys fetched"));
});

// POST /api/admin/admins — create a new staff account
// body: { name, email, password, permissions?: string[] }
router.post("/admins", async (req, res) => {
  const { name, email, password } = req.body || {};
  const permissions = Array.isArray(req.body?.permissions)
    ? req.body.permissions.filter((p) => PERMISSION_KEYS.includes(p))
    : [];

  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json(fail("name, email and password are required"));
  }
  if (String(password).length < 8) {
    return res.status(400).json(fail("Password must be at least 8 characters"));
  }

  const { rows: [existing] } = await db.query(
    "SELECT id FROM users WHERE email=LOWER($1)",
    [email]
  );
  if (existing) return res.status(409).json(fail("A user with this email already exists"));

  const passwordHash = await hashPassword(password);
  const { rows: [created] } = await db.query(
    `INSERT INTO users (email, password_hash, name, role, permissions, is_active, portal_status, must_change_password)
     VALUES (LOWER($1), $2, $3, 'admin', $4, TRUE, 'active', FALSE)
     RETURNING *`,
    [email, passwordHash, name.trim(), permissions]
  );

  await logAdminAction({
    adminId: req.user.sub, adminName: req.user.name,
    action: "admin_created", targetType: "admin_user", targetId: created.id,
    details: { name: created.name, email: created.email, permissions },
  });

  return res.status(201).json(ok(serializeAdmin(created), "Admin created"));
});

// PATCH /api/admin/admins/:id — update permissions and/or active status
// body: { permissions?: string[], isActive?: boolean }
router.patch("/admins/:id", async (req, res) => {
  const { rows: [target] } = await db.query(
    "SELECT * FROM users WHERE id=$1 AND role IN ('admin','superadmin')",
    [req.params.id]
  );
  if (!target) return res.status(404).json(fail("Admin not found"));

  if (target.role === "superadmin") {
    return res.status(400).json(fail("Superadmin permissions/status cannot be edited here"));
  }
  if (target.id === req.user.sub) {
    return res.status(400).json(fail("You cannot change your own access"));
  }

  const changes = {};
  let permissions = target.permissions;
  if (req.body?.permissions !== undefined) {
    if (!Array.isArray(req.body.permissions)) return res.status(400).json(fail("permissions must be an array"));
    permissions = req.body.permissions.filter((p) => PERMISSION_KEYS.includes(p));
    changes.permissions = permissions;
  }
  let isActive = target.is_active;
  if (req.body?.isActive !== undefined) {
    isActive = req.body.isActive === true;
    changes.isActive = isActive;
  }

  const { rows: [updated] } = await db.query(
    "UPDATE users SET permissions=$1, is_active=$2, updated_at=NOW() WHERE id=$3 RETURNING *",
    [permissions, isActive, target.id]
  );

  await logAdminAction({
    adminId: req.user.sub, adminName: req.user.name,
    action: isActive === target.is_active ? "admin_permissions_updated" : (isActive ? "admin_enabled" : "admin_disabled"),
    targetType: "admin_user", targetId: target.id,
    details: { ...changes, adminName: target.name, adminEmail: target.email },
  });

  return res.json(ok(serializeAdmin(updated), "Admin updated"));
});

// DELETE /api/admin/admins/:id — remove an admin's access (soft: is_active=false).
// Kept as a hard "delete" a row is never removed, since historical FKs
// (assigned_by, performed_by, author_id, ...) reference this user.
router.delete("/admins/:id", async (req, res) => {
  const { rows: [target] } = await db.query(
    "SELECT * FROM users WHERE id=$1 AND role IN ('admin','superadmin')",
    [req.params.id]
  );
  if (!target) return res.status(404).json(fail("Admin not found"));
  if (target.role === "superadmin") return res.status(400).json(fail("Cannot remove a superadmin"));
  if (target.id === req.user.sub) return res.status(400).json(fail("You cannot remove your own access"));

  await db.query("UPDATE users SET is_active=FALSE, updated_at=NOW() WHERE id=$1", [target.id]);

  await logAdminAction({
    adminId: req.user.sub, adminName: req.user.name,
    action: "admin_disabled", targetType: "admin_user", targetId: target.id,
    details: { adminName: target.name, adminEmail: target.email, reason: "removed" },
  });

  return res.json(ok({ id: target.id }, "Admin removed"));
});

// GET /api/admin/admins/:id/logs — audit trail for one admin
router.get("/admins/:id/logs", async (req, res) => {
  const { rows } = await db.query(
    "SELECT * FROM admin_audit_log WHERE admin_id=$1 ORDER BY created_at DESC LIMIT 200",
    [req.params.id]
  );
  return res.json(ok(rows.map((r) => ({
    id: r.id, action: r.action, targetType: r.target_type, targetId: r.target_id,
    details: r.details, createdAt: r.created_at,
  })), "Audit log fetched"));
});

// GET /api/admin/audit-log — full audit trail across all admins
router.get("/audit-log", async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const per_page = Math.min(200, Math.max(1, Number(req.query.per_page || 50)));
  const offset = (page - 1) * per_page;

  const [{ rows }, { rows: cnt }] = await Promise.all([
    db.query("SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT $1 OFFSET $2", [per_page, offset]),
    db.query("SELECT COUNT(*)::int AS total FROM admin_audit_log"),
  ]);

  return res.json(ok({
    entries: rows.map((r) => ({
      id: r.id, adminId: r.admin_id, adminName: r.admin_name, action: r.action,
      targetType: r.target_type, targetId: r.target_id, details: r.details, createdAt: r.created_at,
    })),
    page, perPage: per_page, total: cnt[0].total,
  }, "Audit log fetched"));
});

module.exports = router;
