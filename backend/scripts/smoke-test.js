#!/usr/bin/env node
// scripts/smoke-test.js — post-deploy verification for the invite -> login -> T2 chain.
//
// Runs against whatever this host's .env points at (production, by design —
// there is no staging environment). Creates ONE disposable client tagged
// "smoketest+<timestamp>@diamondaccounts.ca", drives it through the exact
// endpoints a real client hits, and deletes it in a `finally` block whether
// the run passes or fails. No email is ever sent: the invite token is written
// directly to the DB instead of going through POST /clients.
//
// Exit code 0 = every check passed. Non-zero = at least one failed — the
// printed report says which, so this composes with `&&` in a deploy script.
//
// Usage:  node scripts/smoke-test.js
// Required env (already present in this service's own .env):
//   DATABASE_URL, MAIN_DATABASE_URL, FRONTEND_URL
// Optional overrides:
//   BUSINESS_API_BASE   default: FRONTEND_URL with /api suffix removed, i.e. this same host
//   CLIENT_API_BASE     default: https://api.diamondaccounts.ca/v3/api/v1
//   ADMIN_API_BASE      default: https://api.diamondaccounts.ca/v2/api/v1 (health check only)
//   BACKEND_API_BASE    default: https://api.diamondaccounts.ca/v1 (health check only)

const path = require("path");
process.chdir(path.join(__dirname, ".."));

const db = require("../src/db");
const { hashPassword, generateInviteToken } = require("../src/helpers");

const TEST_EMAIL = `smoketest+${Date.now()}@diamondaccounts.ca`;
const TEST_NAME = "Smoke Test Client";
const TEST_PASSWORD = "SmokeTest_" + Date.now() + "!Aa1";

const CLIENT_API_BASE = process.env.CLIENT_API_BASE || "https://api.diamondaccounts.ca/v3/api/v1";
const ADMIN_API_HEALTH = process.env.ADMIN_API_HEALTH || "https://api.diamondaccounts.ca/v2/health";
const BACKEND_API_HEALTH = process.env.BACKEND_API_HEALTH || "https://api.diamondaccounts.ca/v1/health";
// This service's own base — invite-info / accept-invite are local endpoints.
const BUSINESS_API_BASE = process.env.BUSINESS_API_BASE || `http://127.0.0.1:${process.env.PORT || 3001}/api`;

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

async function httpJson(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  let body = null;
  try { body = await res.json(); } catch { /* non-JSON response */ }
  return { status: res.status, body };
}

async function checkServiceHealth(name, url) {
  try {
    const { status } = await httpJson(url);
    record(`${name} is up`, status === 200, `GET ${url} -> ${status}`);
  } catch (err) {
    record(`${name} is up`, false, `GET ${url} -> ${err.message}`);
  }
}

let userId = null;

async function main() {
  console.log(`\nSmoke test starting — test client: ${TEST_EMAIL}\n`);

  // ── Service health (fast fail if a whole service is down) ──────────────────
  await checkServiceHealth("client-api (8003)", `${CLIENT_API_BASE.replace("/v3/api/v1", "")}/health`);
  await checkServiceHealth("admin-api (8002)", ADMIN_API_HEALTH);
  await checkServiceHealth("backend (8001)", BACKEND_API_HEALTH);

  try {
    // ── Seed a disposable invited client, bypassing SES ───────────────────────
    const tempHash = await hashPassword(require("crypto").randomBytes(24).toString("hex"));
    const { rows: [user] } = await db.query(
      `INSERT INTO users
         (email, password_hash, name, role, portal_status, must_change_password)
       VALUES ($1,$2,$3,'client','pending',TRUE)
       RETURNING id`,
      [TEST_EMAIL, tempHash, TEST_NAME]
    );
    userId = user.id;

    const token = generateInviteToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h, this is a throwaway
    await db.query(
      "INSERT INTO invite_tokens (user_id, token, expires_at, created_by) VALUES ($1,$2,$3,NULL)",
      [userId, token, expiresAt]
    );

    // ── 1. invite-info: the link a client clicks must resolve ────────────────
    const info = await httpJson(`${BUSINESS_API_BASE}/auth/invite-info/${token}`);
    record(
      "invite-info resolves",
      info.status === 200 && info.body?.success === true && info.body?.data?.email?.toLowerCase() === TEST_EMAIL,
      `HTTP ${info.status}`
    );

    // ── 2. accept-invite: the password-set step, and the FK-sync fix ─────────
    const accept = await httpJson(`${BUSINESS_API_BASE}/auth/accept-invite`, {
      method: "POST",
      body: JSON.stringify({ token, password: TEST_PASSWORD }),
    });
    record(
      "accept-invite succeeds",
      accept.status === 200 && accept.body?.success === true,
      `HTTP ${accept.status}: ${accept.body?.message || ""}`
    );
    // This is the assertion that would have caught the FK-blocked-DELETE bug:
    // the endpoint used to report success even when the app-DB mirror failed.
    record(
      "app-DB login sync landed (appLoginReady)",
      accept.body?.data?.appLoginReady === true,
      accept.body?.data?.appLoginReady === false
        ? "accept-invite reported the mirror write failed — see its own error log"
        : undefined
    );

    // ── 3. Python API login: the actual client-app login path ────────────────
    const login = await httpJson(`${CLIENT_API_BASE}/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    record(
      "client-api login succeeds with the SAME password just set",
      login.status === 200 && !!login.body?.access_token,
      `HTTP ${login.status}: ${login.body?.detail || ""}`
    );
    record(
      "login response reports customer_type=BusinessTax",
      login.body?.customer_type === "BusinessTax",
      `got: ${login.body?.customer_type}`
    );

    // ── 4. Cross-service customer-type lookup (the fallback path) ────────────
    if (login.body?.access_token) {
      const ctype = await httpJson(`${CLIENT_API_BASE}/auth/customer-type`, {
        headers: { Authorization: `Bearer ${login.body.access_token}` },
      });
      record(
        "customer-type endpoint agrees (not null/personal)",
        ctype.status === 200 && ctype.body?.customer_type === "BusinessTax",
        `HTTP ${ctype.status}, customerType=${ctype.body?.customer_type}`
      );
    } else {
      record("customer-type endpoint agrees (not null/personal)", false, "skipped — no token from login step");
    }
  } catch (err) {
    record("smoke test completed without throwing", false, err.message);
  } finally {
    // ── Cleanup — runs even if assertions above failed ────────────────────────
    try {
      if (userId) await db.query("DELETE FROM users WHERE id=$1", [userId]); // cascades invite_tokens
      if (db.mainQuery) await db.mainQuery("DELETE FROM users WHERE LOWER(email)=LOWER($1)", [TEST_EMAIL]);
      console.log(`\n  cleanup: removed ${TEST_EMAIL} from both databases`);
    } catch (cleanupErr) {
      console.error(`\n  ⚠️  CLEANUP FAILED — ${TEST_EMAIL} may still exist in one or both DBs: ${cleanupErr.message}`);
    }
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) {
    console.log("\nFAILED:");
    failed.forEach((r) => console.log(`  - ${r.name}${r.detail ? ": " + r.detail : ""}`));
    process.exitCode = 1;
  } else {
    console.log("\nAll checks passed.");
  }

  await db.pool.end();
  if (db.mainPool) await db.mainPool.end();
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exitCode = 1;
});
