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

// Main app DB (taxease_admin) — used by admin-business routes
const mainPool = (() => {
  const mainDbUrl = process.env.MAIN_DATABASE_URL;
  if (!mainDbUrl) return null;
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
  mainQuery: mainPool
    ? (text, params) => mainPool.query(text, params)
    : null,
};

module.exports = db;
