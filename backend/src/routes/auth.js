// routes/auth.js — login, me, accept-invite, setup-password
const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { fail, ok, hashPassword, verifyPassword, generateInviteToken } = require("../helpers");
const { requireAuth, JWT_SECRET } = require("../middleware/auth");
const env = require("../config/env");

const router = express.Router();

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json(fail("email and password are required"));
  }

  const { rows } = await db.query("SELECT * FROM users WHERE email=$1", [email]);
  const user = rows[0];

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json(fail("Invalid email or password"));
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return res.json(ok({
    token,
    user: {
      id:                 user.id,
      email:              user.email,
      name:               user.name,
      role:               user.role,
      portalStatus:       user.portal_status,
      mustChangePassword: user.must_change_password,
    },
  }, "Login successful"));
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get("/me", requireAuth(), async (req, res) => {
  const { rows } = await db.query(
    "SELECT id,email,name,role,portal_status,must_change_password FROM users WHERE id=$1",
    [req.user.sub]
  );
  const user = rows[0];
  if (!user) return res.status(404).json(fail("User not found"));
  return res.json(ok({
    id:                 user.id,
    email:              user.email,
    name:               user.name,
    role:               user.role,
    portalStatus:       user.portal_status,
    mustChangePassword: user.must_change_password,
  }));
});

// ── GET /api/auth/invite-info/:token ─────────────────────────────────────────
// Validate invite token WITHOUT consuming it (used by frontend to show correct UI)
router.get("/invite-info/:token", async (req, res) => {
  const { token } = req.params;
  const { rows } = await db.query(
    `SELECT it.*, u.email, u.name
     FROM invite_tokens it
     JOIN users u ON it.user_id = u.id
     WHERE it.token = $1`,
    [token]
  );
  const row = rows[0];

  if (!row) return res.status(404).json(fail("Invite not found"));
  if (row.used_at) return res.status(410).json(fail("This invite has already been used. Please log in."));
  if (new Date(row.expires_at) < new Date()) return res.status(410).json(fail("This invite has expired. Ask your admin to resend it."));

  return res.json(ok({ email: row.email, name: row.name, expiresAt: row.expires_at }, "Invite valid"));
});

// ── POST /api/auth/accept-invite ──────────────────────────────────────────────
router.post("/accept-invite", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json(fail("token and password are required"));
  if (password.length < 8) return res.status(400).json(fail("Password must be at least 8 characters"));

  const { rows } = await db.query(
    `SELECT it.*, u.email, u.name, u.phone FROM invite_tokens it
     JOIN users u ON it.user_id = u.id
     WHERE it.token = $1`,
    [token]
  );
  const row = rows[0];

  if (!row) return res.status(404).json(fail("Invite not found"));
  if (row.used_at) return res.status(410).json(fail("Invite already used"));
  if (new Date(row.expires_at) < new Date()) return res.status(410).json(fail("Invite expired"));

  const hashed = await hashPassword(password);

  await db.query(
    `UPDATE users
     SET password_hash=$1, must_change_password=FALSE, portal_status='active', updated_at=NOW()
     WHERE id=$2`,
    [hashed, row.user_id]
  );
  await db.query(
    "UPDATE invite_tokens SET used_at=NOW() WHERE id=$1",
    [row.id]
  );

  // Sync to main Flutter database so the client can login to the mobile app as a business user
  if (db.mainQuery) {
    try {
      const nameParts = (row.name || "").trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      // Remove any stale record with the same email but a different UUID (e.g. re-invited user)
      // so the Flutter DB UUID always matches the taxease_admin UUID.
      await db.mainQuery(
        `DELETE FROM users WHERE email=LOWER($1) AND id != $2`,
        [row.email, row.user_id]
      );
      await db.mainQuery(
        `INSERT INTO users (id, email, first_name, last_name, phone, password_hash, email_verified, is_active, customer_type, created_at, updated_at)
         VALUES ($1, LOWER($2), $3, $4, $5, $6, TRUE, TRUE, 'BusinessTax', NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           customer_type = 'BusinessTax',
           email_verified = TRUE,
           is_active = TRUE,
           updated_at = NOW()`,
        [row.user_id, row.email, firstName, lastName, row.phone || null, hashed]
      );
      // Also create a client record in the admin clients table
      await db.mainQuery(
        `INSERT INTO clients (id, name, email, phone, filing_year, status, payment_status, total_amount, paid_amount, created_at, updated_at)
         VALUES ($1, $2, LOWER($3), $4, $5, 'documents_pending', 'pending', 0.0, 0.0, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [row.user_id, row.name, row.email, row.phone || null, new Date().getFullYear()]
      );
      console.log(`Synced business client ${row.email} to main Flutter database`);
    } catch (err) {
      console.error(`Failed to sync ${row.email} to main DB (non-blocking):`, err.message);
    }
  }

  return res.json(ok({
    email: row.email,
    appDeepLink: "diamondaccounts://login",
  }, "Password set successfully! You can now log in to the Diamond Accounts app."));
});

// ── POST /api/auth/setup-password (requires JWT — for must_change_password) ──
router.post("/setup-password", requireAuth(), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json(fail("currentPassword and newPassword are required"));
  }
  if (newPassword.length < 8) return res.status(400).json(fail("Password must be at least 8 characters"));

  const { rows } = await db.query("SELECT * FROM users WHERE id=$1", [req.user.sub]);
  const user = rows[0];
  if (!user) return res.status(404).json(fail("User not found"));

  if (!(await verifyPassword(currentPassword, user.password_hash))) {
    return res.status(401).json(fail("Current password is incorrect"));
  }

  const hashed = await hashPassword(newPassword);
  await db.query(
    "UPDATE users SET password_hash=$1, must_change_password=FALSE, updated_at=NOW() WHERE id=$2",
    [hashed, user.id]
  );

  return res.json(ok({}, "Password updated successfully"));
});

module.exports = router;
