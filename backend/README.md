// Shared README for the backend — generated for quick reference
# TaxEase Backend

Node.js + Express + SQLite backend serving both the admin panel and client mobile app.

## Quick Start

```bash
cd backend
npm install          # one-time
node src/seed.js     # seed test data (one-time)
node src/index.js    # start server on port 3001
```

## Test Credentials
| Role    | Email                          | Password   |
|---------|--------------------------------|------------|
| Admin   | admin@taxease.ca               | admin123   |
| Client  | john@johnsbakery.ca            | client123  |
| Client  | sarah@sarahsrestaurant.ca      | client123  |

## Swagger UI

With the server running:

1. Open **http://localhost:3001/api-docs** in your browser
2. Call **POST /api/auth/login** (e.g. `admin@taxease.ca` / `admin123`)
3. Copy `data.token` from the response
4. Click **Authorize** → enter `Bearer <your-token>` → Authorize
5. Try any admin or client endpoint from the UI

Raw OpenAPI JSON: **http://localhost:3001/api-docs.json**

## Base URLs
- Client API (Flutter app): `http://localhost:3001/v3/api/v1`
- Admin API (this panel):    `http://localhost:3001/api/admin`
- Auth:                      `http://localhost:3001/api/auth`
- API docs (Swagger):        `http://localhost:3001/api-docs`

## Admin Status Values
On Hold | Not to Do | Data not received | Partial Data received |
Data Missing Closed | Work in Progress | Query sent to Support team |
Query sent to client | Partial Query received | Review |
Sent for Approval to support team | Sent for Approval to client |
Approval received | Filed
