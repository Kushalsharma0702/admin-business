// schema.js — DB schema initialisation (idempotent)
const db = require("./db");

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'client',
      phone TEXT, ssn TEXT, dob TEXT, occupation TEXT, client_since TEXT,
      portal_status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL, assigned_by TEXT,
      title TEXT NOT NULL, description TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_status TEXT NOT NULL DEFAULT 'Data not received',
      task_type TEXT, metadata TEXT DEFAULT '{}',
      completion_note TEXT, completed_at TEXT,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS query_sheet_rows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL, row_index INTEGER NOT NULL,
      date TEXT, details TEXT, payment TEXT, receipt TEXT, hst TEXT,
      our_remarks TEXT, client_remarks TEXT DEFAULT '',
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      UNIQUE(task_id, row_index),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_documents (
      id TEXT PRIMARY KEY, task_id TEXT NOT NULL, category TEXT,
      file_name TEXT NOT NULL, original_filename TEXT NOT NULL,
      file_type TEXT, file_size INTEGER DEFAULT 0, storage_path TEXT NOT NULL,
      status TEXT DEFAULT 'uploaded',
      uploaded_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL,
      filing_id TEXT, name TEXT, original_filename TEXT NOT NULL,
      file_type TEXT, file_size INTEGER DEFAULT 0,
      section_name TEXT, document_type TEXT DEFAULT 'ocr',
      storage_path TEXT NOT NULL, status TEXT DEFAULT 'uploaded',
      ocr_status TEXT DEFAULT 'pending',
      ocr_result TEXT, ocr_confidence REAL, ocr_processed_at TEXT,
      uploaded_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL,
      name TEXT NOT NULL, email TEXT, first_name TEXT, last_name TEXT,
      middle_name TEXT, date_of_birth TEXT, gender TEXT, phone TEXT, sin TEXT,
      address_line_1 TEXT, address_line_2 TEXT, city TEXT, country TEXT,
      province_state TEXT, postal_code TEXT, start_date TEXT,
      position TEXT, department TEXT,
      hourly_rate REAL, federal_tax_credit REAL, provincial_tax_credit REAL, salary REAL,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payroll_entries (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL,
      period_label TEXT NOT NULL, period_start TEXT NOT NULL, period_end TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      employee_ids TEXT DEFAULT '[]', total_amount REAL,
      notes TEXT DEFAULT '', document_paths TEXT DEFAULT '[]',
      metadata TEXT DEFAULT '{}', is_auto_generated INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      submitted_at TEXT,
      FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payroll_automation_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL UNIQUE,
      start_date TEXT NOT NULL, frequency TEXT NOT NULL,
      is_active INTEGER DEFAULT 1, last_generated_date TEXT,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_client   ON tasks(client_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status   ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_emp_client     ON employees(client_id);
    CREATE INDEX IF NOT EXISTS idx_pay_client     ON payroll_entries(client_id);
    CREATE INDEX IF NOT EXISTS idx_docs_client    ON documents(client_id);
  `);
}

module.exports = { initSchema };
