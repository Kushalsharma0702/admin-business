// OpenAPI 3.0 spec for TaxEase Backend — with full response schemas + examples
const ADMIN_STATUSES = [
  "On Hold", "Not to Do", "Data not received", "Partial Data received",
  "Data Missing Closed", "Work in Progress", "Query sent to Support team",
  "Query sent to client", "Partial Query received", "Review",
  "Sent for Approval to support team", "Sent for Approval to client",
  "Approval received", "Filed",
];

const TASK_TYPES = [
  "CORPORATE_TAX_RETURN", "HST", "BOOKKEEPING", "PAYROLL", "PD7A",
  "WCB", "T4", "T4A", "T5018", "T5",
];

const bearerAuth = [{ bearerAuth: [] }];

// ── Response helpers ──────────────────────────────────────────────────────────

function ref(name) {
  return { $ref: `#/components/schemas/${name}` };
}

function successResponse(dataSchema, description, example) {
  const content = {
    "application/json": {
      schema: {
        type: "object",
        required: ["success", "message", "data"],
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data:    dataSchema,
        },
      },
    },
  };
  if (example) content["application/json"].example = example;
  return { description, content };
}

function pagedResponse(itemSchema, description, example) {
  const content = {
    "application/json": {
      schema: {
        type: "object",
        required: ["success", "message", "data", "pagination"],
        properties: {
          success:    { type: "boolean", example: true },
          message:    { type: "string" },
          data:       { type: "array", items: itemSchema },
          pagination: ref("Pagination"),
        },
      },
    },
  };
  if (example) content["application/json"].example = example;
  return { description, content };
}

function errorResponse(description = "Error") {
  return {
    description,
    content: { "application/json": { schema: ref("ErrorResponse") } },
  };
}

// ── Shared examples ───────────────────────────────────────────────────────────

const loginExample = {
  success: true,
  message: "Login successful",
  data: {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    user: {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      email: "john@johnsbakery.ca",
      name: "John Baker",
      role: "client",
      portalStatus: "active",
      mustChangePassword: false,
    },
  },
};

const clientTaskExample = {
  id: "9ff06fcc-2701-4a0c-a208-53578d66aba8",
  slug: "task-john-onboarding",
  taskType: "CORPORATE_TAX_RETURN",
  taskName: "Corporate Tax Return (T2)",
  clientProgress: "Work in Progress",
  dueDate: "2026-03-30T18:30:00.000Z",
  openDate: "2025-09-30T18:30:00.000Z",
  taxYear: 2025,
  status: "pending",
  description: null,
  createdAt: "2026-06-03T23:18:01.422Z",
  updatedAt: "2026-06-03T23:18:01.439Z",
};

const taskDetailsExample = {
  success: true,
  message: "Task details fetched",
  data: {
    task: clientTaskExample,
    workflow: {
      taskType: "CORPORATE_TAX_RETURN",
      displayName: "Corporate Tax Return (T2)",
      currentClientProgress: "Work in Progress",
      progressMilestones: [
        "Data pending", "Data received", "Work in Progress",
        "Query response pending", "Draft Ready", "Filed",
      ],
    },
    subtasks: [
      { id: "3ae93908-7d26-411a-8f57-fd666aef2b75", order: 0, clientProgress: "Data pending", status: "completed", completedAt: "2026-06-03T23:18:01.437Z" },
      { id: "bc847d65-795d-4986-959b-48cd3c174014", order: 4, clientProgress: "Work in Progress", status: "active", completedAt: null },
    ],
    fields: {
      config: { fiscalYearEnd: "2025-12-31", craInstallmentInT2: true, taxAmount: 5000 },
      formSchema: [],
      documentBuckets: null,
      querySheet: null,
      metadata: { route: null, submissionModes: null, editableField: null, readOnlyFields: null },
    },
    templateVersion: null,
    submission: null,
    actions: ["mark_complete"],
  },
};

