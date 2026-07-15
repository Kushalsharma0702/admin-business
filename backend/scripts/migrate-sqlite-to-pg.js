#!/usr/bin/env node
// scripts/migrate-sqlite-to-pg.js
// Migrates data from legacy SQLite (taxease.db) to PostgreSQL.
// Run AFTER: npm run migrate  (which creates all tables)
//
// Usage:
//   DATABASE_URL=postgresql://... node scripts/migrate-sqlite-to-pg.js
//   # or with .env loaded:
//   node -r dotenv/config scripts/migrate-sqlite-to-pg.js

const path = require("path");
const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");

let sqlite3;
try { sqlite3 = require("better-sqlite3"); } catch {
  console.error("Install better-sqlite3 to run this script: npm install better-sqlite3");
  process.exit(1);
}

const SQLITE_PATH = path.join(__dirname, "../taxease.db");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Maps old TEXT id → new UUID
const idMap = {};

function mapId(oldId) {
  if (!oldId) return null;
  if (!idMap[oldId]) idMap[oldId] = uuidv4();
  return idMap[oldId];
}

async function run() {
  let sqlite;
  try {
    sqlite = sqlite3(SQLITE_PATH, { readonly: true });
    console.log(`\n  SQLite: ${SQLITE_PATH}`);
  } catch {
    console.error(`  ❌  Could not open ${SQLITE_PATH}. Is the old database present?`);
    process.exit(1);
  }

  console.log("  PostgreSQL: connecting…\n");
  const client = await pool.connect();

  try {
    // ── Users ─────────────────────────────────────────────────────────────────
    const users = sqlite.prepare("SELECT * FROM users").all();
    console.log(`  Migrating ${users.length} users…`);
    for (const u of users) {
      const newId = mapId(u.id);
      await client.query(
        `INSERT INTO users
           (id, email, password_hash, name, role, phone, ssn, dob, occupation,
            client_since, portal_status, must_change_password, slug, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,FALSE,$12,$13,$14)
         ON CONFLICT (id) DO NOTHING`,
        [newId, u.email, u.password_hash, u.name, u.role,
         u.phone||null, u.ssn||null, u.dob||null, u.occupation||null,
         u.client_since||null, u.portal_status||'active', u.id,
         u.created_at, u.updated_at]
      );
    }
    console.log(`    ✓ ${users.length} users`);

    // ── Tasks ─────────────────────────────────────────────────────────────────
    const tasks = sqlite.prepare("SELECT * FROM tasks").all();
    console.log(`  Migrating ${tasks.length} tasks…`);
    for (const t of tasks) {
      await client.query(
        `INSERT INTO tasks
           (id, client_id, assigned_by, title, description, status, admin_status,
            task_type, metadata, completion_note, completed_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (id) DO NOTHING`,
        [mapId(t.id), mapId(t.client_id), mapId(t.assigned_by),
         t.title, t.description||null, t.status, t.admin_status,
         t.task_type||null,
         (() => { try { return JSON.parse(t.metadata||"{}"); } catch { return {}; } })(),
         t.completion_note||null, t.completed_at||null,
         t.created_at, t.updated_at]
      );
    }
    console.log(`    ✓ ${tasks.length} tasks`);

    // ── Query Sheet Rows ──────────────────────────────────────────────────────
    const qsRows = sqlite.prepare("SELECT * FROM query_sheet_rows").all();
    console.log(`  Migrating ${qsRows.length} query sheet rows…`);
    for (const r of qsRows) {
      await client.query(
        `INSERT INTO query_sheet_rows
           (task_id, row_index, date, details, payment, receipt, hst, our_remarks, client_remarks, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (task_id, row_index) DO NOTHING`,
        [mapId(r.task_id), r.row_index, r.date||null, r.details||null,
         r.payment||null, r.receipt||null, r.hst||null,
         r.our_remarks||null, r.client_remarks||'',
         r.created_at, r.updated_at]
      );
    }
    console.log(`    ✓ ${qsRows.length} query sheet rows`);

    // ── Task Documents ────────────────────────────────────────────────────────
    const tdocs = sqlite.prepare("SELECT * FROM task_documents").all();
    console.log(`  Migrating ${tdocs.length} task documents…`);
    for (const d of tdocs) {
      await client.query(
        `INSERT INTO task_documents
           (id, task_id, category, file_name, original_filename, file_type, file_size, storage_path, status, uploaded_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [mapId(d.id), mapId(d.task_id), d.category||null,
         d.file_name, d.original_filename, d.file_type||null,
         d.file_size||0, d.storage_path, d.status||'uploaded', d.uploaded_at]
      );
    }
    console.log(`    ✓ ${tdocs.length} task documents`);

    // ── OCR Documents ─────────────────────────────────────────────────────────
    const docs = sqlite.prepare("SELECT * FROM documents").all();
    console.log(`  Migrating ${docs.length} documents…`);
    for (const d of docs) {
      const ocrResult = (() => { try { return JSON.parse(d.ocr_result||"null"); } catch { return null; } })();
      await client.query(
        `INSERT INTO documents
           (id, client_id, filing_id, name, original_filename, file_type, file_size,
            section_name, document_type, storage_path, status, ocr_status,
            ocr_result, ocr_confidence, ocr_processed_at, uploaded_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (id) DO NOTHING`,
        [mapId(d.id), mapId(d.client_id), d.filing_id||null, d.name||null,
         d.original_filename, d.file_type||null, d.file_size||0,
         d.section_name||null, d.document_type||'ocr', d.storage_path||'',
         d.status||'uploaded', d.ocr_status||'pending',
         ocrResult, d.ocr_confidence||null, d.ocr_processed_at||null,
         d.uploaded_at, d.created_at]
      );
    }
    console.log(`    ✓ ${docs.length} documents`);

    // ── Employees ─────────────────────────────────────────────────────────────
    const emps = sqlite.prepare("SELECT * FROM employees").all();
    console.log(`  Migrating ${emps.length} employees…`);
    for (const e of emps) {
      const meta = (() => { try { return JSON.parse(e.metadata||"{}"); } catch { return {}; } })();
      await client.query(
        `INSERT INTO employees
           (id, client_id, name, email, first_name, last_name, middle_name, date_of_birth,
            gender, phone, sin, address_line_1, address_line_2, city, country,
            province_state, postal_code, start_date, position, department,
            hourly_rate, federal_tax_credit, provincial_tax_credit, salary, metadata, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
         ON CONFLICT (id) DO NOTHING`,
        [mapId(e.id), mapId(e.client_id), e.name, e.email||null,
         e.first_name||null, e.last_name||null, e.middle_name||null, e.date_of_birth||null,
         e.gender||null, e.phone||null, e.sin||null,
         e.address_line_1||null, e.address_line_2||null, e.city||null, e.country||null,
         e.province_state||null, e.postal_code||null, e.start_date||null,
         e.position||null, e.department||null,
         e.hourly_rate||null, e.federal_tax_credit||null, e.provincial_tax_credit||null,
         e.salary||null, meta, e.created_at, e.updated_at]
      );
    }
    console.log(`    ✓ ${emps.length} employees`);

    // ── Payroll Entries ───────────────────────────────────────────────────────
    const pays = sqlite.prepare("SELECT * FROM payroll_entries").all();
    console.log(`  Migrating ${pays.length} payroll entries…`);
    for (const p of pays) {
      const employeeIds = (() => {
        try {
          const arr = JSON.parse(p.employee_ids||"[]");
          return arr.map((id) => mapId(id));
        } catch { return []; }
      })();
      const meta = (() => { try { return JSON.parse(p.metadata||"{}"); } catch { return {}; } })();

      await client.query(
        `INSERT INTO payroll_entries
           (id, client_id, period_label, period_start, period_end, status, employee_ids,
            total_amount, notes, document_paths, metadata, is_auto_generated, submitted_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (id) DO NOTHING`,
        [mapId(p.id), mapId(p.client_id), p.period_label,
         p.period_start, p.period_end, p.status||'pending',
         JSON.stringify(employeeIds), p.total_amount||null, p.notes||'',
         (() => { try { return JSON.parse(p.document_paths||"[]"); } catch { return []; } })(),
         meta, p.is_auto_generated===1,
         p.submitted_at||null, p.created_at, p.updated_at]
      );
    }
    console.log(`    ✓ ${pays.length} payroll entries`);

    console.log("\n  ✅  Migration complete!\n");

    // Print summary
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM users)::int           AS users,
        (SELECT COUNT(*) FROM tasks)::int           AS tasks,
        (SELECT COUNT(*) FROM employees)::int       AS employees,
        (SELECT COUNT(*) FROM payroll_entries)::int AS payroll
    `);
    console.log("  PostgreSQL row counts:", counts.rows[0]);

  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}

run().catch((err) => { console.error("\n  ❌ Migration failed:", err.message); process.exit(1); });
