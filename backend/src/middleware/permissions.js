// middleware/permissions.js — superadmin + fine-grained permission gates for
// the admin-management and notification-config routes.
//
// Unlike requireAuth("admin") (JWT-payload-trust-only, no per-request DB hit —
// see auth.js), these checks re-read role/permissions/is_active from the DB on
// every request. That's deliberate: this guards the routes that grant or
// revoke access itself, so a just-revoked admin must be locked out immediately
// rather than waiting for their existing JWT to expire.
const db = require("../db");
const { fail } = require("../helpers");

async function loadCaller(req) {
  const { rows: [row] } = await db.query(
    "SELECT id, role, permissions, is_active FROM users WHERE id=$1",
    [req.user.sub]
  );
  return row || null;
}

async function requireSuperAdmin(req, res, next) {
  const caller = await loadCaller(req);
  if (!caller || !caller.is_active || caller.role !== "superadmin") {
    return res.status(403).json(fail("Superadmin access required"));
  }
  next();
}

function requirePermission(key) {
  return async (req, res, next) => {
    const caller = await loadCaller(req);
    if (!caller || !caller.is_active) {
      return res.status(403).json(fail("Forbidden"));
    }
    if (caller.role === "superadmin" || (caller.permissions || []).includes(key)) {
      return next();
    }
    return res.status(403).json(fail(`Missing permission: ${key}`));
  };
}

async function logAdminAction({ adminId, adminName, action, targetType, targetId, details }) {
  try {
    await db.query(
      `INSERT INTO admin_audit_log (admin_id, admin_name, action, target_type, target_id, details)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [adminId || null, adminName || null, action, targetType || null, targetId || null, JSON.stringify(details || {})]
    );
  } catch (err) {
    // Never let audit logging break the actual request.
    console.error("logAdminAction failed:", err.message);
  }
}

module.exports = { requireSuperAdmin, requirePermission, logAdminAction };