module.exports = {
  openapi: "3.0.3",
  info: {
    title: "TaxEase API",
    version: "1.0.0",
    description: [
      "Backend for the TaxEase **admin panel** and **client mobile app**.",
      "",
      "### Response envelope",
      "All successful responses follow:",
      "```json",
      '{ "success": true, "message": "...", "data": { ... } }',
      "```",
      "Paginated lists also include `pagination`: `{ page, per_page, total_items, total_pages }`.",
      "Errors: `{ \"success\": false, \"message\": \"...\", \"errors\": [...] }`",
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
    ].join("\n"),
  },
  servers: [
    { url: "http://localhost:3001", description: "Local dev" },
    { url: "https://apibusiness.diamondaccounts.ca", description: "Production" },
  ],
  tags: [
    { name: "Auth", description: "Login and current user" },
    { name: "Admin", description: "Admin panel (requires admin JWT)" },
    { name: "Client — Tasks", description: "Client mobile app tasks (requires client JWT)" },
    { name: "Client — Forms", description: "Dynamic form fill (requires client JWT)" },
    { name: "Client — Documents", description: "OCR document upload (requires client JWT)" },
    { name: "Client — Payroll", description: "Payroll employees, entries, automation (requires client JWT)" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT from POST /api/auth/login — use `Bearer <token>`",
      },
    },
    schemas: {
      // ── Envelopes ──────────────────────────────────────────────────────────
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Task not found" },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field:   { type: "string" },
                message: { type: "string" },
              },
            },
          },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          page:         { type: "integer", example: 1 },
          per_page:     { type: "integer", example: 20 },
          total_items:  { type: "integer", example: 42 },
          total_pages:  { type: "integer", example: 3 },
        },
      },

      // ── Auth ───────────────────────────────────────────────────────────────
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email:    { type: "string", format: "email", example: "admin@taxease.ca" },
          password: { type: "string", example: "admin123" },
        },
      },
      AuthUser: {
        type: "object",
        properties: {
          id:                 { type: "string", format: "uuid" },
          email:              { type: "string", format: "email" },
          name:               { type: "string" },
          role:               { type: "string", enum: ["admin", "client"] },
          portalStatus:       { type: "string", enum: ["active", "pending", "none"] },
          mustChangePassword: { type: "boolean" },
        },
      },
      LoginData: {
        type: "object",
        properties: {
          token: { type: "string", description: "JWT bearer token" },
          user:  ref("AuthUser"),
        },
      },

      // ── Admin — Clients ────────────────────────────────────────────────────
      Client: {
        type: "object",
        properties: {
          id:           { type: "string", format: "uuid" },
          email:        { type: "string", format: "email" },
          name:         { type: "string" },
          phone:        { type: "string", nullable: true },
          occupation:   { type: "string", nullable: true },
          clientSince:  { type: "string", format: "date", nullable: true },
          portalStatus: { type: "string", enum: ["active", "pending", "none"] },
          createdAt:    { type: "string", format: "date-time" },
        },
      },
      ClientDetail: {
        allOf: [
          ref("Client"),
          {
            type: "object",
            properties: {
              ssn:                { type: "string", nullable: true },
              dob:                { type: "string", format: "date", nullable: true },
              mustChangePassword: { type: "boolean" },
            },
          },
        ],
      },
      CreateClientRequest: {
        type: "object",
        required: ["email", "name"],
        properties: {
          email:      { type: "string" },
          name:       { type: "string" },
          password:   { type: "string", default: "client123" },
          phone:      { type: "string" },
          occupation: { type: "string" },
        },
      },
      CreateClientData: {
        allOf: [
          ref("Client"),
          {
            type: "object",
            properties: {
              inviteSent:       { type: "boolean" },
              inviteExpiresAt:  { type: "string", format: "date-time" },
            },
          },
        ],
      },

      // ── Admin — Tasks ──────────────────────────────────────────────────────
      Task: {
        type: "object",
        properties: {
          id:                { type: "string", format: "uuid" },
          clientId:          { type: "string", format: "uuid" },
          assignedBy:        { type: "string", format: "uuid", nullable: true },
          templateId:        { type: "string", format: "uuid", nullable: true },
          templateVersionId: { type: "string", format: "uuid", nullable: true },
          title:             { type: "string" },
          description:       { type: "string", nullable: true },
          status:            { type: "string", enum: ["pending", "complete"] },
          adminStatus:       { type: "string", enum: ADMIN_STATUSES },
          taskType:          { type: "string", enum: TASK_TYPES, nullable: true },
          currentSubtask:    { type: "string", nullable: true },
          clientProgress:    { type: "string", nullable: true },
          dueDate:           { type: "string", format: "date-time", nullable: true },
          openDate:          { type: "string", format: "date-time", nullable: true },
          taxYear:           { type: "integer", nullable: true },
          config:            { type: "object", additionalProperties: true },
          metadata:          { type: "object", additionalProperties: true },
          completionNote:    { type: "string", nullable: true },
          completedAt:       { type: "string", format: "date-time", nullable: true },
          createdAt:         { type: "string", format: "date-time" },
          updatedAt:         { type: "string", format: "date-time" },
        },
      },
      CreateTaskRequest: {
        type: "object",
        required: ["title"],
        properties: {
          title:       { type: "string", example: "Corporate Tax Return (T2)" },
          description: { type: "string" },
          taskType:    { type: "string", enum: TASK_TYPES, example: "CORPORATE_TAX_RETURN" },
          adminStatus: { type: "string", enum: ADMIN_STATUSES, default: "Data not received" },
          dueDate:     { type: "string", format: "date" },
          openDate:    { type: "string", format: "date" },
          taxYear:     { type: "integer", example: 2025 },
          config:      { type: "object", example: { fiscalYearEnd: "2025-12-31" } },
          metadata:    { type: "object" },
        },
      },
      UpdateTaskRequest: {
        type: "object",
        properties: {
          adminStatus: { type: "string", enum: ADMIN_STATUSES },
          title:       { type: "string" },
          description: { type: "string" },
          status:      { type: "string", enum: ["pending", "complete"] },
          metadata:    { type: "object" },
        },
      },
      DashboardData: {
        type: "object",
        properties: {
          totalClients:   { type: "integer", example: 12 },
          totalTasks:     { type: "integer", example: 45 },
          pendingTasks:   { type: "integer", example: 30 },
          completedTasks: { type: "integer", example: 15 },
          statusBreakdown: {
            type: "array",
            items: {
              type: "object",
              properties: {
                adminStatus: { type: "string" },
                count:       { type: "integer" },
              },
            },
          },
        },
      },
      TaskTypeInfo: {
        type: "object",
        properties: {
          key:          { type: "string", enum: TASK_TYPES },
          displayName:  { type: "string" },
          subtaskCount: { type: "integer" },
          subtasks:     { type: "array", items: { type: "string" } },
          configFields: { type: "array", items: { type: "string" } },
        },
      },
      AdminSubtask: {
        type: "object",
        properties: {
          id:            { type: "string", format: "uuid" },
          subtaskName:   { type: "string" },
          subtaskOrder:  { type: "integer" },
          status:        { type: "string", enum: ["pending", "active", "completed", "skipped"] },
          completedAt:   { type: "string", format: "date-time", nullable: true },
          completedBy:   { type: "string", format: "uuid", nullable: true },
        },
      },
      ActivityLogEntry: {
        type: "object",
        properties: {
          id:              { type: "string", format: "uuid" },
          action:          { type: "string" },
          fromSubtask:     { type: "string", nullable: true },
          toSubtask:       { type: "string", nullable: true },
          fromProgress:    { type: "string", nullable: true },
          toProgress:      { type: "string", nullable: true },
          performedBy:     { type: "string", format: "uuid", nullable: true },
          performedByName: { type: "string", nullable: true },
          notes:           { type: "string", nullable: true },
          createdAt:       { type: "string", format: "date-time" },
        },
      },
      DeletedResource: {
        type: "object",
        properties: {
          id:        { type: "string" },
          deletedAt: { type: "string", format: "date-time" },
        },
      },

      // ── Client — Tasks ─────────────────────────────────────────────────────
      ClientTask: {
        type: "object",
        properties: {
          id:             { type: "string", format: "uuid" },
          slug:           { type: "string", nullable: true, description: "Legacy mobile ID e.g. task-john-onboarding" },
          taskType:       { type: "string", enum: TASK_TYPES, nullable: true },
          taskName:       { type: "string" },
          clientProgress: { type: "string", nullable: true },
          dueDate:        { type: "string", format: "date-time", nullable: true },
          openDate:       { type: "string", format: "date-time", nullable: true },
          taxYear:        { type: "integer", nullable: true },
          status:         { type: "string", enum: ["pending", "complete"] },
          description:    { type: "string", nullable: true },
          createdAt:      { type: "string", format: "date-time" },
          updatedAt:      { type: "string", format: "date-time" },
        },
        example: clientTaskExample,
      },
      ClientSubtask: {
        type: "object",
        description: "Client-safe subtask — internal names are mapped to clientProgress labels",
        properties: {
          id:             { type: "string", format: "uuid" },
          order:          { type: "integer" },
          clientProgress: { type: "string", example: "Work in Progress" },
          status:         { type: "string", enum: ["pending", "active", "completed", "skipped"] },
          completedAt:    { type: "string", format: "date-time", nullable: true },
        },
      },
      DocumentBucket: {
        type: "object",
        properties: {
          label:         { type: "string", example: "Business Bank Statements" },
          category:      { type: "string", example: "business_bank_statements" },
          required:      { type: "boolean" },
          uploadedFiles: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id:         { type: "string", format: "uuid" },
                fileName:   { type: "string" },
                fileSize:   { type: "integer" },
                uploadedAt: { type: "string", format: "date-time" },
              },
            },
          },
        },
      },
      ConfigFieldDef: {
        type: "object",
        description: "Task config field definition (payroll, tax return, etc.)",
        properties: {
          key:      { type: "string", example: "payrollFrequency" },
          label:    { type: "string", example: "Payroll frequency" },
          type:     { type: "string", enum: ["text", "number", "date", "select", "boolean", "textarea", "password"] },
          required: { type: "boolean" },
          options:  { type: "array", items: { type: "string" } },
        },
      },
      TaskWithConfig: {
        allOf: [
          ref("Task"),
          {
            type: "object",
            properties: {
              configSchema: { type: "array", items: ref("ConfigFieldDef") },
            },
          },
        ],
      },
      FormField: {
        type: "object",
        properties: {
          id:       { type: "string" },
          type:     { type: "string", enum: ["text", "number", "date", "select", "checkbox", "textarea", "file"] },
          label:    { type: "string" },
          required: { type: "boolean" },
          options:  { type: "array", items: { type: "string" } },
        },
      },
      TaskSubmission: {
        type: "object",
        properties: {
          id:                { type: "string", format: "uuid" },
          taskId:            { type: "string", format: "uuid" },
          clientId:          { type: "string", format: "uuid" },
          templateVersionId: { type: "string", format: "uuid", nullable: true },
          status:            { type: "string", enum: ["draft", "submitted", "reviewed", "rejected"] },
          formData:          { type: "object", additionalProperties: true },
          attachments:       { type: "array", items: { type: "object" } },
          submittedAt:       { type: "string", format: "date-time", nullable: true },
          reviewedAt:        { type: "string", format: "date-time", nullable: true },
          createdAt:         { type: "string", format: "date-time" },
          updatedAt:         { type: "string", format: "date-time" },
        },
      },
      ClientTaskDetails: {
        type: "object",
        properties: {
          task:     ref("ClientTask"),
          workflow: {
            type: "object",
            nullable: true,
            properties: {
              taskType:              { type: "string", enum: TASK_TYPES },
              displayName:           { type: "string" },
              currentClientProgress: { type: "string", nullable: true },
              progressMilestones:    { type: "array", items: { type: "string" } },
            },
          },
          subtasks: { type: "array", items: ref("ClientSubtask") },
          fields: {
            type: "object",
            properties: {
              config:          { type: "object", nullable: true, additionalProperties: true, description: "Saved values — all keys present with null if unset" },
              configSchema:    { type: "array", items: ref("ConfigFieldDef"), description: "Field definitions for client/admin forms" },
              formSchema:      { type: "array", items: ref("FormField") },
              documentBuckets: { type: "array", items: ref("DocumentBucket"), nullable: true },
              querySheet: {
                type: "object",
                nullable: true,
                properties: {
                  totalRows:   { type: "integer" },
                  downloadUrl: { type: "string", nullable: true },
                },
              },
              metadata: {
                type: "object",
                properties: {
                  route:           { type: "string", nullable: true },
                  submissionModes: { type: "array", items: { type: "string" }, nullable: true },
                  editableField:   { type: "string", nullable: true },
                  readOnlyFields:  { type: "array", items: { type: "string" }, nullable: true },
                },
              },
            },
          },
          templateVersion: { type: "object", nullable: true },
          submission:      { allOf: [ref("TaskSubmission")], nullable: true },
          actions: {
            type: "array",
            items: { type: "string", enum: ["fill_form", "upload_documents", "view_query_sheet", "navigate", "upload_query_sheet", "save_config", "mark_complete"] },
            example: ["save_config", "mark_complete"],
          },
        },
        example: taskDetailsExample.data,
      },
      QuerySheetRow: {
        type: "object",
        properties: {
          rowIndex:      { type: "integer" },
          date:          { type: "string", nullable: true },
          details:       { type: "string", nullable: true },
          payment:       { type: "number", nullable: true },
          receipt:       { type: "number", nullable: true },
          hst:           { type: "number", nullable: true },
          ourRemarks:    { type: "string", nullable: true },
          clientRemarks: { type: "string" },
        },
      },
      QuerySheetData: {
        type: "object",
        properties: {
          taskId:      { type: "string", format: "uuid" },
          totalRows:   { type: "integer" },
          downloadUrl: { type: "string", nullable: true },
          rows:        { type: "array", items: ref("QuerySheetRow") },
        },
      },
      TaskCompleteData: {
        type: "object",
        properties: {
          id:        { type: "string", format: "uuid" },
          title:     { type: "string" },
          status:    { type: "string", enum: ["complete"] },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      UploadedDocument: {
        type: "object",
        properties: {
          id:         { type: "string", format: "uuid" },
          taskId:     { type: "string", format: "uuid" },
          category:   { type: "string" },
          fileName:   { type: "string" },
          fileType:   { type: "string" },
          fileSize:   { type: "integer" },
          status:     { type: "string", example: "uploaded" },
          uploadedAt: { type: "string", format: "date-time" },
        },
      },

      // ── Client — Forms ─────────────────────────────────────────────────────
      TaskFormData: {
        type: "object",
        properties: {
          taskId:          { type: "string", format: "uuid" },
          title:           { type: "string" },
          description:     { type: "string", nullable: true },
          status:          { type: "string", enum: ["pending", "complete"] },
          formSchema:      { type: "array", items: ref("FormField") },
          templateVersion: { type: "object", nullable: true },
          submission:      { allOf: [ref("TaskSubmission")], nullable: true },
        },
      },
      FormSubmitData: {
        type: "object",
        properties: {
          submissionId: { type: "string", format: "uuid" },
          status:       { type: "string", example: "submitted" },
          submittedAt:  { type: "string", format: "date-time" },
        },
      },

      // ── Client — Documents (OCR) ───────────────────────────────────────────
      OcrDocument: {
        type: "object",
        properties: {
          id:                { type: "string", format: "uuid" },
          filing_id:         { type: "string", nullable: true },
          name:              { type: "string" },
          original_filename: { type: "string" },
          file_type:         { type: "string" },
          file_size:         { type: "integer" },
          document_type:     { type: "string" },
          status:            { type: "string", example: "uploaded" },
          ocr_status:        { type: "string", enum: ["pending", "processing", "completed", "failed"] },
          uploaded_at:       { type: "string", format: "date-time" },
          created_at:        { type: "string", format: "date-time" },
        },
      },
      OcrStatusItem: {
        type: "object",
        properties: {
          documentId:  { type: "string", format: "uuid" },
          ocrStatus:   { type: "string", enum: ["pending", "processing", "completed", "failed"] },
          processedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      OcrResult: {
        type: "object",
        properties: {
          documentId:      { type: "string", format: "uuid" },
          ocrStatus:       { type: "string", example: "completed" },
          extractedText:   { type: "string" },
          extractedFields: { type: "object", additionalProperties: true },
          confidence:      { type: "number", nullable: true },
          processedAt:     { type: "string", format: "date-time" },
        },
      },

      // ── Client — Payroll ───────────────────────────────────────────────────
      PayrollEmployee: {
        type: "object",
        properties: {
          id:                  { type: "string", format: "uuid" },
          name:                { type: "string" },
          email:               { type: "string", nullable: true },
          firstName:           { type: "string", nullable: true },
          lastName:            { type: "string", nullable: true },
          phone:               { type: "string", nullable: true },
          sin:                 { type: "string", nullable: true },
          position:            { type: "string", nullable: true },
          department:          { type: "string", nullable: true },
          hourlyRate:          { type: "number", nullable: true },
          salary:              { type: "number", nullable: true },
          federalTaxCredit:    { type: "number", nullable: true },
          provincialTaxCredit: { type: "number", nullable: true },
          createdAt:           { type: "string", format: "date-time" },
          updatedAt:           { type: "string", format: "date-time" },
        },
      },
      PayrollEntry: {
        type: "object",
        properties: {
          id:              { type: "string", format: "uuid" },
          periodLabel:     { type: "string" },
          periodStart:     { type: "string", format: "date" },
          periodEnd:       { type: "string", format: "date" },
          status:          { type: "string", enum: ["draft", "submitted", "processed"] },
          employeeIds:     { type: "array", items: { type: "string", format: "uuid" } },
          totalAmount:     { type: "number", nullable: true },
          notes:           { type: "string" },
          documentPaths:   { type: "array", items: { type: "string" } },
          isAutoGenerated: { type: "boolean" },
          createdAt:       { type: "string", format: "date-time" },
          updatedAt:       { type: "string", format: "date-time" },
          submittedAt:     { type: "string", format: "date-time", nullable: true },
        },
      },
      PayrollEntryDetail: {
        allOf: [
          ref("PayrollEntry"),
          {
            type: "object",
            properties: {
              employees: { type: "array", items: ref("PayrollEmployee") },
            },
          },
        ],
      },
      PayrollAutomation: {
        type: "object",
        nullable: true,
        properties: {
          startDate:         { type: "string", format: "date" },
          frequency:         { type: "string", enum: ["weekly", "biweekly", "monthly"] },
          isActive:          { type: "boolean" },
          lastGeneratedDate: { type: "string", format: "date-time", nullable: true },
        },
      },
      PayrollAutomationRun: {
        type: "object",
        properties: {
          entriesGenerated:   { type: "integer" },
          generatedEntries:   { type: "array", items: ref("PayrollEntry") },
          lastGeneratedDate:  { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    // ═══════════════════════════════════════════════════════════════════════════
    // AUTH
    // ═══════════════════════════════════════════════════════════════════════════
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        requestBody: {
          required: true,
          content: { "application/json": { schema: ref("LoginRequest") } },
        },
        responses: {
          200: successResponse(ref("LoginData"), "Login successful — copy data.token for Authorize", loginExample),
          401: errorResponse("Invalid credentials"),
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user",
        security: bearerAuth,
        responses: {
          200: successResponse(ref("AuthUser"), "Current user profile"),
          401: errorResponse("Unauthorized"),
        },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    "/api/admin/meta/admin-statuses": {
      get: {
        tags: ["Admin"],
        summary: "List admin task statuses",
        security: bearerAuth,
        responses: {
          200: successResponse(
            { type: "array", items: { type: "string", enum: ADMIN_STATUSES } },
            "Array of 14 admin status strings",
            { success: true, message: "Admin statuses fetched", data: ADMIN_STATUSES },
          ),
        },
      },
    },
    "/api/admin/meta/task-types": {
      get: {
        tags: ["Admin"],
        summary: "List workflow task types with subtasks",
        security: bearerAuth,
        responses: {
          200: successResponse(
            { type: "array", items: ref("TaskTypeInfo") },
            "All 10 task type definitions with subtasks and configFields",
          ),
        },
      },
    },
    "/api/admin/dashboard": {
      get: {
        tags: ["Admin"],
        summary: "Dashboard overview",
        security: bearerAuth,
        responses: {
          200: successResponse(ref("DashboardData"), "Client/task counts and status breakdown"),
        },
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
        responses: {
          200: pagedResponse(ref("Client"), "Paginated client list"),
        },
      },
      post: {
        tags: ["Admin"],
        summary: "Create client",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: { "application/json": { schema: ref("CreateClientRequest") } },
        },
        responses: {
          201: successResponse(ref("CreateClientData"), "Client created + invite email sent"),
          400: errorResponse("Validation error"),
        },
      },
    },
    "/api/admin/clients/{clientId}": {
      get: {
        tags: ["Admin"],
        summary: "Get client",
        security: bearerAuth,
        parameters: [{ name: "clientId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: successResponse(ref("ClientDetail"), "Full client profile"),
          404: errorResponse("Client not found"),
        },
      },
      patch: {
        tags: ["Admin"],
        summary: "Update client",
        security: bearerAuth,
        parameters: [{ name: "clientId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { type: "object" } } } },
        responses: {
          200: successResponse(
            { type: "object", properties: { id: { type: "string" }, updatedAt: { type: "string", format: "date-time" } } },
            "Client updated",
          ),
        },
      },
      delete: {
        tags: ["Admin"],
        summary: "Delete client",
        security: bearerAuth,
        parameters: [{ name: "clientId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: successResponse(ref("DeletedResource"), "Client deleted"),
        },
      },
    },
    "/api/admin/clients/{clientId}/tasks": {
      get: {
        tags: ["Admin"],
        summary: "List tasks for a client",
        security: bearerAuth,
        parameters: [{ name: "clientId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: successResponse({ type: "array", items: ref("Task") }, "All tasks for client"),
        },
      },
      post: {
        tags: ["Admin"],
        summary: "Assign task to client",
        security: bearerAuth,
        parameters: [{ name: "clientId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: ref("CreateTaskRequest") } },
        },
        responses: {
          201: successResponse(ref("TaskWithConfig"), "Task created — includes configSchema for payroll/tax fields"),
        },
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
        responses: {
          200: pagedResponse(ref("Task"), "Paginated tasks with filters"),
        },
      },
    },
    "/api/admin/tasks/{taskId}": {
      patch: {
        tags: ["Admin"],
        summary: "Update task (admin status, title, etc.)",
        security: bearerAuth,
        parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: { "application/json": { schema: ref("UpdateTaskRequest") } },
        },
        responses: {
          200: successResponse(ref("Task"), "Updated task"),
        },
      },
      delete: {
        tags: ["Admin"],
        summary: "Delete task",
        security: bearerAuth,
        parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: successResponse(ref("DeletedResource"), "Task deleted"),
        },
      },
    },
    "/api/admin/tasks/{taskId}/subtasks": {
      get: {
        tags: ["Admin"],
        summary: "List all subtasks (admin view — includes internal names)",
        security: bearerAuth,
        parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: successResponse({
            type: "object",
            properties: {
              taskId:   { type: "string", format: "uuid" },
              taskType: { type: "string", enum: TASK_TYPES, nullable: true },
              workflow: { type: "string", nullable: true },
              subtasks: { type: "array", items: ref("AdminSubtask") },
            },
          }, "Internal subtask list with status"),
        },
      },
    },
    "/api/admin/tasks/{taskId}/subtask": {
      patch: {
        tags: ["Admin"],
        summary: "Advance task to a specific subtask",
        security: bearerAuth,
        parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["subtaskName"],
                properties: { subtaskName: { type: "string", example: "Query sent to client" } },
              },
            },
          },
        },
        responses: {
          200: successResponse({
            type: "object",
            properties: {
              task:           ref("Task"),
              clientProgress: { type: "string" },
              currentSubtask: { type: "string" },
            },
          }, "Subtask advanced, clientProgress recalculated"),
        },
      },
    },
    "/api/admin/tasks/{taskId}/activity": {
      get: {
        tags: ["Admin"],
        summary: "Task activity log",
        security: bearerAuth,
        parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: successResponse({ type: "array", items: ref("ActivityLogEntry") }, "Chronological activity log"),
        },
      },
    },
    "/api/admin/tasks/{taskId}/query-sheet": {
      post: {
        tags: ["Admin"],
        summary: "Set query sheet rows for a task",
        security: bearerAuth,
        parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["rows"],
                properties: {
                  rows:        { type: "array", items: ref("QuerySheetRow") },
                  downloadUrl: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: successResponse({
            type: "object",
            properties: {
              taskId:      { type: "string", format: "uuid" },
              rowsUploaded: { type: "integer" },
            },
          }, "Query sheet rows saved"),
        },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // CLIENT — TASKS
    // ═══════════════════════════════════════════════════════════════════════════
    "/v3/api/v1/tasks": {
      get: {
        tags: ["Client — Tasks"],
        summary: "List client tasks",
        security: bearerAuth,
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["all", "pending", "complete"], default: "all" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "per_page", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          200: pagedResponse(ref("ClientTask"), "Paginated client tasks (simplified view)"),
        },
      },
    },
    "/v3/api/v1/tasks/{task_id}/details": {
      get: {
        tags: ["Client — Tasks"],
        summary: "Get full task details (subtasks + fields + form + documents)",
        description: "Unified endpoint for mobile app. Subtasks show client-safe progress labels only — internal names are hidden.",
        security: bearerAuth,
        parameters: [{ name: "task_id", in: "path", required: true, schema: { type: "string", description: "UUID or legacy slug (e.g. task-john-onboarding)" } }],
        responses: {
          200: successResponse(ref("ClientTaskDetails"), "Full task payload", taskDetailsExample),
          404: errorResponse("Task not found"),
        },
      },
    },
    "/v3/api/v1/tasks/{task_id}/config": {
      patch: {
        tags: ["Client — Tasks"],
        summary: "Save task config fields (payroll info, etc.)",
        security: bearerAuth,
        parameters: [{ name: "task_id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["config"],
                properties: {
                  config: {
                    type: "object",
                    additionalProperties: true,
                    example: {
                      nextPayDate: "2026-06-15",
                      payrollFrequency: "Bi-Weekly",
                      payPeriodEnds: "Sunday",
                      wcbNumber: "123456",
                      notes: "Please submit hours by Friday",
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: successResponse({
            type: "object",
            properties: {
              taskId:       { type: "string", format: "uuid" },
              config:       { type: "object", additionalProperties: true },
              configSchema: { type: "array", items: ref("ConfigFieldDef") },
              updatedAt:    { type: "string", format: "date-time" },
            },
          }, "Config saved"),
          409: errorResponse("Task already completed"),
        },
      },
    },
    "/v3/api/v1/tasks/{task_id}": {
      get: {
        tags: ["Client — Tasks"],
        summary: "Get task (simplified)",
        security: bearerAuth,
        parameters: [{ name: "task_id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: successResponse(ref("ClientTask"), "Basic task info without subtasks"),
          404: errorResponse("Task not found"),
        },
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
        responses: {
          200: successResponse(ref("TaskCompleteData"), "Task marked complete"),
          409: errorResponse("Task already completed"),
        },
      },
    },
    "/v3/api/v1/tasks/{task_id}/query-sheet": {
      get: {
        tags: ["Client — Tasks"],
        summary: "Get query sheet rows",
        security: bearerAuth,
        parameters: [{ name: "task_id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: successResponse(ref("QuerySheetData"), "Query sheet with all rows"),
        },
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
        responses: {
          200: successResponse({
            type: "object",
            properties: {
              taskId:           { type: "string", format: "uuid" },
              status:           { type: "string", enum: ["complete"] },
              uploadedFileName: { type: "string" },
              uploadedAt:       { type: "string", format: "date-time" },
            },
          }, "Excel uploaded, task completed"),
        },
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
                required: ["remarks"],
                properties: {
                  remarks: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["rowIndex", "clientRemarks"],
                      properties: {
                        rowIndex:      { type: "integer" },
                        clientRemarks: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: successResponse({
            type: "object",
            properties: {
              taskId:                { type: "string", format: "uuid" },
              status:                { type: "string", enum: ["complete"] },
              totalRemarksSubmitted: { type: "integer" },
              submittedAt:           { type: "string", format: "date-time" },
            },
          }, "Remarks saved, task completed"),
        },
      },
    },
    "/v3/api/v1/tasks/{task_id}/document-buckets": {
      get: {
        tags: ["Client — Tasks"],
        summary: "Get document upload buckets",
        security: bearerAuth,
        parameters: [{ name: "task_id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: successResponse({
            type: "object",
            properties: {
              taskId:  { type: "string", format: "uuid" },
              buckets: { type: "array", items: ref("DocumentBucket") },
            },
          }, "Document categories with uploaded files per bucket"),
        },
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
                  file:     { type: "string", format: "binary" },
                  category: { type: "string", example: "business_bank_statements" },
                },
              },
            },
          },
        },
        responses: {
          201: successResponse(ref("UploadedDocument"), "Document uploaded to bucket"),
        },
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
                properties: {
                  uploadedDocuments: {
                    type: "object",
                    additionalProperties: { type: "array", items: { type: "string", format: "uuid" } },
                    example: { business_bank_statements: ["doc-uuid-1"], business_credit_card: ["doc-uuid-2"] },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: successResponse({
            type: "object",
            properties: {
              taskId:         { type: "string", format: "uuid" },
              status:         { type: "string", enum: ["complete"] },
              totalDocuments: { type: "integer" },
              submittedAt:    { type: "string", format: "date-time" },
            },
          }, "All documents submitted, task completed"),
        },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // CLIENT — FORMS
    // ═══════════════════════════════════════════════════════════════════════════
    "/v3/api/v1/tasks/{taskId}/form": {
      get: {
        tags: ["Client — Forms"],
        summary: "Get form schema + existing draft",
        security: bearerAuth,
        parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: successResponse(ref("TaskFormData"), "Form schema, template version, and draft/submission"),
          404: errorResponse("Task not found"),
        },
      },
    },
    "/v3/api/v1/tasks/{taskId}/form/draft": {
      put: {
        tags: ["Client — Forms"],
        summary: "Save form draft",
        security: bearerAuth,
        parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  formData:    { type: "object", additionalProperties: true },
                  attachments: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
        responses: {
          200: successResponse(ref("TaskSubmission"), "Draft saved"),
        },
      },
    },
    "/v3/api/v1/tasks/{taskId}/form/submit": {
      post: {
        tags: ["Client — Forms"],
        summary: "Submit completed form",
        security: bearerAuth,
        parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  formData:    { type: "object", additionalProperties: true },
                  attachments: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
        responses: {
          200: successResponse(ref("FormSubmitData"), "Form submitted"),
        },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // CLIENT — DOCUMENTS (OCR)
    // ═══════════════════════════════════════════════════════════════════════════
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
                  file:      { type: "string", format: "binary" },
                  category:  { type: "string" },
                  filing_id: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: successResponse(ref("OcrDocument"), "Document queued for OCR processing"),
        },
      },
    },
    "/v3/api/v1/documents/ocr-status": {
      get: {
        tags: ["Client — Documents"],
        summary: "Batch OCR status",
        security: bearerAuth,
        parameters: [
          { name: "document_ids", in: "query", required: true, schema: { type: "string" }, description: "Comma-separated UUIDs" },
        ],
        responses: {
          200: successResponse({ type: "array", items: ref("OcrStatusItem") }, "OCR status per document"),
        },
      },
    },
    "/v3/api/v1/documents/{document_id}/ocr-result": {
      get: {
        tags: ["Client — Documents"],
        summary: "Get OCR result",
        security: bearerAuth,
        parameters: [{ name: "document_id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: successResponse(ref("OcrResult"), "Extracted text and fields"),
          400: errorResponse("OCR not yet completed"),
        },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // CLIENT — PAYROLL
    // ═══════════════════════════════════════════════════════════════════════════
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
        responses: {
          200: pagedResponse(ref("PayrollEmployee"), "Paginated employees"),
        },
      },
      post: {
        tags: ["Client — Payroll"],
        summary: "Create employee",
        security: bearerAuth,
        requestBody: { content: { "application/json": { schema: ref("PayrollEmployee") } } },
        responses: {
          201: successResponse(ref("PayrollEmployee"), "Employee created"),
        },
      },
    },
    "/v3/api/v1/payroll/employees/{id}": {
      get: {
        tags: ["Client — Payroll"],
        summary: "Get employee",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: successResponse(ref("PayrollEmployee"), "Employee details"),
          404: errorResponse("Employee not found"),
        },
      },
      patch: {
        tags: ["Client — Payroll"],
        summary: "Update employee",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: successResponse(ref("PayrollEmployee"), "Employee updated"),
        },
      },
      delete: {
        tags: ["Client — Payroll"],
        summary: "Delete employee",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: successResponse(ref("DeletedResource"), "Employee deleted"),
        },
      },
    },
    "/v3/api/v1/payroll/entries": {
      get: {
        tags: ["Client — Payroll"],
        summary: "List payroll entries",
        security: bearerAuth,
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["draft", "submitted", "processed"] } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "per_page", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          200: pagedResponse(ref("PayrollEntry"), "Paginated payroll entries"),
        },
      },
      post: {
        tags: ["Client — Payroll"],
        summary: "Create payroll entry",
        security: bearerAuth,
        responses: {
          201: successResponse(ref("PayrollEntry"), "Payroll entry created"),
        },
      },
    },
    "/v3/api/v1/payroll/entries/{id}": {
      get: {
        tags: ["Client — Payroll"],
        summary: "Get payroll entry with employees",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: successResponse(ref("PayrollEntryDetail"), "Entry with linked employees"),
        },
      },
      patch: {
        tags: ["Client — Payroll"],
        summary: "Update payroll entry",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: successResponse(ref("PayrollEntry"), "Entry updated"),
        },
      },
      delete: {
        tags: ["Client — Payroll"],
        summary: "Delete payroll entry",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: successResponse(ref("DeletedResource"), "Entry deleted"),
        },
      },
    },
    "/v3/api/v1/payroll/entries/{id}/submit": {
      post: {
        tags: ["Client — Payroll"],
        summary: "Submit payroll entry",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: successResponse(ref("PayrollEntry"), "Entry submitted"),
        },
      },
    },
    "/v3/api/v1/payroll/automation": {
      get: {
        tags: ["Client — Payroll"],
        summary: "Get automation config",
        security: bearerAuth,
        responses: {
          200: successResponse(ref("PayrollAutomation"), "Config object or null if not configured"),
        },
      },
      put: {
        tags: ["Client — Payroll"],
        summary: "Save automation config",
        security: bearerAuth,
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  startDate: { type: "string", format: "date" },
                  frequency: { type: "string", enum: ["weekly", "biweekly", "monthly"] },
                  isActive:  { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: successResponse(ref("PayrollAutomation"), "Automation config saved"),
        },
      },
    },
    "/v3/api/v1/payroll/automation/disable": {
      post: {
        tags: ["Client — Payroll"],
        summary: "Disable automation",
        security: bearerAuth,
        responses: {
          200: successResponse(ref("PayrollAutomation"), "Automation disabled"),
        },
      },
    },
    "/v3/api/v1/payroll/automation/run": {
      post: {
        tags: ["Client — Payroll"],
        summary: "Run payroll automation",
        security: bearerAuth,
        responses: {
          200: successResponse(ref("PayrollAutomationRun"), "Payroll entries generated"),
        },
      },
    },
  },
};
