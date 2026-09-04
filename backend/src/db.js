// db.js — PostgreSQL connection pool (node-postgres)
const { Pool } = require("pg");
require("./config/env");

// Use SSL when connecting to RDS (rejectUnauthorized:false accepts Amazon's self-signed CA)
const useSSL = process.env.DATABASE_URL?.includes("rds.amazonaws.com") ||
               process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
});

// The Flutter/Python app DB (the `postgres` database), separate from this
// service's own `taxease_admin` DB. Required for accept-invite to mirror the
// new client into the app's users table — without it a client can set a
// password successfully and then be told "invalid email or password" by the
// app, because the app authenticates against a database this service never
// wrote to. Warn loudly rather than failing silently.
const mainPool = (() => {
  const mainDbUrl = process.env.MAIN_DATABASE_URL;
  if (!mainDbUrl) {
    console.warn(
      "\n  ⚠️  MAIN_DATABASE_URL is not set — invited clients will NOT be synced to the app database.\n" +
      "      They will be able to set a password but will get 'invalid email or password' in the mobile app.\n"
    );
    return null;
  }
  const p = new Pool({
    connectionString: mainDbUrl,
    ssl: mainDbUrl.includes("rds.amazonaws.com") ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  p.on("error", (err) => {
    console.error("Main DB pool error:", err.message);
  });
  return p;
})();

const db = {
  query: (text, params) => pool.query(text, params),
  pool,
  mainPool, // exposed so scripts (e.g. smoke-test.js) can close both pools on exit
  mainQuery: mainPool
    ? (text, params) => mainPool.query(text, params)
    : null,
};

module.exports = db;
