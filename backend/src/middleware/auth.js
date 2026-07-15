// middleware/auth.js — JWT verification + role-based guard (async for pg)
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const db  = require("../db");

const JWT_SECRET = env.JWT_SECRET;

// Ensures a business client exists in taxease_admin (db.query DB). App clients log
// in via the Python API and are stored in the Flutter DB (db.mainQuery); their
// business features (profiles, general-docs, onboarding, payroll) are keyed to a
// taxease_admin user row via FK. If that row is missing (e.g. a direct app signup
// that never went through the admin invite flow), self-heal by provisioning it
// from the Flutter DB record using the SAME UUID so both sides stay consistent.
//
// Returns: true  — user is provisioned and ready
//          false — user genuinely unknown (invalid token)
//          null  — provisioning failed due to server-side issue (DB unavailable,
//                  email conflict, etc.) — caller should return 503, not 401.
async function ensureClientProvisioned(userId) {
  // Fast path: user already in taxease_admin with the correct UUID.
  const { rows } = await db.query(
    "SELECT id FROM users WHERE id=$1 AND role='client'",
    [userId]
  );
  if (rows[0]) return true;

  // No cross-reference DB available — can't auto-provision.
  // Return null so the caller responds with 503 (not 401) and avoids a forced logout.
  if (!db.mainQuery) {
    console.warn(`ensureClientProvisioned: MAIN_DATABASE_URL not configured — cannot auto-provision ${userId}`);
    return null;
  }

  // Pull the canonical record from the Flutter DB.
  const { rows: mrows } = await db.mainQuery(
    "SELECT id, email, first_name, last_name, phone, password_hash FROM users WHERE id=$1",
    [userId]
  );
  const m = mrows[0];
  if (!m) return false; // Unknown in both DBs — genuinely invalid JWT sub.

  const name = [m.first_name, m.last_name].filter(Boolean).join(" ").trim() || m.email;

  try {
    await db.query(
      `INSERT INTO users (id, email, name, role, phone, password_hash, portal_status, must_change_password, created_at, updated_at)
       VALUES ($1, LOWER($2), $3, 'client', $4, $5, 'active', FALSE, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [m.id, m.email, name, m.phone || null, m.password_hash || "external-auth"]
    );
    console.log(`Auto-provisioned business client ${m.email} (${m.id}) into taxease_admin`);
  } catch (err) {
    // Email-unique conflict: a stale taxease_admin record owns this email under a
    // different UUID (UUID drift from a re-invite). FKs don't have ON UPDATE CASCADE
    // so we cannot safely remap the UUID here. Log and signal a server-side failure
    // (null → 503) instead of reporting the user as unauthorized (false → 401/logout).
    console.error(`Auto-provision conflict for ${m.email} (${m.id}): ${err.message}`);
    console.error(`Manual reconciliation needed: run UPDATE users SET id='${m.id}' WHERE email=LOWER('${m.email}') AND role='client' in taxease_admin`);
    return null;
  }

  const { rows: recheck } = await db.query(
    "SELECT id FROM users WHERE id=$1 AND role='client'",
    [userId]
  );
  return !!recheck[0];
}

function requireAuth(role) {
  return async (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.replace("Bearer ", "").trim();
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    if (role) {
      // Accept portal tokens (role:"client"), Flutter/Python tokens (role:"user",type:"access"),
      // and legacy no-role tokens (type:"access") as valid client tokens.
      const isClientToken = payload.role === role
        || (role === "client" && payload.type === "access" && (!payload.role || payload.role === "user"));
      if (!isClientToken) {
        return res.status(403).json({ success: false, message: "Forbidden: insufficient role" });
      }

      // For client tokens: make sure the taxease_admin user row exists (self-healing).
      // This prevents FK crashes in downstream routes (profiles/general-docs/onboarding).
      if (role === "client") {
        try {
          const provisionResult = await ensureClientProvisioned(payload.sub);
          if (provisionResult === false) {
            // User is genuinely unknown in both databases — invalid credentials.
            return res.status(401).json({
              success: false,
              message: "User account not found. Please sign in again.",
            });
          }
          if (provisionResult === null) {
            // Server-side provisioning error (DB unavailable, email conflict, etc.).
            // Return 503 — NOT 401 — so the mobile AuthInterceptor does NOT force a logout.
            return res.status(503).json({
              success: false,
              message: "Account setup is still in progress. Please try again in a moment.",
            });
          }
          // provisionResult === true: all good, continue.
        } catch (err) {
          console.error("Client provisioning check failed:", err.message);
          return res.status(503).json({ success: false, message: "Account verification failed. Please try again." });
        }
      }
    }

    req.user = payload;
    return next();
  };
}

module.exports = { requireAuth, JWT_SECRET };
