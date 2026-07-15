// migrate.js — runs all SQL migration files in order
// Usage: node src/migrate.js
require("./config/env");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

async function runMigrations() {
  const connStr = process.env.DATABASE_URL;
  const useSSL = connStr?.includes("rds.amazonaws.com") ||
                 process.env.NODE_ENV === "production";

  const pool = new Pool({
    connectionString: connStr,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
  });

  // Schema version tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`\n  Running ${files.length} migration file(s)...\n`);

  for (const file of files) {
    const { rows } = await pool.query(
      "SELECT filename FROM schema_migrations WHERE filename=$1",
      [file]
    );

    if (rows.length > 0) {
      console.log(`  ✓  ${file} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    try {
      await pool.query("BEGIN");
      await pool.query(sql);
      await pool.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await pool.query("COMMIT");
      console.log(`  ✅  ${file}`);
    } catch (err) {
      await pool.query("ROLLBACK");
      console.error(`  ❌  ${file}: ${err.message}`);
      process.exit(1);
    }
  }

  console.log("\n  All migrations complete.\n");
  await pool.end();
}

runMigrations().catch((err) => {
  console.error(err);
  process.exit(1);
});
