# TaxEase Platform — Refactor Blueprint

> **Version:** 2.0  
> **Author:** Lead Staff Engineer  
> **Date:** June 2026  
> **Scope:** Invitation-based onboarding · PostgreSQL migration · Dynamic form engine · Template system · AWS integration

---

## Table of Contents

1. [What Changes and Why](#1-what-changes-and-why)
2. [Target Architecture](#2-target-architecture)
3. [Folder Structure](#3-folder-structure)
4. [PostgreSQL Database Schema](#4-postgresql-database-schema)
5. [API Contracts](#5-api-contracts)
6. [Backend Implementation Plan](#6-backend-implementation-plan)
7. [Frontend Implementation Plan](#7-frontend-implementation-plan)
8. [AWS Integration](#8-aws-integration)
9. [Migration Strategy from SQLite](#9-migration-strategy-from-sqlite)
10. [Step-by-Step Execution Order](#10-step-by-step-execution-order)

---

## 1. What Changes and Why

### Current State (v1)

| Concern | Current | Problem |
|---------|---------|---------|
| Database | SQLite (file) | Not production-grade, no concurrent writes, no RDS |
| Client creation | Admin sets password manually | Insecure, no invite flow |
| Tasks | Static type field (string) | No dynamic forms, no schema, no versioning |
| File uploads | multer memoryStorage (RAM only) | Files lost on restart, not scalable |
| Email | None | No invite/notification system |
| Form data | metadata TEXT (unstructured JSON) | No validation schema, no field types |

### Target State (v2)

| Concern | Target | Benefit |
|---------|--------|---------|
| Database | PostgreSQL (RDS) with JSONB | Production-grade, concurrent, typed JSON |
| Client creation | Invite email → set password flow | Secure onboarding, no plaintext passwords shared |
| Tasks | Template-based with form schema | Structured, versioned, reusable |
| File uploads | AWS S3 presigned URLs | Persistent, scalable, secure |
| Email | AWS SES | Transactional invite/notification emails |
| Form data | JSONB schema + typed renderer | Validated, queryable, renderable |

---

## 2. Target Architecture

```
┌─────────────────────────────────────┐    ┌─────────────────────────────────────┐
│  Admin Panel (React/TanStack Start) │    │  Client App (Flutter / React Native)│
│  Port 8080 / CloudFront CDN         │    │  Mobile + Web                       │
│                                     │    │                                     │
│  Pages:                             │    │  Pages:                             │
│  · Dashboard (live from backend)    │    │  · Pending Tasks                    │
│  · Template Builder                 │    │  · Dynamic Form Renderer            │
│  · Client List + Invite             │    │  · File Upload                      │
│  · Task Assignment + Progress       │    │  · Submission History               │
│  · Submission Viewer                │    │  · Accept Invite / Set Password     │
└─────────────┬───────────────────────┘    └──────────────┬──────────────────────┘
              │ Bearer JWT                                 │ Bearer JWT
              ▼                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Node.js / Express  (backend/)                                                  │
│                                                                                 │
│  /api/auth/*            login, me, setup-password, accept-invite               │
│  /api/admin/*           clients, invite, templates, tasks, submissions          │
│  /api/admin/s3/*        presigned upload URLs                                  │
│  /v3/api/v1/tasks/*     client task actions (unchanged path)                   │
│  /v3/api/v1/forms/*     form submit, draft save                                │
│  /v3/api/v1/documents/* OCR upload (via S3)                                    │
│  /v3/api/v1/payroll/*   payroll (unchanged)                                    │
│  /api-docs              Swagger UI                                              │
└─────────────┬───────────────────────────────────────────────────────────────────┘
              │
   ┌──────────┼──────────────────────────────────────┐
   │          │                                       │
   ▼          ▼                                       ▼
┌──────┐  ┌──────────────────────┐    ┌──────────────────────────┐
│ RDS  │  │  AWS SES             │    │  AWS S3                  │
│ PG   │  │  Transactional Email │    │  taxease-uploads bucket  │
│      │  │  · Invitations       │    │  · task documents        │
│      │  │  · Notifications     │    │  · form attachments      │
└──────┘  └──────────────────────┘    │  · OCR documents         │
                                      └──────────────────────────┘
```

---

## 3. Folder Structure

### Backend (`backend/`)

```
backend/
├── src/
│   ├── index.js                    # Entry point (unchanged)
│   ├── db.js                       # NOW: pg Pool (node-postgres)
│   ├── helpers.js                  # Add: s3Url(), sendInviteEmail()
│   ├── openapi.js                  # Updated spec
│   ├── swagger.js                  # Unchanged
│   │
│   ├── config/
│   │   ├── aws.js                  # NEW: SES + S3 + Secrets Manager clients
│   │   └── env.js                  # NEW: validated env vars (zod)
│   │
│   ├── migrations/                 # NEW: numbered SQL migration files
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_invite_tokens.sql
│   │   ├── 003_task_templates.sql
│   │   ├── 004_task_submissions.sql
│   │   └── 005_s3_columns.sql
│   │
│   ├── middleware/
│   │   ├── auth.js                 # Updated for pg (async queries)
│   │   └── upload.js               # NEW: multer-s3 middleware
│   │
│   └── routes/
│       ├── auth.js                 # Add: accept-invite, setup-password
│       ├── admin.js                # Add: invite, templates, submissions
│       ├── admin-templates.js      # NEW: template CRUD
│       ├── admin-submissions.js    # NEW: view/reassign submissions
│       ├── admin-s3.js             # NEW: presigned URL generation
│       ├── client-tasks.js         # Updated for pg (async)
│       ├── client-forms.js         # NEW: form submit, draft, history
│       ├── client-documents.js     # Updated: S3 storage
│       └── client-payroll.js       # Updated for pg (async)
│
├── package.json                    # Add: pg, @aws-sdk/*, uuid, zod, bcrypt
├── .env.example                    # NEW: all required env vars
└── README.md
```

### Frontend (`src/`)

```
src/
├── routes/
│   ├── __root.tsx
│   ├── index.tsx
│   ├── login.tsx
│   ├── invite.$token.tsx           # NEW: accept invite / set password
│   ├── dashboard.tsx               # Updated: backend data
│   ├── tasks.tsx                   # Unchanged
│   ├── templates/
│   │   ├── index.tsx               # NEW: Template list
│   │   └── $templateId.tsx         # NEW: Template Builder
│   ├── clients/
│   │   ├── index.tsx               # Add: invite button
│   │   ├── $clientId.tsx           # Unchanged
│   │   └── $clientId.$tab.tsx      # Add: submissions tab
│   └── submissions/
│       └── $submissionId.tsx       # NEW: Submission detail viewer
│
├── components/
│   ├── app/
│   │   └── ... (existing)
│   └── forms/                      # NEW: form engine components
│       ├── FormRenderer.tsx        # Renders a form schema
│       ├── FormBuilder.tsx         # Admin drag-and-drop builder
│       ├── fields/
│       │   ├── TextField.tsx
│       │   ├── TextareaField.tsx
│       │   ├── NumberField.tsx
│       │   ├── EmailField.tsx
│       │   ├── PhoneField.tsx
│       │   ├── DateField.tsx
│       │   ├── SelectField.tsx
│       │   ├── CheckboxField.tsx
│       │   ├── RadioField.tsx
│       │   ├── FileUploadField.tsx
│       │   └── SignatureField.tsx
│       └── index.ts
│
└── lib/
    ├── api.ts                      # Extended with new endpoints
    └── formTypes.ts                # NEW: shared form schema types
```

---

## 4. PostgreSQL Database Schema

### Migration 001 — Initial Schema (replaces SQLite)

```sql
-- 001_initial_schema.sql
-- Run once to create all base tables

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- ── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT        UNIQUE NOT NULL,
  password_hash     TEXT        NOT NULL,
  name              TEXT        NOT NULL,
  role              TEXT        NOT NULL DEFAULT 'client' CHECK (role IN ('admin','client')),
  phone             TEXT,
  ssn               TEXT,
  dob               DATE,
  occupation        TEXT,
  client_since      DATE,
  portal_status     TEXT        NOT NULL DEFAULT 'pending' CHECK (portal_status IN ('active','pending','none')),
  must_change_password BOOLEAN  NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email  ON users(email);
CREATE INDEX idx_users_role   ON users(role);

-- ── Tasks ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by     UUID        REFERENCES users(id) ON DELETE SET NULL,
  template_id     UUID,       -- FK added in migration 003
  template_version_id UUID,   -- FK added in migration 003
  title           TEXT        NOT NULL,
  description     TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','complete')),
  admin_status    TEXT        NOT NULL DEFAULT 'Data not received',
  task_type       TEXT,
  metadata        JSONB       NOT NULL DEFAULT '{}',
  completion_note TEXT,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_client_id    ON tasks(client_id);
CREATE INDEX idx_tasks_status       ON tasks(status);
CREATE INDEX idx_tasks_admin_status ON tasks(admin_status);
CREATE INDEX idx_tasks_template_id  ON tasks(template_id);

-- ── Query Sheet Rows ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS query_sheet_rows (
  id              BIGSERIAL   PRIMARY KEY,
  task_id         UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  row_index       INTEGER     NOT NULL,
  date            TEXT,
  details         TEXT,
  payment         TEXT,
  receipt         TEXT,
  hst             TEXT,
  our_remarks     TEXT,
  client_remarks  TEXT        NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, row_index)
);

-- ── Task Documents ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_documents (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  category        TEXT,
  file_name       TEXT        NOT NULL,
  original_filename TEXT      NOT NULL,
  file_type       TEXT,
  file_size       BIGINT      NOT NULL DEFAULT 0,
  s3_key          TEXT        NOT NULL,    -- S3 object key (replaces storage_path)
  s3_bucket       TEXT        NOT NULL DEFAULT 'taxease-uploads',
  status          TEXT        NOT NULL DEFAULT 'uploaded',
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_documents_task ON task_documents(task_id);

-- ── OCR Documents ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filing_id       TEXT,
  name            TEXT,
  original_filename TEXT      NOT NULL,
  file_type       TEXT,
  file_size       BIGINT      NOT NULL DEFAULT 0,
  section_name    TEXT,
  document_type   TEXT        NOT NULL DEFAULT 'ocr',
  s3_key          TEXT        NOT NULL,
  s3_bucket       TEXT        NOT NULL DEFAULT 'taxease-uploads',
  status          TEXT        NOT NULL DEFAULT 'uploaded',
  ocr_status      TEXT        NOT NULL DEFAULT 'pending',
  ocr_result      JSONB,
  ocr_confidence  REAL,
  ocr_processed_at TIMESTAMPTZ,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_client ON documents(client_id);
CREATE INDEX idx_documents_ocr_status ON documents(ocr_status);

-- ── Employees ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                  TEXT        NOT NULL,
  email                 TEXT,
  first_name            TEXT,
  last_name             TEXT,
  middle_name           TEXT,
  date_of_birth         DATE,
  gender                TEXT,
  phone                 TEXT,
  sin                   TEXT,
  address_line_1        TEXT,
  address_line_2        TEXT,
  city                  TEXT,
  country               TEXT,
  province_state        TEXT,
  postal_code           TEXT,
  start_date            DATE,
  position              TEXT,
  department            TEXT,
  hourly_rate           NUMERIC(10,2),
  federal_tax_credit    NUMERIC(10,2),
  provincial_tax_credit NUMERIC(10,2),
  salary                NUMERIC(10,2),
  metadata              JSONB       NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employees_client ON employees(client_id);

-- ── Payroll Entries ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_entries (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_label     TEXT        NOT NULL,
  period_start     TIMESTAMPTZ NOT NULL,
  period_end       TIMESTAMPTZ NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted')),
  employee_ids     JSONB       NOT NULL DEFAULT '[]',
  total_amount     NUMERIC(12,2),
  notes            TEXT        NOT NULL DEFAULT '',
  document_paths   JSONB       NOT NULL DEFAULT '[]',
  metadata         JSONB       NOT NULL DEFAULT '{}',
  is_auto_generated BOOLEAN    NOT NULL DEFAULT FALSE,
  submitted_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payroll_client ON payroll_entries(client_id);

-- ── Payroll Automation ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_automation_configs (
  id                   BIGSERIAL   PRIMARY KEY,
  client_id            UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  start_date           DATE        NOT NULL,
  frequency            TEXT        NOT NULL CHECK (frequency IN ('weekly','biweekly','monthly')),
  is_active            BOOLEAN     NOT NULL DEFAULT TRUE,
  last_generated_date  TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Migration 002 — Invite Tokens

```sql
-- 002_invite_tokens.sql

CREATE TABLE IF NOT EXISTS invite_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT        UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,          -- NULL = not yet used
  created_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invite_tokens_token   ON invite_tokens(token);
CREATE INDEX idx_invite_tokens_user_id ON invite_tokens(user_id);

-- Add must_change_password if not added in 001
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
```

### Migration 003 — Task Templates

```sql
-- 003_task_templates.sql

-- ── Task Templates ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_templates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  description   TEXT,
  task_type     TEXT        NOT NULL DEFAULT 'form',
  category      TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by    UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_active ON task_templates(is_active);

-- ── Template Versions (immutable after publish) ────────────────────────────
CREATE TABLE IF NOT EXISTS task_template_versions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   UUID        NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  version       INTEGER     NOT NULL,
  form_schema   JSONB       NOT NULL,   -- array of FormField objects
  is_published  BOOLEAN     NOT NULL DEFAULT FALSE,
  published_at  TIMESTAMPTZ,
  created_by    UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(template_id, version)
);

CREATE INDEX idx_template_versions_template ON task_template_versions(template_id);
CREATE INDEX idx_template_versions_published ON task_template_versions(is_published);

-- ── Back-fill FKs on tasks ─────────────────────────────────────────────────
ALTER TABLE tasks
  ADD CONSTRAINT fk_tasks_template
    FOREIGN KEY (template_id) REFERENCES task_templates(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_tasks_template_version
    FOREIGN KEY (template_version_id) REFERENCES task_template_versions(id) ON DELETE SET NULL;
```

### Migration 004 — Task Submissions

```sql
-- 004_task_submissions.sql

CREATE TABLE IF NOT EXISTS task_submissions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id          UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  client_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_version_id UUID     REFERENCES task_template_versions(id) ON DELETE SET NULL,
  status           TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','reviewed','rejected')),
  form_data        JSONB       NOT NULL DEFAULT '{}',   -- { fieldId: value, ... }
  attachments      JSONB       NOT NULL DEFAULT '[]',   -- [{ fieldId, s3Key, fileName, fileSize }]
  submitted_at     TIMESTAMPTZ,
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      UUID        REFERENCES users(id) ON DELETE SET NULL,
  review_notes     TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submissions_task_id   ON task_submissions(task_id);
CREATE INDEX idx_submissions_client_id ON task_submissions(client_id);
CREATE INDEX idx_submissions_status    ON task_submissions(status);
```

### Migration 005 — S3 Columns

```sql
-- 005_s3_columns.sql
-- Ensures s3_key and s3_bucket exist everywhere (safe if 001 already ran)

ALTER TABLE task_documents
  ADD COLUMN IF NOT EXISTS s3_key    TEXT,
  ADD COLUMN IF NOT EXISTS s3_bucket TEXT DEFAULT 'taxease-uploads';

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS s3_key    TEXT,
  ADD COLUMN IF NOT EXISTS s3_bucket TEXT DEFAULT 'taxease-uploads';
```

### form_schema JSONB Structure

Each template version stores an array of `FormField` objects:

```json
[
  {
    "id": "field_001",
    "type": "text",
    "label": "Full Legal Name",
    "placeholder": "Enter your full name",
    "required": true,
    "order": 1
  },
  {
    "id": "field_002",
    "type": "select",
    "label": "Filing Type",
    "required": true,
    "order": 2,
    "options": [
      { "label": "T1 Personal", "value": "t1" },
      { "label": "T2 Corporate", "value": "t2" }
    ]
  },
  {
    "id": "field_003",
    "type": "file_upload",
    "label": "Upload T4 Slips",
    "required": true,
    "order": 3,
    "acceptedTypes": ["application/pdf", "image/png", "image/jpeg"],
    "maxSizeMb": 10
  },
  {
    "id": "field_004",
    "type": "signature",
    "label": "Client Signature",
    "required": true,
    "order": 4
  }
]
```

**Supported field types:**

| type | Input | Notes |
|------|-------|-------|
| `text` | `<input type="text">` | |
| `textarea` | `<textarea>` | |
| `number` | `<input type="number">` | min/max/step |
| `email` | `<input type="email">` | format validated |
| `phone` | `<input type="tel">` | |
| `date` | `<input type="date">` | |
| `select` | `<select>` | requires `options[]` |
| `checkbox` | `<input type="checkbox">` | boolean |
| `radio` | `<input type="radio">` | requires `options[]` |
| `file_upload` | `<input type="file">` | uploads to S3 via presigned URL |
| `signature` | canvas-based pad | saves as base64 PNG or S3 key |

---

## 5. API Contracts

### Auth APIs

#### `POST /api/auth/accept-invite`

Request:
```json
{ "token": "abc123xyz", "password": "MyNewPass1!" }
```

Response 200:
```json
{
  "success": true,
  "message": "Password set. You may now log in.",
  "data": { "email": "client@example.com" }
}
```

Errors:
- `400` token missing / password missing
- `404` token not found
- `410` token expired or already used

Logic:
1. Find invite_tokens row by token
2. Check `used_at IS NULL` AND `expires_at > NOW()`
3. bcrypt.hash(password, 12)
4. UPDATE users SET password_hash=..., must_change_password=FALSE, portal_status='active'
5. UPDATE invite_tokens SET used_at=NOW()

---

#### `POST /api/auth/setup-password` (for must_change_password flow)

Request (requires valid JWT):
```json
{ "currentPassword": "temp123", "newPassword": "MyNewPass1!" }
```

Response 200:
```json
{ "success": true, "message": "Password updated", "data": {} }
```

---

### Admin — Invite APIs

#### `POST /api/admin/clients` (updated)

Request:
```json
{
  "email": "newclient@example.com",
  "name": "John Smith",
  "phone": "+1-416-555-0100",
  "occupation": "Restaurant Owner"
}
```

Response 201:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "newclient@example.com",
    "name": "John Smith",
    "portalStatus": "pending",
    "inviteSent": true,
    "inviteExpiresAt": "2026-06-09T00:00:00Z"
  }
}
```

> No `temporaryPassword` in response. Invite email sent via SES.

---

#### `POST /api/admin/clients/:clientId/resend-invite`

Response 200:
```json
{
  "success": true,
  "message": "Invite resent",
  "data": { "inviteExpiresAt": "2026-06-09T00:00:00Z" }
}
```

Logic:
1. Expire any existing unused invite tokens for this user
2. Generate new token
3. Send SES email

---

### Admin — Template APIs

#### `GET /api/admin/templates`

Query: `?search=&isActive=true&page=1&per_page=20`

Response 200:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "T2 Corporate Onboarding",
      "description": "...",
      "taskType": "form",
      "category": "onboarding",
      "isActive": true,
      "latestVersion": 3,
      "createdAt": "..."
    }
  ],
  "pagination": { "page": 1, "per_page": 20, "total_items": 5 }
}
```

---

#### `POST /api/admin/templates`

Request:
```json
{
  "name": "T2 Corporate Onboarding",
  "description": "Annual corporate return intake form",
  "taskType": "form",
  "category": "onboarding"
}
```

Response 201: template object with id

---

#### `GET /api/admin/templates/:templateId`

Response 200:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "...",
    "versions": [
      { "id": "uuid", "version": 1, "isPublished": true, "publishedAt": "..." },
      { "id": "uuid", "version": 2, "isPublished": false }
    ]
  }
}
```

---

#### `POST /api/admin/templates/:templateId/versions`

Request:
```json
{
  "formSchema": [
    { "id": "f1", "type": "text", "label": "Business Name", "required": true, "order": 1 },
    { "id": "f2", "type": "select", "label": "Province", "required": true, "order": 2,
      "options": [{"label":"Ontario","value":"ON"},{"label":"BC","value":"BC"}] }
  ]
}
```

Response 201: version object with id and version number

---

#### `PATCH /api/admin/templates/:templateId/versions/:versionId/publish`

Response 200: `{ "success": true, "message": "Version published" }`

> Once published, a version is immutable — create a new version to edit.

---

#### `DELETE /api/admin/templates/:templateId`

Soft-delete: sets `is_active = FALSE`

---

### Admin — Task Assignment APIs

#### `POST /api/admin/clients/:clientId/tasks` (updated)

Request:
```json
{
  "title": "Complete T2 Intake Form",
  "templateId": "uuid",
  "templateVersionId": "uuid",
  "adminStatus": "Data not received",
  "description": "Please complete your annual corporate return intake."
}
```

Response 201: task object with `templateId`, `templateVersionId`

---

#### `GET /api/admin/tasks/:taskId/submission`

Response 200:
```json
{
  "success": true,
  "data": {
    "submissionId": "uuid",
    "status": "submitted",
    "formData": { "f1": "Acme Corp", "f2": "ON" },
    "attachments": [
      { "fieldId": "f3", "s3Key": "uploads/...", "fileName": "T4.pdf", "fileSize": 204800 }
    ],
    "submittedAt": "...",
    "templateVersion": { "version": 2, "formSchema": [...] }
  }
}
```

---

#### `PATCH /api/admin/tasks/:taskId/reassign`

Request:
```json
{ "clientId": "new-client-uuid" }
```

Response 200: updated task object

---

### Admin — Submission APIs

#### `GET /api/admin/submissions`

Query: `?clientId=&status=submitted&page=1&per_page=20`

#### `GET /api/admin/submissions/:submissionId`

#### `PATCH /api/admin/submissions/:submissionId/review`

Request:
```json
{ "status": "reviewed", "reviewNotes": "All documents received. Filing in progress." }
```

---

### Client — Form APIs

#### `GET /v3/api/v1/tasks/:taskId/form`

Response 200:
```json
{
  "success": true,
  "data": {
    "taskId": "uuid",
    "title": "Complete T2 Intake Form",
    "formSchema": [...],
    "submission": {
      "id": "uuid",
      "status": "draft",
      "formData": {},
      "attachments": []
    }
  }
}
```

Logic: fetches the task's template version's formSchema. Also returns existing draft if any.

---

#### `PUT /v3/api/v1/tasks/:taskId/form/draft`

Request:
```json
{ "formData": { "f1": "Acme Corp", "f2": "ON" } }
```

Response 200: submission object with `status: "draft"`

Creates or upserts the draft submission. Idempotent.

---

#### `POST /v3/api/v1/tasks/:taskId/form/submit`

Request:
```json
{
  "formData": { "f1": "Acme Corp", "f2": "ON" },
  "attachments": [
    { "fieldId": "f3", "s3Key": "uploads/client-id/task-id/f3/T4.pdf", "fileName": "T4.pdf", "fileSize": 204800 }
  ]
}
```

Response 200:
```json
{ "success": true, "data": { "submissionId": "uuid", "status": "submitted", "submittedAt": "..." } }
```

Logic:
1. Validate all required fields are present in formData
2. Validate all required file_upload fields have attachments
3. Validate signature fields
4. Mark task status = 'complete', completed_at = now
5. Insert/update task_submissions with status='submitted', submitted_at=now

---

#### `GET /v3/api/v1/submissions`

Response: paginated list of client's submission history

---

### S3 Presigned URL APIs

#### `POST /api/admin/s3/presign` (admin upload)

#### `POST /v3/api/v1/s3/presign` (client upload)

Request:
```json
{ "fileName": "T4_slip.pdf", "fileType": "application/pdf", "taskId": "uuid", "fieldId": "f3" }
```

Response 200:
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://s3.amazonaws.com/taxease-uploads/...?X-Amz-Signature=...",
    "s3Key": "uploads/client-id/task-id/f3/1234567890_T4_slip.pdf",
    "expiresIn": 300
  }
}
```

Client uses `PUT uploadUrl` with the file binary directly. S3 URL never touches the backend.

---

## 6. Backend Implementation Plan

### Phase 1 — Database migration (safe, non-breaking)

**Files changed:**
- `backend/src/db.js` — replace `better-sqlite3` with `pg` Pool
- `backend/migrations/001_initial_schema.sql` through `005_s3_columns.sql`
- `backend/src/helpers.js` — all db calls become `async/await`
- All route files — `db.prepare().run()` → `await db.query()`
- `backend/package.json` — add `pg`, `bcryptjs`, `uuid`

**Key change in db.js:**
```javascript
// Before (SQLite)
const Database = require("better-sqlite3");
const db = new Database("./taxease.db");
module.exports = db;

// After (PostgreSQL)
const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});
module.exports = { query: (text, params) => pool.query(text, params), pool };
```

**Key change in helpers.js:**
```javascript
// Before
function hashPassword(plain) {
  return crypto.createHash("sha256").update(plain).digest("hex");
}

// After
const bcrypt = require("bcryptjs");
async function hashPassword(plain) { return bcrypt.hash(plain, 12); }
async function verifyPassword(plain, hash) { return bcrypt.compare(plain, hash); }
```

---

### Phase 2 — Invite system

**New file: `backend/src/routes/auth.js`** additions:
```
POST /api/auth/accept-invite
  1. db.query("SELECT * FROM invite_tokens WHERE token=$1", [token])
  2. check not expired, not used
  3. bcrypt.hash(password)
  4. UPDATE users SET password_hash, must_change_password=false, portal_status='active'
  5. UPDATE invite_tokens SET used_at=NOW()
  6. return 200

POST /api/auth/setup-password  (requires JWT)
  1. verify current password
  2. bcrypt.hash(newPassword)
  3. UPDATE users SET password_hash, must_change_password=false
  4. return 200
```

**New: `backend/src/config/aws.js`**
```javascript
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const ses = new SESClient({ region: process.env.AWS_REGION });
const s3  = new S3Client({ region: process.env.AWS_REGION });

async function sendInviteEmail({ toEmail, toName, inviteUrl }) { ... }
async function getPresignedUploadUrl({ bucket, key, contentType, expiresIn = 300 }) { ... }

module.exports = { ses, s3, sendInviteEmail, getPresignedUploadUrl };
```

**Updated: `POST /api/admin/clients`**
```
1. INSERT user with portal_status='pending', must_change_password=TRUE
2. crypto.randomBytes(32).toString('hex') → token
3. INSERT invite_tokens (user_id, token, expires_at=now+7days)
4. sendInviteEmail({ toEmail, toName, inviteUrl: `${FRONTEND_URL}/invite/${token}` })
5. Return user without temporaryPassword
```

---

### Phase 3 — Template system

**New file: `backend/src/routes/admin-templates.js`**
```
GET    /api/admin/templates            → list with latest version
POST   /api/admin/templates            → create template
GET    /api/admin/templates/:id        → get with all versions
PATCH  /api/admin/templates/:id        → update name/description/isActive
POST   /api/admin/templates/:id/versions         → create new version with formSchema
PATCH  /api/admin/templates/:id/versions/:vid/publish → publish (lock)
DELETE /api/admin/templates/:id        → soft-delete (is_active=false)
```

---

### Phase 4 — Submission system

**New file: `backend/src/routes/client-forms.js`**
```
GET    /v3/api/v1/tasks/:taskId/form          → fetch formSchema + existing draft
PUT    /v3/api/v1/tasks/:taskId/form/draft    → upsert draft
POST   /v3/api/v1/tasks/:taskId/form/submit   → validate + submit
GET    /v3/api/v1/submissions                  → history
GET    /v3/api/v1/submissions/:id              → single submission
```

**New file: `backend/src/routes/admin-submissions.js`**
```
GET    /api/admin/submissions                     → paginated list (filter by client/status)
GET    /api/admin/submissions/:id                 → detail with formSchema + data
PATCH  /api/admin/submissions/:id/review          → mark reviewed/rejected
GET    /api/admin/tasks/:taskId/submission        → submission for a task
PATCH  /api/admin/tasks/:taskId/reassign          → move task to another client
```

---

### Phase 5 — S3 file handling

**New file: `backend/src/routes/admin-s3.js`** and update `client-forms.js`:
```
POST /api/admin/s3/presign     → admin presigned upload URL
POST /v3/api/v1/s3/presign     → client presigned upload URL

Both return: { uploadUrl, s3Key, expiresIn }
S3 key format: uploads/{clientId}/{taskId}/{fieldId}/{timestamp}_{filename}
```

---

## 7. Frontend Implementation Plan

### Phase 1 — Invite acceptance page

**New: `src/routes/invite.$token.tsx`**
```
- On mount: GET /api/auth/invite-info/$token (check token valid)
  - If expired → "This invite has expired" + contact admin message
  - If already used → "This invite was already used. Please log in."
  - If valid → Show "Set Your Password" form

- Form: password + confirmPassword
  - POST /api/auth/accept-invite { token, password }
  - On success → navigate to /login with toast "Password set. Please log in."
```

### Phase 2 — Template Builder

**New: `src/routes/templates/index.tsx`**
- Lists all templates (useQuery)
- Create template button → opens dialog for name/description/category
- Each row: Edit, Duplicate, Archive

**New: `src/routes/templates/$templateId.tsx`**
- Shows template metadata
- Version history (version list with publish state)
- "Edit Draft" → opens FormBuilder component
- "Publish Version" button → PATCH publish
- "New Version" → copies last schema as starting point

### Phase 3 — Form Builder Component

**New: `src/components/forms/FormBuilder.tsx`**
```
State: fields: FormField[]

UI layout:
  Left panel:  field type palette (drag source)
  Center:      canvas showing current fields (drop target, reorder)
  Right panel: field config (label, required, options, etc.)

Actions:
  - Add field (click from palette or drag)
  - Delete field
  - Reorder fields (drag-and-drop)
  - Edit field label / placeholder / required / options
  - Preview form (toggle)
  - Save draft (PUT /api/admin/templates/:id/versions/:vid)
  - Publish (PATCH .../publish)
```

### Phase 4 — Form Renderer Component

**New: `src/components/forms/FormRenderer.tsx`**

Props:
```typescript
interface FormRendererProps {
  schema: FormField[];
  initialData?: Record<string, unknown>;
  mode: "fill" | "view";       // fill=editable, view=readonly
  onSaveDraft?: (data: Record<string, unknown>) => void;
  onSubmit?: (data: Record<string, unknown>, attachments: Attachment[]) => void;
}
```

Renders each field by switching on `field.type`:
```
switch (field.type) {
  case "text":        → <TextField />
  case "textarea":    → <TextareaField />
  case "number":      → <NumberField />
  case "email":       → <EmailField />
  case "phone":       → <PhoneField />
  case "date":        → <DateField />
  case "select":      → <SelectField />
  case "checkbox":    → <CheckboxField />
  case "radio":       → <RadioField />
  case "file_upload": → <FileUploadField />   (S3 presigned upload)
  case "signature":   → <SignatureField />    (canvas pad)
  default:            → <div>Unknown field type: {field.type}</div>
}
```

### Phase 5 — Client Portal Pages

**Updated: `$clientId.$tab.tsx` — `tasks` tab**
- Task row now has "View Form / Fill Form" button
- Links to `/clients/{clientId}/tasks/{taskId}/form`

**New: `src/routes/clients/$clientId.tasks.$taskId.form.tsx`**
- Fetches GET /v3/api/v1/tasks/:taskId/form
- Renders `<FormRenderer schema={...} mode="fill" />`
- "Save Draft" → PUT .../form/draft (auto-saved every 30s)
- "Submit" → POST .../form/submit → invalidates task cache

**New: Client tabs — add `submissions` tab**
```
case "submissions": → <Submissions clientId={clientId} />
```
- Lists GET /api/admin/submissions?clientId=...
- Each row: status badge, submittedAt, link to detail

**New: `src/routes/submissions/$submissionId.tsx`**
- Fetches GET /api/admin/submissions/:id
- Renders `<FormRenderer schema={...} mode="view" />` with filled data
- Shows attachments with S3 download links
- Review panel for admin (mark reviewed / rejected + notes)

### Phase 6 — Dashboard (live data)

**Updated: `src/routes/dashboard.tsx`**
- Replace `useAppStore` with `dashboardApi.get()` query
- KPI cards: totalClients, totalTasks, pendingTasks
- Status breakdown bar chart: from `statusBreakdown` array
- Recent submissions widget

---

## 8. AWS Integration

### Environment Variables Required

```bash
# backend/.env

DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/taxease
NODE_ENV=production

# AWS
AWS_REGION=ca-central-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# or: use IAM roles on EC2/ECS (no hardcoded keys)

# S3
S3_BUCKET=taxease-uploads
S3_PRESIGN_EXPIRY=300

# SES
SES_FROM_EMAIL=noreply@taxease.ca
SES_FROM_NAME=TaxEase

# App
FRONTEND_URL=https://app.taxease.ca
JWT_SECRET=...  # or: pull from Secrets Manager

# JWT
JWT_EXPIRES_IN=24h
```

### SES — Invite Email Template

```html
Subject: You've been invited to TaxEase

Hi {name},

Your accountant has invited you to access the TaxEase client portal.

Click the link below to set your password and access your account:
{inviteUrl}

This link expires in 7 days.

If you did not expect this email, please ignore it.

— The TaxEase Team
```

### S3 — Bucket Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowBackendReadWrite",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::ACCOUNT:role/taxease-backend" },
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::taxease-uploads/*"
    }
  ]
}
```

### Secrets Manager

Store and retrieve:
```javascript
// config/aws.js
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

async function getSecret(secretId) {
  const client = new SecretsManagerClient({ region: process.env.AWS_REGION });
  const res = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
  return JSON.parse(res.SecretString);
}
// Usage at startup:
// const { JWT_SECRET, DATABASE_URL } = await getSecret("taxease/production");
```

---

## 9. Migration Strategy from SQLite

### Approach: Blue-Green with Data Export

```
Step 1 (prep — no downtime)
  · Provision RDS PostgreSQL instance
  · Run all 5 migrations on RDS
  · Deploy new backend alongside old (different port)

Step 2 (data migration — ~30 min maintenance window)
  · Export SQLite data:
      node backend/scripts/migrate-sqlite-to-pg.js
  · Script maps:
      TEXT id → UUID (new uuid generated, mapping table kept)
      TEXT JSON columns → JSONB
      INTEGER AUTOINCREMENT → BIGSERIAL (auto)
      TEXT timestamps → TIMESTAMPTZ
  · Verify row counts match

Step 3 (cutover)
  · Point load balancer to new backend
  · Monitor error logs for 30 min
  · Keep old SQLite instance for 7 days as fallback
```

### Migration Script Outline

```javascript
// backend/scripts/migrate-sqlite-to-pg.js
const sqlite = require("better-sqlite3")("./taxease.db");
const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");

const pg = new Pool({ connectionString: process.env.DATABASE_URL });
const idMap = {};  // old TEXT id → new UUID

async function migrateUsers() {
  const rows = sqlite.prepare("SELECT * FROM users").all();
  for (const r of rows) {
    const newId = uuidv4();
    idMap[r.id] = newId;
    await pg.query(
      `INSERT INTO users (id, email, password_hash, name, role, phone, ...)
       VALUES ($1,$2,$3,$4,$5,$6,...) ON CONFLICT DO NOTHING`,
      [newId, r.email, r.password_hash, r.name, r.role, r.phone, ...]
    );
  }
}

async function migrateTasks() {
  const rows = sqlite.prepare("SELECT * FROM tasks").all();
  for (const r of rows) {
    const newId = uuidv4();
    idMap[r.id] = newId;
    await pg.query(
      `INSERT INTO tasks (id, client_id, assigned_by, title, ...)
       VALUES ($1, $2, $3, $4, ...)`,
      [newId, idMap[r.client_id], idMap[r.assigned_by] ?? null, r.title, ...]
    );
  }
}

// Run: node migrate-sqlite-to-pg.js
(async () => {
  await migrateUsers();
  await migrateTasks();
  await migrateQuerySheetRows();
  await migrateEmployees();
  await migratePayrollEntries();
  console.log("Migration complete");
  process.exit(0);
})();
```

### ID Mapping for Frontend

All existing URLs like `/clients/client-john/home` will break because IDs become UUIDs.

**Solution:** Add a `slug` column to users table during migration:
```sql
ALTER TABLE users ADD COLUMN slug TEXT;
UPDATE users SET slug = id;  -- preserve old text IDs as slugs
CREATE UNIQUE INDEX idx_users_slug ON users(slug);
```

Backend then accepts both UUID and slug for client lookups:
```javascript
// Accepts: /api/admin/clients/client-john  OR  /api/admin/clients/uuid-here
const row = await db.query(
  "SELECT * FROM users WHERE (id::text = $1 OR slug = $1) AND role='client'",
  [req.params.clientId]
);
```

---

## 10. Step-by-Step Execution Order

Each step is a **production-safe commit**. No step breaks the previous step's working state.

### Step 1 — Dependencies & Config
```bash
cd backend
npm install pg bcryptjs uuid zod \
  @aws-sdk/client-ses \
  @aws-sdk/client-s3 \
  @aws-sdk/s3-request-presigner \
  @aws-sdk/client-secrets-manager
```
- Create `backend/.env.example`
- Create `backend/src/config/env.js` (validates env vars at startup)
- Create `backend/src/config/aws.js` (SES + S3 clients)

### Step 2 — PostgreSQL Migrations
- Write all 5 SQL migration files in `backend/src/migrations/`
- Create `backend/src/migrate.js` (reads and runs migration files in order)
- Test against a local PostgreSQL instance

### Step 3 — Database Layer Migration
- Rewrite `backend/src/db.js` → pg Pool
- Rewrite `backend/src/helpers.js` → async hashPassword (bcrypt), async verifyPassword
- Rewrite all route files to use `await db.query()` syntax
- Update middleware/auth.js to async

### Step 4 — Invite System Backend
- Add invite_tokens table (migration 002)
- Update `POST /api/admin/clients` to send invite email
- Add `POST /api/auth/accept-invite`
- Add `POST /api/admin/clients/:id/resend-invite`
- Add `POST /api/auth/setup-password`
- Add `GET /api/auth/invite-info/:token` (check token validity without consuming it)

### Step 5 — Invite Page (Frontend)
- Create `src/routes/invite.$token.tsx`
- Update `src/lib/api.ts` with invite and accept-invite endpoints
- Update `src/routes/clients/index.tsx` to remove "temporary password" display

### Step 6 — Template System Backend
- Add template tables (migration 003)
- Create `backend/src/routes/admin-templates.js`
- Mount in `index.js`
- Update OpenAPI spec

### Step 7 — Template Builder (Frontend)
- Create `src/lib/formTypes.ts` with TypeScript types for FormField
- Create `src/components/forms/` directory + all 11 field components
- Create `src/components/forms/FormBuilder.tsx`
- Create `src/routes/templates/index.tsx`
- Create `src/routes/templates/$templateId.tsx`
- Add "Templates" to Sidebar navigation

### Step 8 — Submission System Backend
- Add submission tables (migration 004)
- Create `backend/src/routes/client-forms.js`
- Create `backend/src/routes/admin-submissions.js`
- Update `POST /api/admin/clients/:clientId/tasks` to accept templateId
- Mount new routes in `index.js`

### Step 9 — Form Renderer + Submission Pages (Frontend)
- Create `src/components/forms/FormRenderer.tsx`
- Create `src/routes/clients/$clientId.tasks.$taskId.form.tsx`
- Add `submissions` case to tab switch in `$clientId.$tab.tsx`
- Create `src/routes/submissions/$submissionId.tsx`

### Step 10 — S3 File Uploads
- Add S3 column migration (005)
- Create `backend/src/routes/admin-s3.js` and `client-s3.js`
- Create `src/components/forms/fields/FileUploadField.tsx` with presigned URL upload
- Create `src/components/forms/fields/SignatureField.tsx` with canvas pad
- Update all existing document upload routes to use S3

### Step 11 — Dashboard Live Data
- Update `src/routes/dashboard.tsx` to use `dashboardApi.get()`
- Connect KPI cards, status chart, recent submissions widget

### Step 12 — Data Migration from SQLite
- Write `backend/scripts/migrate-sqlite-to-pg.js`
- Run in staging first, verify counts
- Run in production with maintenance window

### Step 13 — Final
- Update `ARCHITECTURE.md` to v2
- Update Swagger / OpenAPI spec for all new endpoints
- Smoke test full flows: invite → set password → login → fill form → submit → admin review

---

## Quick Reference: New npm Dependencies

### Backend
```json
{
  "pg": "^8.12.0",
  "bcryptjs": "^2.4.3",
  "uuid": "^9.0.0",
  "zod": "^3.23.0",
  "@aws-sdk/client-ses": "^3.600.0",
  "@aws-sdk/client-s3": "^3.600.0",
  "@aws-sdk/s3-request-presigner": "^3.600.0",
  "@aws-sdk/client-secrets-manager": "^3.600.0"
}
```

### Frontend (additions)
```json
{
  "react-signature-canvas": "^1.0.6",
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/sortable": "^8.0.0"
}
```

---

*End of blueprint. Proceed to execution starting with Step 1.*
