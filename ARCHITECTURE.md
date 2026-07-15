# TaxEase Admin — Full System Architecture

> **Last updated:** June 2026  
> **Stack:** React (TanStack Start + TanStack Router + TanStack Query) · Node.js / Express · SQLite (better-sqlite3) · Zustand · Tailwind CSS / shadcn-ui

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Directory Structure](#2-directory-structure)
3. [Startup Sequence](#3-startup-sequence)
4. [Authentication Flow](#4-authentication-flow)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Route Tree & Switch Cases](#6-route-tree--switch-cases)
7. [State Management](#7-state-management)
8. [API Client Layer](#8-api-client-layer)
9. [Backend Architecture](#9-backend-architecture)
10. [Database Schema](#10-database-schema)
11. [Admin Status Workflow](#11-admin-status-workflow)
12. [Task Lifecycle (End-to-End)](#12-task-lifecycle-end-to-end)
13. [Edge Cases & Guards](#13-edge-cases--guards)
14. [Data Flow Diagrams](#14-data-flow-diagrams)
15. [Known Limitations / Stubs](#15-known-limitations--stubs)

---

## 1. System Overview

```
┌─────────────────────────────────┐        ┌──────────────────────────────────┐
│  Admin Panel (React)            │        │  Client Mobile App (Flutter)     │
│  localhost:8080 / ngrok         │        │  (external, not in this repo)    │
│                                 │        │                                  │
│  TanStack Start (SSR-capable)   │        │  Uses /v3/api/v1/* endpoints     │
└───────────────┬─────────────────┘        └────────────┬─────────────────────┘
                │  Bearer JWT                           │  Bearer JWT
                ▼                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  Express Backend  →  localhost:3001                                          │
│                                                                              │
│  /api/auth/*          login, me                                              │
│  /api/admin/*         admin-only (clients, tasks, dashboard)                 │
│  /v3/api/v1/tasks/*   client task actions                                   │
│  /v3/api/v1/documents/* OCR upload                                          │
│  /v3/api/v1/payroll/* employees, entries, automation                        │
│  /api-docs            Swagger UI                                             │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │  SQLite (taxease.db)      │
                    │  better-sqlite3          │
                    │  File: backend/taxease.db│
                    └──────────────────────────┘
```

---

## 2. Directory Structure

```
taxease-admin-business/
├── src/                          # Frontend (React / TanStack Start)
│   ├── routes/
│   │   ├── __root.tsx            # App root — QueryClientProvider lives here
│   │   ├── index.tsx             # "/" redirect guard
│   │   ├── login.tsx             # Login page
│   │   ├── dashboard.tsx         # Dashboard (still uses local Zustand store)
│   │   ├── tasks.tsx             # All-tasks view (backend connected)
│   │   ├── clients/
│   │   │   ├── index.tsx         # Client list (backend connected)
│   │   │   ├── $clientId.tsx     # Client layout + sidebar (backend connected)
│   │   │   ├── $clientId.$tab.tsx # Per-tab content (Tasks tab: backend connected)
│   │   │   └── $clientId.index.tsx
│   │   └── *.tsx                 # Other pages (billing, ocr, inbox, etc.)
│   ├── store/
│   │   ├── useAuthStore.ts       # JWT token + user (Zustand, SSR-safe)
│   │   └── useAppStore.ts        # Legacy local store (mock data, not yet replaced)
│   ├── lib/
│   │   └── api.ts                # Typed fetch wrapper for backend API
│   ├── components/
│   │   ├── app/
│   │   │   ├── AppShell.tsx      # Layout wrapper + auth guard
│   │   │   ├── Sidebar.tsx       # Left navigation
│   │   │   ├── TopBar.tsx        # Top bar with user info + logout
│   │   │   └── ...               # Shared UI components
│   │   └── ui/                   # shadcn-ui primitives
│   └── styles.css
│
├── backend/                      # Node.js / Express backend
│   ├── src/
│   │   ├── index.js              # Entry point — mounts all routes
│   │   ├── db.js                 # SQLite connection (better-sqlite3)
│   │   ├── schema.js             # CREATE TABLE IF NOT EXISTS (idempotent)
│   │   ├── seed.js               # One-time test data seeder
│   │   ├── helpers.js            # ok/fail/paged/formatTask/hashPassword/etc.
│   │   ├── openapi.js            # Full OpenAPI 3.0 spec
│   │   ├── swagger.js            # Mounts swagger-ui-express at /api-docs
│   │   ├── middleware/
│   │   │   └── auth.js           # requireAuth(role) — JWT middleware
│   │   └── routes/
│   │       ├── auth.js           # POST /api/auth/login, GET /api/auth/me
│   │       ├── admin.js          # All /api/admin/* routes
│   │       ├── client-tasks.js   # /v3/api/v1/tasks/*
│   │       ├── client-documents.js # /v3/api/v1/documents/*
│   │       └── client-payroll.js # /v3/api/v1/payroll/*
│   ├── taxease.db                # SQLite database file (auto-created)
│   ├── package.json
│   └── README.md
│
├── canvases/
│   └── api-json-documentation.canvas.tsx  # Interactive API docs (React canvas)
│
├── vite.config.ts                # Vite config — allowedHosts for ngrok
└── ARCHITECTURE.md               # This file
```

---

## 3. Startup Sequence

### Backend (must start first)

```bash
cd backend
npm install          # one-time
node src/seed.js     # one-time — populates taxease.db with test data
node src/index.js    # starts Express on port 3001
# or for auto-reload:
npm run dev          # node --watch src/index.js
```

**What happens at startup:**
1. `initSchema()` runs all `CREATE TABLE IF NOT EXISTS` — safe to call every time
2. Express middleware registered: CORS (origin: *), JSON parser, URL encoder, logger
3. Swagger UI mounted at `/api-docs`
4. Routes mounted in order: auth → admin → client-tasks → client-documents → client-payroll
5. Server listens on `PORT` env variable or `3001`

### Frontend

```bash
npm run dev          # starts Vite dev server on port 8080
```

**What happens at startup:**
1. TanStack Start SSR renders `__root.tsx` → `RootShell` (html/head/body) + `RootComponent` (QueryClientProvider + Outlet)
2. Route `/` hits `beforeLoad` — reads `localStorage` (SSR guard in place) → redirects to `/login` or `/dashboard`
3. `AppShell` checks `useAuthStore.isAuthenticated()` on every render — redirects to `/login` if false

---

## 4. Authentication Flow

### Login

```
User fills email/password on /login
  → LoginPage.handleLogin()
    → authApi.login(email, password)          POST /api/auth/login
      → Backend: SHA-256 hash compare
        ✓ match  → JWT signed (24h), returned
        ✗ no match → 401 "Invalid email or password"
    → if res.data.user.role !== "admin"
        → toast.error("This portal is for admin users only.")  ← blocks non-admins
        → return (no login)
    → useAuthStore.login(token, user)
        → localStorage.setItem("taxease_token", token)
        → localStorage.setItem("taxease_user", JSON.stringify(user))
        → Zustand state updated: { token, user }
    → navigate("/dashboard")
```

### Auth Persistence (across page refreshes)

```
useAuthStore initialised (module load):
  isBrowser = typeof window !== "undefined"
  token = isBrowser ? localStorage.getItem("taxease_token") : null
  user  = isBrowser ? JSON.parse(localStorage.getItem("taxease_user")) : null
```

### Auth Guard on every protected page

`AppShell.tsx` (wraps every page except `/login`):
```
useEffect(() => {
  if (!isAuthenticated()) navigate({ to: "/login" })
}, [])

if (!isAuthenticated()) return null   ← prevents flash of protected content
```

### Logout

```
TopBar logout button
  → useAuthStore.logout()
    → (browser only)
        localStorage.removeItem("taxease_token")
        localStorage.removeItem("taxease_user")
        window.location.href = "/login"   ← hard redirect (clears all state)
    → Zustand: set({ token: null, user: null })
```

### JWT in API Requests

```
api.ts → getToken()
  → typeof window === "undefined" ? "" : localStorage.getItem("taxease_token")

Every request adds:
  Authorization: Bearer <token>
```

### Backend JWT Verification (middleware/auth.js)

```javascript
requireAuth(role):
  1. Extract token from Authorization header
  2. jwt.verify(token, JWT_SECRET)
     ✗ expired / invalid → 401 Unauthorized
  3. if role provided: check payload.role === role
     ✗ wrong role → 403 Forbidden
  4. req.user = { sub, role, name }
  5. next()
```

---

## 5. Frontend Architecture

### Root Component Tree

```
__root.tsx
└── RootShell (html > head > body)        ← server-rendered HTML shell
    └── RootComponent
        └── QueryClientProvider           ← TanStack Query context (1 shared instance)
            └── <Outlet />                ← current route component renders here
```

### QueryClient Configuration

```typescript
new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,                    // retry failed requests once
      refetchOnWindowFocus: false  // don't refetch when tab regains focus
    }
  }
})
```

### AppShell (Layout Wrapper)

Every authenticated page renders inside `<AppShell>`:
```
AppShell
├── Sidebar (fixed left, 60px wide)
├── TopBar  (sticky top, shows user name + logout)
└── <main>{children}</main>
```

---

## 6. Route Tree & Switch Cases

### Route Hierarchy

```
/ (index)          beforeLoad → redirect to /login or /dashboard
/login             public — LoginPage
/dashboard         protected — uses legacy Zustand store (mock data)
/tasks             protected — all tasks from backend
/clients           protected — client list from backend
/clients/$clientId         — ClientLayout (fetches client from backend)
  /clients/$clientId/$tab  — ClientTab switch (see below)
/ocr               protected — stub
/billing           protected — stub
/inbox             protected — stub
/files             protected — stub
/time              protected — stub
/insights          protected — stub
/workflows         protected — stub
/templates         protected — stub
/settings          protected — stub
/submission-history protected — stub
```

### `/` beforeLoad Logic

```javascript
beforeLoad: () => {
  // SSR guard — server has no localStorage
  if (typeof window === "undefined") throw redirect({ to: "/dashboard" })

  const token = localStorage.getItem("taxease_token")
  if (!token) throw redirect({ to: "/login" })   // not logged in
  throw redirect({ to: "/dashboard" })            // logged in → dashboard
}
```

### Client Tab Switch (`/clients/$clientId/$tab`)

The `$tab` URL parameter controls which component renders:

```
ClientTab()
  → fetch client from backend (useQuery)
    → isLoading  → show spinner
    → isError or no data → "Client not found" with Back link
    → success → run switch(tab):

  switch (tab) {
    case "home"             → <Home />             (uses legacy Zustand tasks)
    case "communication"    → <Communication />    (uses legacy Zustand messages)
    case "notes"            → <Notes />            (uses legacy Zustand notes)
    case "files"            → <Files />            (uses legacy Zustand files)
    case "tasks"            → <Tasks />            ← BACKEND CONNECTED ✓
    case "resolution-cases" → <Resolution />       (empty state / stub)
    case "organizers"       → <Organizers />       (stub)
    case "transcripts"      → <Transcripts />      (stub)
    case "billing"          → <Billing />          (uses legacy Zustand billing)
    case "time-entries"     → <TimeEntries />      (uses legacy Zustand timeEntries)
    default                 → <Home />             (fallback for unknown tabs)
  }
```

### Tab Link Generation (ClientLayout)

```javascript
const tabs = [
  ["home", "Home"],
  ["communication", "Communication"],
  ["notes", "Notes"],
  ["files", "Files"],
  ["tasks", "Tasks"],
  ["resolution-cases", "Resolution Cases"],
  ["organizers", "Organizers"],
  ["transcripts", "Transcripts"],
  ["billing", "Billing"],
  ["time-entries", "Time Entries"],
]

// Active tab detection:
const active = path.endsWith(`/${slug}`)
```

### Clients List Filter Tabs (`/clients`)

```
tabs state: "all" | "without" | "with"

switch (tab):
  "all"     → show all clients                        (no filter)
  "without" → filter: c.portalStatus === "none"       (no portal access)
  "with"    → filter: c.portalStatus !== "none"       (has portal access)
```

### Portal Status Badge Colors

```
portalStatus === "active"  → bg-emerald-50 text-emerald-700
portalStatus === "pending" → bg-amber-50   text-amber-700
anything else              → bg-muted      text-muted-foreground
```

### Tasks Page Filter (`/tasks`)

```
adminStatusFilter state: "All" | one of 14 ADMIN_STATUSES

Filter logic:
  adminStatusFilter === "All" → show all
  else → t.adminStatus === adminStatusFilter

  AND: title or clientName contains search query (case-insensitive)
```

---

## 7. State Management

### Two Stores in Use

| Store | Purpose | Data source | SSR Safe |
|-------|---------|-------------|----------|
| `useAuthStore` | JWT token + user identity | `localStorage` | ✓ (guarded) |
| `useAppStore` | Legacy mock data | In-memory / hardcoded | ✓ (no localStorage) |

### `useAuthStore` (Zustand)

```typescript
state:
  token: string | null       ← JWT from backend
  user: { id, name, email, role } | null

actions:
  login(token, user)         ← called after successful POST /api/auth/login
  logout()                   ← clears storage + redirects to /login
  isAuthenticated()          ← returns !!token
```

**SSR Safety Pattern:**
```typescript
const isBrowser = typeof window !== "undefined"

token: isBrowser ? localStorage.getItem("taxease_token") : null
// All localStorage calls wrapped in isBrowser checks
// window.location.href only called inside isBrowser block
```

### `useAppStore` (Zustand)

Used by: `dashboard.tsx`, `Home` tab, `Communication` tab, `Notes` tab, `Files` tab, `Billing` tab, `TimeEntries` tab.

Contains: `clients`, `tasks`, `messages`, `notes`, `files`, `billing`, `timeEntries`, `costs`, `sales`, `transactions`, `activity`

> ⚠️ This store uses **hardcoded mock data** and is not connected to the backend. Pages using it show static data.

### TanStack Query Cache Keys

| Query Key | Data Fetched | Stale Time | Refetch Interval |
|-----------|-------------|-----------|-----------------|
| `["admin-clients", q]` | Client list (search=q) | 30s | — |
| `["client", clientId]` | Single client | default | — |
| `["client-tasks", clientId]` | Tasks for client | 15s | — |
| `["admin-tasks"]` | All tasks | 15s | 30s |

---

## 8. API Client Layer

`src/lib/api.ts` — all backend communication goes through here.

### Token Injection

```typescript
function getToken(): string {
  if (typeof window === "undefined") return ""   // SSR: no token
  return localStorage.getItem("taxease_token") ?? ""
}

// Every request:
headers: {
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {})
}
```

### Error Handling

```typescript
const json = await res.json()
if (!res.ok) throw new Error(json.message ?? "Request failed")
// thrown Error is caught by TanStack Query → isError = true
// or caught manually in try/catch → toast.error(err.message)
```

### API Modules

#### `authApi`
| Method | Endpoint | Notes |
|--------|---------|-------|
| `login(email, password)` | POST /api/auth/login | Returns token + user |

#### `clientsApi`
| Method | Endpoint | Notes |
|--------|---------|-------|
| `list(search, page, per_page)` | GET /api/admin/clients | Paginated, search param |
| `get(id)` | GET /api/admin/clients/:id | Single client |
| `create(body)` | POST /api/admin/clients | Creates client user in DB |

#### `tasksApi`
| Method | Endpoint | Notes |
|--------|---------|-------|
| `listAll(params)` | GET /api/admin/tasks | Filters: clientId, adminStatus, status |
| `listForClient(clientId)` | GET /api/admin/clients/:clientId/tasks | All tasks for one client |
| `create(clientId, body)` | POST /api/admin/clients/:clientId/tasks | Assigns new task |
| `update(taskId, body)` | PATCH /api/admin/tasks/:taskId | Update adminStatus, title, etc. |
| `delete(taskId)` | DELETE /api/admin/tasks/:taskId | Removes task + cascade |

#### `dashboardApi`
| Method | Endpoint | Notes |
|--------|---------|-------|
| `get()` | GET /api/admin/dashboard | Counts + status breakdown |

### Response Envelope Format

**Success:**
```json
{ "success": true, "message": "...", "data": {...} }
```

**Paginated:**
```json
{
  "success": true,
  "message": "...",
  "data": [...],
  "pagination": { "page": 1, "per_page": 20, "total_items": 42, "total_pages": 3 }
}
```

**Error:**
```json
{ "success": false, "message": "Error description", "errors": [...] }
```

---

## 9. Backend Architecture

### Middleware Chain (per request)

```
Request
  → CORS (origin: *, all methods)
  → express.json() + express.urlencoded()
  → Logger (console.log timestamp + method + path)
  → Route handler
    → requireAuth(role) middleware (if protected)
    → Business logic
    → Response
  → 404 catch-all (if no route matched)
```

### Route Modules

#### `routes/auth.js` — Public

| Method | Path | Action |
|--------|------|--------|
| POST | /api/auth/login | Verify email+password, return JWT |
| GET  | /api/auth/me | Decode token, return user profile |

#### `routes/admin.js` — Admin JWT required

| Method | Path | Action |
|--------|------|--------|
| GET  | /api/admin/meta/admin-statuses | Returns array of 14 status strings |
| GET  | /api/admin/dashboard | Counts: clients, tasks, pending, completed, statusBreakdown |
| GET  | /api/admin/clients | List clients (search, page, per_page) |
| POST | /api/admin/clients | Create new client |
| GET  | /api/admin/clients/:clientId | Get single client |
| PATCH | /api/admin/clients/:clientId | Update client fields |
| DELETE | /api/admin/clients/:clientId | Delete client |
| GET  | /api/admin/tasks | List all tasks (filters: clientId, adminStatus, status) |
| GET  | /api/admin/clients/:clientId/tasks | Tasks for one client |
| POST | /api/admin/clients/:clientId/tasks | Assign task to client |
| PATCH | /api/admin/tasks/:taskId | Update task (adminStatus, title, etc.) |
| DELETE | /api/admin/tasks/:taskId | Delete task |
| POST | /api/admin/tasks/:taskId/query-sheet | Set query sheet rows |

#### `routes/client-tasks.js` — Client JWT required

| Method | Path | Action |
|--------|------|--------|
| GET  | /v3/api/v1/tasks | List client's own tasks |
| GET  | /v3/api/v1/tasks/:task_id | Get single task |
| POST | /v3/api/v1/tasks/:task_id/complete | Mark task complete |
| GET  | /v3/api/v1/tasks/:task_id/query-sheet | Get query sheet rows |
| POST | /v3/api/v1/tasks/:task_id/query-sheet/upload | Upload Excel file |
| POST | /v3/api/v1/tasks/:task_id/query-sheet/remarks | Submit client remarks |
| GET  | /v3/api/v1/tasks/:task_id/document-buckets | Get upload buckets |
| POST | /v3/api/v1/tasks/:task_id/documents/upload | Upload document to bucket |
| POST | /v3/api/v1/tasks/:task_id/documents/submit | Submit all uploaded docs |

#### `routes/client-documents.js` — Client JWT required

| Method | Path | Action |
|--------|------|--------|
| POST | /v3/api/v1/documents/upload | Upload file for OCR (pdf/jpg/png) |
| GET  | /v3/api/v1/documents/ocr-status | Batch OCR status check |
| GET  | /v3/api/v1/documents/:document_id/ocr-result | Get OCR result |

#### `routes/client-payroll.js` — Client JWT required

| Method | Path | Action |
|--------|------|--------|
| GET/POST | /v3/api/v1/payroll/employees | List / create |
| GET/PATCH/DELETE | /v3/api/v1/payroll/employees/:id | CRUD single employee |
| GET/POST | /v3/api/v1/payroll/entries | List / create payroll entries |
| GET/PATCH/DELETE | /v3/api/v1/payroll/entries/:id | CRUD single entry |
| POST | /v3/api/v1/payroll/entries/:id/submit | Submit payroll |
| POST | /v3/api/v1/payroll/entries/:id/documents | Attach document |
| GET/PUT | /v3/api/v1/payroll/automation | Get / save automation config |
| POST | /v3/api/v1/payroll/automation/disable | Disable automation |
| POST | /v3/api/v1/payroll/automation/run | Run automation (generate pending entries) |

### Password Hashing

```javascript
// helpers.js
hashPassword(plain)   → crypto.createHash("sha256").update(plain).digest("hex")
verifyPassword(plain, hash) → hashPassword(plain) === hash
```

> ⚠️ SHA-256 without salt — acceptable for local dev/demo. Use bcrypt for production.

### ID Generation

```javascript
genId(prefix)  → `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`
// e.g. "doc_1717200000000_a3f9k"

// Special cases:
task id  → `task-${clientId.slice(0,8)}-${Date.now()}`
client id → `client-${Date.now()}`
employee id → `EMP_${Date.now()}`
payroll id → `PAY_${Date.now()}`
```

---

## 10. Database Schema

### Tables Overview

```
users
  id TEXT PK | email UNIQUE | password_hash | name | role (admin/client)
  phone | ssn | dob | occupation | client_since
  portal_status (active/pending/none) | created_at | updated_at

tasks
  id TEXT PK | client_id FK→users | assigned_by (admin user id)
  title | description | status (pending/complete) | admin_status
  task_type | metadata JSON | completion_note | completed_at
  created_at | updated_at

query_sheet_rows
  id INT AUTOINCREMENT PK
  task_id FK→tasks | row_index INT
  date | details | payment | receipt | hst
  our_remarks | client_remarks
  UNIQUE(task_id, row_index)

task_documents
  id TEXT PK | task_id FK→tasks | category
  file_name | original_filename | file_type | file_size
  storage_path | status | uploaded_at

documents                         ← OCR documents (separate from task_documents)
  id TEXT PK | client_id FK→users | filing_id
  name | original_filename | file_type | file_size
  section_name | document_type | storage_path
  status | ocr_status | ocr_result | ocr_confidence | ocr_processed_at
  uploaded_at | created_at

employees
  id TEXT PK | client_id FK→users
  name | email | first_name | last_name | middle_name
  date_of_birth | gender | phone | sin
  address_line_1..postal_code
  start_date | position | department
  hourly_rate | federal_tax_credit | provincial_tax_credit | salary
  metadata JSON | created_at | updated_at

payroll_entries
  id TEXT PK | client_id FK→users
  period_label | period_start | period_end
  status (pending/submitted) | employee_ids JSON array
  total_amount | notes | document_paths JSON | metadata JSON
  is_auto_generated BOOL | submitted_at
  created_at | updated_at

payroll_automation_configs
  id INT AUTOINCREMENT PK
  client_id FK→users UNIQUE
  start_date | frequency (weekly/biweekly/monthly)
  is_active BOOL | last_generated_date
  created_at | updated_at
```

### Indexes

```sql
idx_tasks_client  ON tasks(client_id)
idx_tasks_status  ON tasks(status)
idx_emp_client    ON employees(client_id)
idx_pay_client    ON payroll_entries(client_id)
idx_docs_client   ON documents(client_id)
```

### Cascade Deletes

All child tables have `ON DELETE CASCADE` from `users`. Deleting a client removes their tasks, documents, employees, payroll entries, etc. Tasks cascade to `query_sheet_rows` and `task_documents`.

---

## 11. Admin Status Workflow

The `adminStatus` field on tasks is an **internal admin tracking field** — invisible to the client mobile app. The client only sees `status` (pending/complete).

### 14 Valid Admin Statuses (in workflow order)

```
1.  On Hold
2.  Not to Do
3.  Data not received          ← default when task is assigned
4.  Partial Data received
5.  Data Missing Closed
6.  Work in Progress
7.  Query sent to Support team
8.  Query sent to client
9.  Partial Query received
10. Review
11. Sent for Approval to support team
12. Sent for Approval to client
13. Approval received
14. Filed
```

### Status Color Map (Tasks page badges)

| Status | Color |
|--------|-------|
| Filed | `bg-emerald-100 text-emerald-800` |
| Approval received | `bg-emerald-50 text-emerald-700` |
| Review | `bg-blue-50 text-blue-700` |
| Work in Progress | `bg-blue-100 text-blue-800` |
| Query sent to client | `bg-amber-50 text-amber-700` |
| Query sent to Support team | `bg-amber-100 text-amber-800` |
| Sent for Approval to client | `bg-purple-50 text-purple-700` |
| Sent for Approval to support team | `bg-purple-100 text-purple-800` |
| Partial Query received | `bg-orange-50 text-orange-700` |
| Partial Data received | `bg-yellow-50 text-yellow-700` |
| Data not received | `bg-rose-50 text-rose-700` |
| Data Missing Closed | `bg-gray-100 text-gray-600` |
| On Hold | `bg-slate-100 text-slate-600` |
| Not to Do | `bg-gray-50 text-gray-500` |
| (unknown) | `bg-muted text-muted-foreground` |

### Validation (backend)

```javascript
if (!ADMIN_STATUSES.includes(adminStatus))
  return res.status(400).json(fail(`Invalid adminStatus. Allowed: ${ADMIN_STATUSES.join(", ")}`))
```

---

## 12. Task Lifecycle (End-to-End)

### Admin assigns task

```
Admin opens /clients/client-john/tasks
  → Tasks component mounts
  → useQuery(["client-tasks", "client-john"]) fires
      → GET /api/admin/clients/client-john/tasks  (admin JWT)
  → Task list displayed

Admin clicks "Assign task"
  → Dialog opens with form:
      title (required)
      taskType: info | onboarding_form | sheet_remarks | basic_docs_upload | payroll
      adminStatus: one of 14 (default: "Data not received")
      description (optional)

Admin submits
  → handleCreate()
    → tasksApi.create("client-john", { title, taskType, adminStatus, description })
        → POST /api/admin/clients/client-john/tasks
    ✓ success
        → toast.success("Task assigned to client")
        → queryClient.invalidateQueries(["client-tasks", "client-john"])  ← refetches task list
        → queryClient.invalidateQueries(["admin-tasks"])                  ← invalidates global tasks page
    ✗ error
        → toast.error(err.message)
```

### Admin updates admin status (inline dropdown)

```
Admin changes dropdown in task row
  → handleStatusChange(taskId, newStatus)
    → setUpdatingId(taskId)  ← disables that dropdown + shows spinner
    → tasksApi.update(taskId, { adminStatus: newStatus })
        → PATCH /api/admin/tasks/:taskId
    ✓ success
        → toast.success("Status → {newStatus}")
        → invalidate ["client-tasks"] + ["admin-tasks"]
        → setUpdatingId(null)
    ✗ error
        → toast.error(err.message)
        → setUpdatingId(null)
```

### Client completes task (mobile app)

```
Client mobile app (Flutter)
  → POST /v3/api/v1/tasks/:task_id/complete  (client JWT)
    → status changes: "pending" → "complete"
    → completedAt set to now

Admin refreshes or auto-refetch fires (every 30s on /tasks page)
  → task appears in "Completed by client" section
  → adminStatus still editable (admin may want to update to "Review", "Filed", etc.)
```

### Admin deletes task

```
Admin clicks "Delete" in task row
  → browser confirm("Delete this task?")
    ✗ cancel → nothing
    ✓ confirm
      → tasksApi.delete(taskId)
          → DELETE /api/admin/tasks/:taskId
        ✓ success
            → toast.success("Task deleted")
            → invalidate ["client-tasks", clientId]
        ✗ error
            → toast.error(err.message)
```

---

## 13. Edge Cases & Guards

### SSR / localStorage

| Location | Guard | What happens on server |
|----------|-------|----------------------|
| `src/routes/index.tsx` | `typeof window === "undefined"` | redirects to /dashboard |
| `src/store/useAuthStore.ts` | `const isBrowser = typeof window !== "undefined"` | token = null, user = null |
| `src/lib/api.ts` getToken() | `typeof window === "undefined"` | returns "" (no token sent) |
| `AppShell.tsx` | `useEffect` (client-only) | guard runs only in browser |
| `logout()` in useAuthStore | `if (isBrowser)` | window.location only in browser |

### Non-admin login attempt

```
LoginPage → after successful API call:
  if (res.data.user.role !== "admin") {
    toast.error("This portal is for admin users only.")
    return  ← never saves token, never navigates
  }
```

### Backend not running

All backend-connected pages show a `WifiOff` error state:
```
isError === true
→ "Backend not reachable"
→ Shows: cd backend && node src/index.js
→ "Retry" button triggers refetch()
```

### Invalid adminStatus from client

Backend rejects any `adminStatus` not in the hardcoded 14-value array:
```
400 Bad Request: "Invalid adminStatus. Allowed: On Hold, Not to Do, ..."
```

### Client not found (stale URL)

`$clientId.tsx` layout:
```
isError || !res?.data
→ "Client not found. Back" link to /clients
```
`$clientId.$tab.tsx`:
```
isError || !clientRes?.data
→ "Client not found." link to /clients
```

### Task already completed (client trying to re-complete)

```
POST /v3/api/v1/tasks/:task_id/complete
  → if row.status === "complete"
      → 409 Conflict: "Task is already completed"
```

### Payroll entry already submitted (update / delete attempt)

```
PATCH /v3/api/v1/payroll/entries/:id
  → if row.status === "submitted" → 409 "Cannot update a submitted payroll entry"

DELETE /v3/api/v1/payroll/entries/:id
  → if row.status === "submitted" → 409 "Cannot delete a submitted payroll entry"
```

### Duplicate email on client creation

```
POST /api/admin/clients
  → SELECT id FROM users WHERE email=?
  → if found → 409 "Email already in use"
```

### Query sheet remarks — empty clientRemarks

```
POST /v3/api/v1/tasks/:id/query-sheet/remarks
  → validates each row: clientRemarks must not be empty
  → if any empty: 400 with per-row field errors
```

### Unknown route

```
__root.tsx → notFoundComponent
  → NotFoundComponent: 404 page with "Go home" link
```

### Query cache invalidation — cross-page consistency

When a task is created or updated on the client detail page, **two** query keys are invalidated:
```javascript
queryClient.invalidateQueries({ queryKey: ["client-tasks", clientId] })
queryClient.invalidateQueries({ queryKey: ["admin-tasks"] })
```
This ensures the global `/tasks` page reflects changes made on the client detail `/tasks` tab.

---

## 14. Data Flow Diagrams

### Authentication Data Flow

```
Browser                     Zustand              localStorage           Backend
   │                           │                      │                    │
   │── form submit ──────────► │                      │                    │
   │                           │── authApi.login() ──────────────────────► │
   │                           │◄─────────────────────────────── token ────│
   │                           │── setItem(token) ──► │                    │
   │                           │── setItem(user)  ──► │                    │
   │                           │── set({token,user})  │                    │
   │◄── navigate /dashboard ── │                      │                    │
   │                           │                      │                    │
   │  (page refresh)           │                      │                    │
   │── store init ────────────►│◄── getItem(token) ── │                    │
   │                           │◄── getItem(user)  ── │                    │
   │── isAuthenticated() ─────►│── !!token ───────────│                    │
```

### Task Assignment Data Flow

```
Admin UI                 TanStack Query            Backend               SQLite
   │                          │                       │                     │
   │── assign task form ─────►│                       │                     │
   │                          │── POST /admin/tasks ─►│                     │
   │                          │                       │── INSERT tasks ─────►│
   │                          │                       │◄─ new task row ──── │
   │                          │◄─ { success, data } ──│                     │
   │◄─ toast "Task assigned"  │                       │                     │
   │                          │── invalidate queries  │                     │
   │                          │── refetch list ──────►│                     │
   │◄─ updated task list ─────│◄─ task list ──────────│                     │
```

---

## 15. Known Limitations / Stubs

### Pages using legacy Zustand store (mock data, not backend-connected)

| Page / Tab | Data Source | Status |
|-----------|------------|--------|
| `/dashboard` | `useAppStore` mock data | Static / not live |
| Client `home` tab | `useAppStore` tasks | Shows mock tasks only |
| Client `communication` tab | `useAppStore` messages | In-memory only |
| Client `notes` tab | `useAppStore` notes | In-memory only |
| Client `files` tab | `useAppStore` files | In-memory, no real upload |
| Client `billing` tab | `useAppStore` billing | Mock invoices |
| Client `time-entries` tab | `useAppStore` timeEntries | Mock entries |

### Stub pages (EmptyState only)

- Client `resolution-cases` tab
- Client `organizers` tab
- Client `transcripts` tab
- `/ocr`, `/billing`, `/inbox`, `/files`, `/time`, `/insights`, `/workflows`, `/templates`, `/settings`, `/submission-history`

### File uploads (in-memory only)

The backend uses `multer.memoryStorage()` — uploaded files are held in RAM and **not persisted** to disk. File paths stored in the DB (`storage_path`) are fake paths. A real storage layer (local filesystem, S3, etc.) would need to be added.

### Security

- **JWT secret** is hardcoded in `middleware/auth.js` — use `process.env.JWT_SECRET` in production
- **Password hashing** uses SHA-256 without salt — use bcrypt in production
- **CORS** is open (`origin: *`) — restrict in production

### Swagger UI

Available at **http://localhost:3001/api-docs** when backend is running.

1. Call `POST /api/auth/login`
2. Copy `data.token`
3. Click **Authorize** → enter `Bearer <token>`
4. Use any endpoint

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@taxease.ca` | `admin123` |
| Client | `john@johnsbakery.ca` | `client123` |
| Client | `sarah@sarahsrestaurant.ca` | `client123` |

---

*End of architecture document.*
