// OpenAPI 3.0 spec for TaxEase Backend
const ADMIN_STATUSES = [
  "On Hold", "Not to Do", "Data not received", "Partial Data received",
  "Data Missing Closed", "Work in Progress", "Query sent to Support team",
  "Query sent to client", "Partial Query received", "Review",
  "Sent for Approval to support team", "Sent for Approval to client",
  "Approval received", "Filed",
];

const successEnvelope = {
  type: "object",
  properties: {
    success: { type: "boolean", example: true },
    message: { type: "string" },
    data: {},
  },
};

const errorEnvelope = {
  type: "object",
  properties: {
    success: { type: "boolean", example: false },
    message: { type: "string" },
    errors: { type: "array", items: { type: "object" } },
  },
};

const bearerAuth = { bearerAuth: [] };

module.exports = {
  openapi: "3.0.3",
  info: {
    title: "TaxEase API",
    version: "1.0.0",
    description: [
      "Backend for the TaxEase **admin panel** and **client mobile app**.",
      "",
      "### Auth",
      "1. `POST /api/auth/login` with email + password",
      "2. Copy `data.token` from the response",
      "3. Click **Authorize** and paste: `Bearer <token>`",
      "",
      "### Test credentials",
      "| Role | Email | Password |",
      "|------|-------|----------|",
      "| Admin | admin@taxease.ca | admin123 |",
      "| Client | john@johnsbakery.ca | client123 |",
      "| Client | sarah@sarahsrestaurant.ca | client123 |",
      "",
      "### Admin statuses",
      ADMIN_STATUSES.join(" · "),
    ].join("\n"),
  },
  servers: [{ url: "http://localhost:3001", description: "Local dev" }],
  tags: [
    { name: "Auth", description: "Login and current user" },
    { name: "Admin", description: "Admin panel (requires admin JWT)" },
    { name: "Client — Tasks", description: "Client mobile app tasks (requires client JWT)" },
    { name: "Client — Documents", description: "OCR document upload (requires client JWT)" },
    { name: "Client — Payroll", description: "Payroll employees, entries, automation (requires client JWT)" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT from POST /api/auth/login",
      },
    },
    schemas: {
      ErrorResponse: errorEnvelope,
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "admin@taxease.ca" },
          password: { type: "string", example: "admin123" },
        },
      },
      Task: {
        type: "object",
        properties: {
          id: { type: "string" },
          clientId: { type: "string" },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          status: { type: "string", enum: ["pending", "complete"] },
          adminStatus: { type: "string", enum: ADMIN_STATUSES },
          taskType: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateTaskRequest: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          taskType: { type: "string", example: "info" },
          adminStatus: { type: "string", enum: ADMIN_STATUSES, default: "Data not received" },
          metadata: { type: "object" },
        },
      },
      UpdateTaskRequest: {
        type: "object",
        properties: {
          adminStatus: { type: "string", enum: ADMIN_STATUSES },
          title: { type: "string" },
          description: { type: "string" },
          status: { type: "string", enum: ["pending", "complete"] },
          metadata: { type: "object" },
        },
      },
      Client: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string" },
          name: { type: "string" },
          phone: { type: "string", nullable: true },
          occupation: { type: "string", nullable: true },
          portalStatus: { type: "string", enum: ["active", "pending", "none"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      CreateClientRequest: {
        type: "object",
        required: ["email", "name"],
        properties: {
          email: { type: "string" },
          name: { type: "string" },
          password: { type: "string", default: "client123" },
          phone: { type: "string" },
          occupation: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } },
        },
        responses: {
          200: { description: "Login successful", content: { "application/json": { schema: successEnvelope } } },
          401: { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user",
        security: bearerAuth,
        responses: {
          200: { description: "User profile", content: { "application/json": { schema: successEnvelope } } },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/admin/meta/admin-statuses": {
      get: {
        tags: ["Admin"],
        summary: "List admin task statuses",
        security: bearerAuth,
        responses: { 200: { description: "Array of 14 status strings" } },
      },
    },
    "/api/admin/dashboard": {
      get: {
        tags: ["Admin"],
        summary: "Dashboard overview",
        security: bearerAuth,
        responses: { 200: { description: "Counts and status breakdown" } },
      },
    },
    "/api/admin/clients": {
      get: {
        tags: ["Admin"],
        summary: "List clients",
        security: bearerAuth,
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "per_page", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: { 200: { description: "Paginated client list" } },
      },
      post: {
        tags: ["Admin"],
        summary: "Create client",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateClientRequest" } } },
        },
        responses: { 201: { description: "Client created" } },
      },
    },
    "/api/admin/clients/{clientId}": {
      get: {
        tags: ["Admin"],
        summary: "Get client",
        security: bearerAuth,
        parameters: [{ name: "clientId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Client details" }, 404: { description: "Not found" } },
      },
      patch: {
        tags: ["Admin"],
        summary: "Update client",
        security: bearerAuth,
        parameters: [{ name: "clientId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { type: "object" } } } },
        responses: { 200: { description: "Updated" } },
      },
      delete: {
        tags: ["Admin"],
        summary: "Delete client",
        security: bearerAuth,
        parameters: [{ name: "clientId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Deleted" } },
      },
    },
    "/api/admin/clients/{clientId}/tasks": {
      get: {
        tags: ["Admin"],
        summary: "List tasks for a client",
        security: bearerAuth,
        parameters: [{ name: "clientId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Task list" } },
      },
      post: {
        tags: ["Admin"],
        summary: "Assign task to client",
        security: bearerAuth,
        parameters: [{ name: "clientId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateTaskRequest" } } },
        },
        responses: { 201: { description: "Task created" } },
      },
    },
    "/api/admin/tasks": {
      get: {
        tags: ["Admin"],
        summary: "List all tasks",
        security: bearerAuth,
        parameters: [
          { name: "clientId", in: "query", schema: { type: "string" } },
          { name: "adminStatus", in: "query", schema: { type: "string", enum: ADMIN_STATUSES } },
          { name: "status", in: "query", schema: { type: "string", enum: ["pending", "complete"] } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "per_page", in: "query", schema: { type: "integer" } },
        ],
        responses: { 200: { description: "Paginated tasks" } },
      },
    },
    "/api/admin/tasks/{taskId}": {
      patch: {
        tags: ["Admin"],
        summary: "Update task (admin status, title, etc.)",
        security: bearerAuth,
        parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateTaskRequest" } } },
        },
        responses: { 200: { description: "Updated" } },
      },
      delete: {
        tags: ["Admin"],
        summary: "Delete task",
        security: bearerAuth,
        parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Deleted" } },
      },
    },
    "/api/admin/tasks/{taskId}/query-sheet": {
      post: {
        tags: ["Admin"],
        summary: "Set query sheet rows for a task",
        security: bearerAuth,
        parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["rows"],
                properties: {
                  rows: { type: "array", items: { type: "object" } },
                  downloadUrl: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Rows uploaded" } },
      },
    },
    "/v3/api/v1/tasks": {
      get: {
        tags: ["Client — Tasks"],
        summary: "List client tasks",
        security: bearerAuth,
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["all", "pending", "complete"], default: "all" } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "per_page", in: "query", schema: { type: "integer" } },
        ],
        responses: { 200: { description: "Paginated tasks" } },
      },
    },
    "/v3/api/v1/tasks/{task_id}": {
      get: {
        tags: ["Client — Tasks"],
        summary: "Get task",
        security: bearerAuth,
        parameters: [{ name: "task_id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Task" }, 404: { description: "Not found" } },
      },
    },
    "/v3/api/v1/tasks/{task_id}/complete": {
      post: {
        tags: ["Client — Tasks"],
        summary: "Mark task complete",
        security: bearerAuth,
        parameters: [{ name: "task_id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", properties: { completionNote: { type: "string" } } },
            },
          },
        },
        responses: { 200: { description: "Completed" } },
      },
    },
    "/v3/api/v1/tasks/{task_id}/query-sheet": {
      get: {
        tags: ["Client — Tasks"],
        summary: "Get query sheet",
        security: bearerAuth,
        parameters: [{ name: "task_id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Query sheet rows" } },
      },
    },
    "/v3/api/v1/tasks/{task_id}/query-sheet/upload": {
      post: {
        tags: ["Client — Tasks"],
        summary: "Upload query sheet Excel",
        security: bearerAuth,
        parameters: [{ name: "task_id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: { file: { type: "string", format: "binary" } },
              },
            },
          },
        },
        responses: { 200: { description: "Uploaded and task completed" } },
      },
    },
    "/v3/api/v1/tasks/{task_id}/query-sheet/remarks": {
      post: {
        tags: ["Client — Tasks"],
        summary: "Submit query sheet remarks",
        security: bearerAuth,
        parameters: [{ name: "task_id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  remarks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        rowIndex: { type: "integer" },
                        clientRemarks: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Submitted" } },
      },
    },
    "/v3/api/v1/tasks/{task_id}/document-buckets": {
      get: {
        tags: ["Client — Tasks"],
        summary: "Get document upload buckets",
        security: bearerAuth,
        parameters: [{ name: "task_id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Buckets with uploaded files" } },
      },
    },
    "/v3/api/v1/tasks/{task_id}/documents/upload": {
      post: {
        tags: ["Client — Tasks"],
        summary: "Upload task document",
        security: bearerAuth,
        parameters: [{ name: "task_id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file", "category"],
                properties: {
                  file: { type: "string", format: "binary" },
                  category: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Document uploaded" } },
      },
    },
    "/v3/api/v1/tasks/{task_id}/documents/submit": {
      post: {
        tags: ["Client — Tasks"],
        summary: "Submit all task documents",
        security: bearerAuth,
        parameters: [{ name: "task_id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { uploadedDocuments: { type: "object" } },
              },
            },
          },
        },
        responses: { 200: { description: "Task completed" } },
      },
    },
    "/v3/api/v1/documents/upload": {
      post: {
        tags: ["Client — Documents"],
        summary: "Upload document for OCR",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: { type: "string", format: "binary" },
                  category: { type: "string" },
                  filing_id: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Document queued for OCR" } },
      },
    },
    "/v3/api/v1/documents/ocr-status": {
      get: {
        tags: ["Client — Documents"],
        summary: "Batch OCR status",
        security: bearerAuth,
        parameters: [
          { name: "document_ids", in: "query", required: true, schema: { type: "string" }, description: "Comma-separated IDs" },
        ],
        responses: { 200: { description: "Status per document" } },
      },
    },
    "/v3/api/v1/documents/{document_id}/ocr-result": {
      get: {
        tags: ["Client — Documents"],
        summary: "Get OCR result",
        security: bearerAuth,
        parameters: [{ name: "document_id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OCR result" } },
      },
    },
    "/v3/api/v1/payroll/employees": {
      get: {
        tags: ["Client — Payroll"],
        summary: "List employees",
        security: bearerAuth,
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "per_page", in: "query", schema: { type: "integer" } },
        ],
        responses: { 200: { description: "Paginated employees" } },
      },
      post: {
        tags: ["Client — Payroll"],
        summary: "Create employee",
        security: bearerAuth,
        requestBody: { content: { "application/json": { schema: { type: "object" } } } },
        responses: { 201: { description: "Created" } },
      },
    },
    "/v3/api/v1/payroll/employees/{id}": {
      get: {
        tags: ["Client — Payroll"],
        summary: "Get employee",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Employee" } },
      },
      patch: {
        tags: ["Client — Payroll"],
        summary: "Update employee",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Updated" } },
      },
      delete: {
        tags: ["Client — Payroll"],
        summary: "Delete employee",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Deleted" } },
      },
    },
    "/v3/api/v1/payroll/entries": {
      get: {
        tags: ["Client — Payroll"],
        summary: "List payroll entries",
        security: bearerAuth,
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "per_page", in: "query", schema: { type: "integer" } },
        ],
        responses: { 200: { description: "Paginated entries" } },
      },
      post: {
        tags: ["Client — Payroll"],
        summary: "Create payroll entry",
        security: bearerAuth,
        responses: { 201: { description: "Created" } },
      },
    },
    "/v3/api/v1/payroll/entries/{id}": {
      get: {
        tags: ["Client — Payroll"],
        summary: "Get payroll entry",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Entry with employees" } },
      },
      patch: {
        tags: ["Client — Payroll"],
        summary: "Update payroll entry",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Updated" } },
      },
      delete: {
        tags: ["Client — Payroll"],
        summary: "Delete payroll entry",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Deleted" } },
      },
    },
    "/v3/api/v1/payroll/entries/{id}/submit": {
      post: {
        tags: ["Client — Payroll"],
        summary: "Submit payroll entry",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Submitted" } },
      },
    },
    "/v3/api/v1/payroll/automation": {
      get: {
        tags: ["Client — Payroll"],
        summary: "Get automation config",
        security: bearerAuth,
        responses: { 200: { description: "Config or null" } },
      },
      put: {
        tags: ["Client — Payroll"],
        summary: "Save automation config",
        security: bearerAuth,
        responses: { 200: { description: "Saved" } },
      },
    },
    "/v3/api/v1/payroll/automation/disable": {
      post: {
        tags: ["Client — Payroll"],
        summary: "Disable automation",
        security: bearerAuth,
        responses: { 200: { description: "Disabled" } },
      },
    },
    "/v3/api/v1/payroll/automation/run": {
      post: {
        tags: ["Client — Payroll"],
        summary: "Run payroll automation",
        security: bearerAuth,
        responses: { 200: { description: "Entries generated" } },
      },
    },
  },
};
