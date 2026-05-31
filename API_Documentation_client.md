# API Documentation — Tasks, OCR & Payroll

> **Version**: 1.0  
> **Base URL**: `https://api.diamondaccounts.ca/v3/api/v1`  
> **Auth**: All endpoints require `Authorization: Bearer <access_token>` unless noted otherwise.  
> **Content-Type**: `application/json` unless noted otherwise (file uploads use `multipart/form-data`).  
> **Date format**: ISO 8601 (`2026-05-28T14:30:00.000Z`)

---

## Table of Contents

1. [Standard Response Envelope](#1-standard-response-envelope)
2. [Error Response Format](#2-error-response-format)
3. [Tasks APIs](#3-tasks-apis)
   - 3.1 List Tasks
   - 3.2 Get Task by ID
   - 3.3 Complete Task
   - 3.4 Get Query Sheet Data
   - 3.5 Submit Query Sheet Remarks (Excel Upload)
   - 3.6 Submit Query Sheet Remarks (UI Entry)
   - 3.7 Get Document Upload Buckets
   - 3.8 Upload Task Document
   - 3.9 Submit Task Documents
4. [OCR / Document Scan APIs](#4-ocr--document-scan-apis)
   - 4.1 Upload OCR Document(s)
   - 4.2 Get OCR Processing Status
   - 4.3 Get OCR Results
5. [Payroll APIs — Employees](#5-payroll-apis--employees)
   - 5.1 List Employees
   - 5.2 Get Employee by ID
   - 5.3 Create Employee
   - 5.4 Update Employee
   - 5.5 Delete Employee
6. [Payroll APIs — Entries](#6-payroll-apis--entries)
   - 6.1 List Payroll Entries
   - 6.2 Get Payroll Entry by ID
   - 6.3 Create Payroll Entry
   - 6.4 Update Payroll Entry
   - 6.5 Submit Payroll Entry
   - 6.6 Delete Payroll Entry
   - 6.7 Upload Payroll Document
7. [Payroll APIs — Automation Config](#7-payroll-apis--automation-config)
   - 7.1 Get Automation Config
   - 7.2 Set / Update Automation Config
   - 7.3 Disable Automation
   - 7.4 Run Automation (Generate Entries)
8. [Data Flow Diagrams](#8-data-flow-diagrams)
9. [Database Schema Suggestions](#9-database-schema-suggestions)

---

## 1. Standard Response Envelope

All successful responses should follow this wrapper:

```json
{
  "success": true,
  "message": "Human-readable status message",
  "data": { /* endpoint-specific payload */ }
}
```

For **list** endpoints:

```json
{
  "success": true,
  "message": "Fetched successfully",
  "data": [ /* array of items */ ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_items": 42,
    "total_pages": 3
  }
}
```

---

## 2. Error Response Format

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

**HTTP Status Codes Used**:
| Code | Meaning |
|------|---------|
| 200  | OK |
| 201  | Created |
| 204  | No Content (delete success) |
| 400  | Bad Request / Validation Error |
| 401  | Unauthorized (missing/expired token) |
| 403  | Forbidden (no permission) |
| 404  | Not Found |
| 409  | Conflict (duplicate, already submitted) |
| 500  | Internal Server Error |

---

## 3. Tasks APIs

Tasks are admin-assigned action items for a client. Each task has a `taskType` that determines what subpage/form the client should complete. The admin creates tasks from the admin panel; the client app fetches and completes them.

### 3.1 List Tasks

Fetches all tasks assigned to the authenticated user.

```
GET /tasks
```

**Headers**:
```
Authorization: Bearer <access_token>
```

**Query Parameters** (optional):
| Param    | Type   | Description |
|----------|--------|-------------|
| `status` | string | Filter by status: `pending`, `complete`, `all` (default: `all`) |
| `page`   | int    | Page number (default: 1) |
| `per_page` | int  | Items per page (default: 20) |

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Tasks fetched successfully",
  "data": [
    {
      "id": "task-onboarding",
      "title": "T2 Business Onboarding Form",
      "description": "Complete the business onboarding form so we can prepare your T2 filing.",
      "status": "pending",
      "taskType": "onboarding_form",
      "metadata": {
        "route": "/tax-forms/business"
      },
      "createdAt": "2026-05-26T10:00:00.000Z",
      "updatedAt": "2026-05-28T18:00:00.000Z"
    },
    {
      "id": "task-query-sheet-remarks",
      "title": "Query Sheet Remarks",
      "description": "Review the Excel sheet and add client remarks...",
      "status": "pending",
      "taskType": "sheet_remarks",
      "metadata": {
        "submissionModes": ["excel_upload", "ui_entry"],
        "editableField": "clientRemarks",
        "readOnlyFields": ["date", "details", "payment", "receipt", "hst", "ourRemarks"]
      },
      "createdAt": "2026-05-26T10:00:00.000Z",
      "updatedAt": "2026-05-28T18:00:00.000Z"
    },
    {
      "id": "task-basic-documents-upload",
      "title": "Basic Documents Upload",
      "description": "Upload all basic business documents requested...",
      "status": "pending",
      "taskType": "basic_docs_upload",
      "metadata": {
        "documentBuckets": [
          "Business Bank Statements",
          "Business credit card statements",
          "Loan Statements",
          "Line of credit statement",
          "Purchase/Expense Details",
          "Doordash sales report",
          "uber sales reports",
          "Skip sales reports",
          "Store sales reports",
          "Sales invoices",
          "Sales excel sheet",
          "Others"
        ]
      },
      "createdAt": "2026-05-26T10:00:00.000Z",
      "updatedAt": "2026-05-28T18:00:00.000Z"
    },
    {
      "id": "task-payroll-setup",
      "title": "Set Up Payroll",
      "description": "Add your employees and configure payroll frequency...",
      "status": "pending",
      "taskType": "payroll",
      "metadata": {
        "route": "/payroll"
      },
      "createdAt": "2026-05-26T10:00:00.000Z",
      "updatedAt": "2026-05-28T18:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_items": 4,
    "total_pages": 1
  }
}
```

**Task Type Reference**:
| `taskType` | Subpage Opened | Description |
|------------|----------------|-------------|
| `onboarding_form` | T2 Business Onboarding Form | Multi-step onboarding |
| `sheet_remarks` | Query Sheet Remarks page | Excel review + client remarks |
| `basic_docs_upload` | Documents Upload page | Upload files per bucket/category |
| `info` | Task Details (mark-complete) | Read-only info review |
| `payroll` | Payroll page | Full payroll setup |

---

### 3.2 Get Task by ID

```
GET /tasks/{task_id}
```

**Path Parameters**:
| Param     | Type   | Description |
|-----------|--------|-------------|
| `task_id` | string | Unique task identifier |

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Task fetched",
  "data": {
    "id": "task-query-sheet-remarks",
    "title": "Query Sheet Remarks",
    "description": "Review the Excel sheet and add client remarks either by reuploading the updated file or by entering remarks one transaction at a time in the UI.",
    "status": "pending",
    "taskType": "sheet_remarks",
    "metadata": {
      "submissionModes": ["excel_upload", "ui_entry"],
      "editableField": "clientRemarks",
      "readOnlyFields": ["date", "details", "payment", "receipt", "hst", "ourRemarks"]
    },
    "createdAt": "2026-05-26T10:00:00.000Z",
    "updatedAt": "2026-05-28T18:00:00.000Z"
  }
}
```

**Response** `404 Not Found`:
```json
{
  "success": false,
  "message": "Task not found"
}
```

---

### 3.3 Complete Task

Marks a task as completed by the client.

```
POST /tasks/{task_id}/complete
```

**Path Parameters**:
| Param     | Type   | Description |
|-----------|--------|-------------|
| `task_id` | string | Unique task identifier |

**Request Body** (optional context data):
```json
{
  "completionNote": "Uploaded all documents and added remarks."
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Task marked as completed",
  "data": {
    "id": "task-query-sheet-remarks",
    "title": "Query Sheet Remarks",
    "status": "complete",
    "updatedAt": "2026-05-29T02:50:00.000Z"
  }
}
```

**Response** `409 Conflict` (already completed):
```json
{
  "success": false,
  "message": "Task is already completed"
}
```

---

### 3.4 Get Query Sheet Data

Fetches the transaction rows for the Query Sheet Remarks task. The admin uploads an Excel sheet on the admin panel; this API returns the parsed rows.

```
GET /tasks/{task_id}/query-sheet
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Query sheet data fetched",
  "data": {
    "taskId": "task-query-sheet-remarks",
    "totalRows": 3,
    "downloadUrl": "https://storage.example.com/query_sheet_original.xlsx",
    "rows": [
      {
        "rowIndex": 0,
        "date": "2026-04-01",
        "details": "Office supplies for March",
        "payment": "Debit",
        "receipt": "R-1001",
        "hst": "13.00",
        "ourRemarks": "Needs client confirmation",
        "clientRemarks": ""
      },
      {
        "rowIndex": 1,
        "date": "2026-04-03",
        "details": "Client lunch meeting",
        "payment": "Credit",
        "receipt": "R-1002",
        "hst": "4.50",
        "ourRemarks": "Check if business related",
        "clientRemarks": ""
      },
      {
        "rowIndex": 2,
        "date": "2026-04-05",
        "details": "Online software subscription",
        "payment": "Debit",
        "receipt": "R-1003",
        "hst": "9.75",
        "ourRemarks": "Recurring vendor charge",
        "clientRemarks": ""
      }
    ]
  }
}
```

**Row Object Schema**:
| Field | Type | Editable by Client | Description |
|-------|------|-------------------|-------------|
| `rowIndex` | int | No | Zero-based row index |
| `date` | string | No | Transaction date |
| `details` | string | No | Transaction description |
| `payment` | string | No | Payment method (Debit/Credit) |
| `receipt` | string | No | Receipt reference number |
| `hst` | string | No | HST amount |
| `ourRemarks` | string | No | Admin/accountant remarks |
| `clientRemarks` | string | **Yes** | Client's response or note |

---

### 3.5 Submit Query Sheet Remarks (Excel Upload)

Client downloads the original sheet, fills in Client Remarks column, and re-uploads the completed file.

```
POST /tasks/{task_id}/query-sheet/upload
Content-Type: multipart/form-data
```

**Form Fields**:
| Field  | Type | Required | Description |
|--------|------|----------|-------------|
| `file` | file | Yes | Updated Excel file (.xlsx, .xls) |

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Query sheet uploaded and task completed",
  "data": {
    "taskId": "task-query-sheet-remarks",
    "status": "complete",
    "uploadedFileName": "query_sheet_remarks_updated.xlsx",
    "uploadedAt": "2026-05-29T02:50:00.000Z"
  }
}
```

---

### 3.6 Submit Query Sheet Remarks (UI Entry)

Client enters remarks row-by-row in the app and submits all at once.

```
POST /tasks/{task_id}/query-sheet/remarks
```

**Request Body**:
```json
{
  "remarks": [
    {
      "rowIndex": 0,
      "clientRemarks": "Yes, this was for office use"
    },
    {
      "rowIndex": 1,
      "clientRemarks": "Business lunch with client John"
    },
    {
      "rowIndex": 2,
      "clientRemarks": "Monthly Adobe subscription"
    }
  ]
}
```

**Validation**: All rows must have non-empty `clientRemarks`.

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Remarks submitted and task completed",
  "data": {
    "taskId": "task-query-sheet-remarks",
    "status": "complete",
    "totalRemarksSubmitted": 3,
    "submittedAt": "2026-05-29T02:50:00.000Z"
  }
}
```

**Response** `400 Bad Request` (incomplete):
```json
{
  "success": false,
  "message": "All rows must have client remarks",
  "errors": [
    {
      "field": "remarks[1].clientRemarks",
      "message": "Client remarks cannot be empty"
    }
  ]
}
```

---

### 3.7 Get Document Upload Buckets

Fetches the document categories/buckets that the client needs to upload files for (specific to a `basic_docs_upload` task).

```
GET /tasks/{task_id}/document-buckets
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Document buckets fetched",
  "data": {
    "taskId": "task-basic-documents-upload",
    "buckets": [
      {
        "label": "Business Bank Statements",
        "category": "business_bank_statements",
        "required": true,
        "uploadedFiles": [
          {
            "id": "doc-001",
            "fileName": "jan_2026_bank.pdf",
            "fileSize": 245000,
            "uploadedAt": "2026-05-27T10:00:00.000Z"
          }
        ]
      },
      {
        "label": "Business credit card statements",
        "category": "business_credit_card",
        "required": true,
        "uploadedFiles": []
      },
      {
        "label": "Loan Statements",
        "category": "loan_statements",
        "required": false,
        "uploadedFiles": []
      },
      {
        "label": "Line of credit statement",
        "category": "loc_statement",
        "required": false,
        "uploadedFiles": []
      },
      {
        "label": "Purchase/Expense Details",
        "category": "purchase_expense",
        "required": false,
        "uploadedFiles": []
      },
      {
        "label": "Doordash sales report",
        "category": "doordash_sales",
        "required": false,
        "uploadedFiles": []
      },
      {
        "label": "uber sales reports",
        "category": "uber_sales",
        "required": false,
        "uploadedFiles": []
      },
      {
        "label": "Skip sales reports",
        "category": "skip_sales",
        "required": false,
        "uploadedFiles": []
      },
      {
        "label": "Store sales reports",
        "category": "store_sales",
        "required": false,
        "uploadedFiles": []
      },
      {
        "label": "Sales invoices",
        "category": "sales_invoices",
        "required": false,
        "uploadedFiles": []
      },
      {
        "label": "Sales excel sheet",
        "category": "sales_excel",
        "required": false,
        "uploadedFiles": []
      },
      {
        "label": "Others",
        "category": "others",
        "required": false,
        "uploadedFiles": []
      }
    ]
  }
}
```

---

### 3.8 Upload Task Document

Uploads a file to a specific bucket/category within a task.

```
POST /tasks/{task_id}/documents/upload
Content-Type: multipart/form-data
```

**Form Fields**:
| Field      | Type   | Required | Description |
|------------|--------|----------|-------------|
| `file`     | file   | Yes | The document file (pdf, jpg, jpeg, png, xls, xlsx, csv, doc, docx) |
| `category` | string | Yes | The bucket category label (e.g., `"Business Bank Statements"`) |

**Response** `201 Created`:
```json
{
  "success": true,
  "message": "Document uploaded",
  "data": {
    "id": "doc-002",
    "taskId": "task-basic-documents-upload",
    "category": "Business Bank Statements",
    "fileName": "feb_2026_bank.pdf",
    "originalFilename": "feb_2026_bank.pdf",
    "fileType": "application/pdf",
    "fileSize": 312000,
    "status": "uploaded",
    "uploadedAt": "2026-05-29T02:55:00.000Z"
  }
}
```

---

### 3.9 Submit Task Documents

Marks the `basic_docs_upload` task as complete after uploading all documents.

```
POST /tasks/{task_id}/documents/submit
```

**Request Body**:
```json
{
  "uploadedDocuments": {
    "Business Bank Statements": ["doc-001", "doc-002"],
    "Business credit card statements": ["doc-003"],
    "Others": ["doc-004"]
  }
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Documents submitted and task completed",
  "data": {
    "taskId": "task-basic-documents-upload",
    "status": "complete",
    "totalDocuments": 4,
    "submittedAt": "2026-05-29T03:00:00.000Z"
  }
}
```

---

## 4. OCR / Document Scan APIs

The OCR page allows clients to capture photos or pick files (PDFs, images) and send them to the admin. The backend should store the files and optionally run OCR processing.

### 4.1 Upload OCR Document(s)

Uploads one or more files for OCR processing / admin review.

```
POST /documents/upload
Content-Type: multipart/form-data
```

**Form Fields**:
| Field      | Type   | Required | Description |
|------------|--------|----------|-------------|
| `file`     | file   | Yes | The scanned document (pdf, jpg, jpeg, png) |
| `category` | string | No | Should be `"ocr"` when uploaded from the OCR page |
| `filing_id`| string | No | Associated filing ID (if applicable) |

**Response** `201 Created`:
```json
{
  "success": true,
  "message": "Document uploaded for OCR processing",
  "data": {
    "id": "ocr-doc-001",
    "filing_id": null,
    "name": "receipt_scan",
    "original_filename": "receipt_scan.jpg",
    "file_type": "image/jpeg",
    "file_size": 1245000,
    "section_name": null,
    "document_type": "ocr",
    "status": "uploaded",
    "ocr_status": "pending",
    "uploaded_at": "2026-05-29T02:45:00.000Z",
    "created_at": "2026-05-29T02:45:00.000Z"
  }
}
```

> **Note**: The client app uploads files one-by-one in a loop. For batch upload, the backend can also accept multiple `file` fields or the client can call this endpoint multiple times.

---

### 4.2 Get OCR Processing Status

Check OCR processing status for uploaded documents.

```
GET /documents/ocr-status?document_ids=ocr-doc-001,ocr-doc-002
```

**Query Parameters**:
| Param         | Type   | Description |
|---------------|--------|-------------|
| `document_ids`| string | Comma-separated document IDs |

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "OCR status fetched",
  "data": [
    {
      "documentId": "ocr-doc-001",
      "ocrStatus": "completed",
      "processedAt": "2026-05-29T02:46:30.000Z"
    },
    {
      "documentId": "ocr-doc-002",
      "ocrStatus": "processing",
      "processedAt": null
    }
  ]
}
```

**OCR Status Values**: `pending` → `processing` → `completed` | `failed`

---

### 4.3 Get OCR Results

Retrieve extracted text/data from a processed OCR document.

```
GET /documents/{document_id}/ocr-result
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "OCR result fetched",
  "data": {
    "documentId": "ocr-doc-001",
    "ocrStatus": "completed",
    "extractedText": "Receipt\nStore: Office Depot\nDate: 2026-04-15\nTotal: $125.99\nHST: $16.38",
    "extractedFields": {
      "vendor": "Office Depot",
      "date": "2026-04-15",
      "total": 125.99,
      "hst": 16.38,
      "currency": "CAD"
    },
    "confidence": 0.94,
    "processedAt": "2026-05-29T02:46:30.000Z"
  }
}
```

---

## 5. Payroll APIs — Employees

### 5.1 List Employees

Fetches all employees for the authenticated user's business.

```
GET /payroll/employees
```

**Query Parameters** (optional):
| Param     | Type   | Description |
|-----------|--------|-------------|
| `page`    | int    | Page number (default: 1) |
| `per_page`| int    | Items per page (default: 50) |
| `search`  | string | Search by name, position, or department |

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Employees fetched",
  "data": [
    {
      "id": "EMP_1716900000000",
      "name": "John Michael Doe",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "middleName": "Michael",
      "dateOfBirth": "1990-06-15T00:00:00.000Z",
      "gender": "Male",
      "phone": "+1-416-555-0101",
      "sin": "123-456-789",
      "addressLine1": "123 Main Street",
      "addressLine2": "Unit 4B",
      "city": "Toronto",
      "country": "Canada",
      "provinceState": "Ontario",
      "postalCode": "M5V 2T6",
      "startDate": "2025-01-15T00:00:00.000Z",
      "position": "Software Developer",
      "department": "Engineering",
      "hourlyRate": 35.00,
      "federalTaxCredit": 14398.00,
      "provincialTaxCredit": 11481.00,
      "salary": 35.00,
      "metadata": {},
      "createdAt": "2026-01-15T10:00:00.000Z",
      "updatedAt": "2026-05-28T14:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total_items": 1,
    "total_pages": 1
  }
}
```

---

### 5.2 Get Employee by ID

```
GET /payroll/employees/{employee_id}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Employee fetched",
  "data": {
    "id": "EMP_1716900000000",
    "name": "John Michael Doe",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "middleName": "Michael",
    "dateOfBirth": "1990-06-15T00:00:00.000Z",
    "gender": "Male",
    "phone": "+1-416-555-0101",
    "sin": "123-456-789",
    "addressLine1": "123 Main Street",
    "addressLine2": "Unit 4B",
    "city": "Toronto",
    "country": "Canada",
    "provinceState": "Ontario",
    "postalCode": "M5V 2T6",
    "startDate": "2025-01-15T00:00:00.000Z",
    "position": "Software Developer",
    "department": "Engineering",
    "hourlyRate": 35.00,
    "federalTaxCredit": 14398.00,
    "provincialTaxCredit": 11481.00,
    "salary": 35.00,
    "metadata": {},
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-05-28T14:30:00.000Z"
  }
}
```

**Response** `404 Not Found`:
```json
{
  "success": false,
  "message": "Employee not found"
}
```

---

### 5.3 Create Employee

```
POST /payroll/employees
```

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "middleName": "Michael",
  "email": "john.doe@example.com",
  "dateOfBirth": "1990-06-15",
  "gender": "Male",
  "phone": "+1-416-555-0101",
  "sin": "123-456-789",
  "addressLine1": "123 Main Street",
  "addressLine2": "Unit 4B",
  "city": "Toronto",
  "country": "Canada",
  "provinceState": "Ontario",
  "postalCode": "M5V 2T6",
  "startDate": "2025-01-15",
  "position": "Software Developer",
  "department": "Engineering",
  "hourlyRate": 35.00,
  "federalTaxCredit": 14398.00,
  "provincialTaxCredit": 11481.00
}
```

**Required Fields**: `firstName`, `lastName`  
**Optional Fields**: All others

**Response** `201 Created`:
```json
{
  "success": true,
  "message": "Employee created",
  "data": {
    "id": "EMP_1716900000000",
    "name": "John Michael Doe",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "middleName": "Michael",
    "dateOfBirth": "1990-06-15T00:00:00.000Z",
    "gender": "Male",
    "phone": "+1-416-555-0101",
    "sin": "123-456-789",
    "addressLine1": "123 Main Street",
    "addressLine2": "Unit 4B",
    "city": "Toronto",
    "country": "Canada",
    "provinceState": "Ontario",
    "postalCode": "M5V 2T6",
    "startDate": "2025-01-15T00:00:00.000Z",
    "position": "Software Developer",
    "department": "Engineering",
    "hourlyRate": 35.00,
    "federalTaxCredit": 14398.00,
    "provincialTaxCredit": 11481.00,
    "salary": 35.00,
    "metadata": {},
    "createdAt": "2026-05-29T02:50:00.000Z",
    "updatedAt": "2026-05-29T02:50:00.000Z"
  }
}
```

> **Backend Note**: `name` is auto-composed as `"{firstName} {middleName} {lastName}"`. `salary` defaults to the same value as `hourlyRate` if not provided.

---

### 5.4 Update Employee

```
PATCH /payroll/employees/{employee_id}
```

**Request Body** (partial update — send only fields to change):
```json
{
  "position": "Senior Software Developer",
  "hourlyRate": 42.00,
  "department": "Platform Engineering"
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Employee updated",
  "data": {
    "id": "EMP_1716900000000",
    "name": "John Michael Doe",
    "firstName": "John",
    "lastName": "Doe",
    "middleName": "Michael",
    "position": "Senior Software Developer",
    "department": "Platform Engineering",
    "hourlyRate": 42.00,
    "salary": 42.00,
    "updatedAt": "2026-05-29T03:00:00.000Z"
  }
}
```

---

### 5.5 Delete Employee

```
DELETE /payroll/employees/{employee_id}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Employee deleted",
  "data": {
    "id": "EMP_1716900000000",
    "deletedAt": "2026-05-29T03:05:00.000Z"
  }
}
```

---

## 6. Payroll APIs — Entries

Payroll entries represent a single pay period. Each entry is associated with a set of employees and contains per-employee hours/notes.

### 6.1 List Payroll Entries

```
GET /payroll/entries
```

**Query Parameters** (optional):
| Param     | Type   | Description |
|-----------|--------|-------------|
| `status`  | string | `pending`, `submitted`, `all` (default: `all`) |
| `page`    | int    | Page number |
| `per_page`| int    | Items per page (default: 20) |
| `sort`    | string | `period_start_desc` (default), `period_start_asc` |

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Payroll entries fetched",
  "data": [
    {
      "id": "PAY_1716900000000",
      "periodLabel": "May 2026",
      "periodStart": "2026-05-01T00:00:00.000Z",
      "periodEnd": "2026-05-31T00:00:00.000Z",
      "status": "pending",
      "employeeIds": ["EMP_1716900000000", "EMP_1716900000001"],
      "totalAmount": null,
      "notes": "Regular monthly payroll",
      "documentPaths": ["payslip_may_2026.pdf"],
      "metadata": {
        "employeeRows": [
          {
            "employeeId": "EMP_1716900000000",
            "hours": "160",
            "holidayHours": "8",
            "notes": "Worked Victoria Day"
          },
          {
            "employeeId": "EMP_1716900000001",
            "hours": "152",
            "holidayHours": "0",
            "notes": ""
          }
        ]
      },
      "isAutoGenerated": false,
      "createdAt": "2026-05-01T10:00:00.000Z",
      "updatedAt": "2026-05-28T14:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_items": 1,
    "total_pages": 1
  }
}
```

---

### 6.2 Get Payroll Entry by ID

```
GET /payroll/entries/{entry_id}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Payroll entry fetched",
  "data": {
    "id": "PAY_1716900000000",
    "periodLabel": "May 2026",
    "periodStart": "2026-05-01T00:00:00.000Z",
    "periodEnd": "2026-05-31T00:00:00.000Z",
    "status": "pending",
    "employeeIds": ["EMP_1716900000000"],
    "totalAmount": null,
    "notes": "",
    "documentPaths": [],
    "metadata": {
      "employeeRows": [
        {
          "employeeId": "EMP_1716900000000",
          "hours": "160",
          "holidayHours": "8",
          "notes": "Worked Victoria Day"
        }
      ]
    },
    "isAutoGenerated": false,
    "createdAt": "2026-05-01T10:00:00.000Z",
    "updatedAt": "2026-05-28T14:30:00.000Z",
    "employees": [
      {
        "id": "EMP_1716900000000",
        "name": "John Michael Doe",
        "position": "Software Developer",
        "hourlyRate": 35.00
      }
    ]
  }
}
```

> **Backend Note**: The `employees` array is a joined/populated view of the employee records referenced by `employeeIds`. This avoids extra API calls on the client.

---

### 6.3 Create Payroll Entry

```
POST /payroll/entries
```

**Request Body**:
```json
{
  "periodLabel": "May 2026",
  "periodStart": "2026-05-01",
  "periodEnd": "2026-05-31",
  "employeeIds": ["EMP_1716900000000", "EMP_1716900000001"],
  "notes": "",
  "tenure": "monthly"
}
```

**Required Fields**: `periodLabel`, `periodStart`, `periodEnd`  
**Optional Fields**: `employeeIds` (defaults to all employees), `notes`, `tenure`

**Response** `201 Created`:
```json
{
  "success": true,
  "message": "Payroll entry created",
  "data": {
    "id": "PAY_1716900123456",
    "periodLabel": "May 2026",
    "periodStart": "2026-05-01T00:00:00.000Z",
    "periodEnd": "2026-05-31T00:00:00.000Z",
    "status": "pending",
    "employeeIds": ["EMP_1716900000000", "EMP_1716900000001"],
    "totalAmount": null,
    "notes": "",
    "documentPaths": [],
    "metadata": {
      "employeeRows": []
    },
    "isAutoGenerated": false,
    "createdAt": "2026-05-29T03:00:00.000Z",
    "updatedAt": "2026-05-29T03:00:00.000Z"
  }
}
```

---

### 6.4 Update Payroll Entry

Saves employee hours, notes, and attached documents. Called when the user taps "Save" or as an auto-save.

```
PATCH /payroll/entries/{entry_id}
```

**Request Body** (partial update):
```json
{
  "employeeIds": ["EMP_1716900000000", "EMP_1716900000001"],
  "notes": "Include overtime calculations",
  "metadata": {
    "employeeRows": [
      {
        "employeeId": "EMP_1716900000000",
        "hours": "168",
        "holidayHours": "8",
        "notes": "Includes 8hrs overtime on weekends"
      },
      {
        "employeeId": "EMP_1716900000001",
        "hours": "160",
        "holidayHours": "0",
        "notes": ""
      }
    ]
  }
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Payroll entry updated",
  "data": {
    "id": "PAY_1716900000000",
    "periodLabel": "May 2026",
    "status": "pending",
    "employeeIds": ["EMP_1716900000000", "EMP_1716900000001"],
    "notes": "Include overtime calculations",
    "metadata": {
      "employeeRows": [
        {
          "employeeId": "EMP_1716900000000",
          "hours": "168",
          "holidayHours": "8",
          "notes": "Includes 8hrs overtime on weekends"
        },
        {
          "employeeId": "EMP_1716900000001",
          "hours": "160",
          "holidayHours": "0",
          "notes": ""
        }
      ]
    },
    "updatedAt": "2026-05-29T03:10:00.000Z"
  }
}
```

**Response** `409 Conflict` (already submitted):
```json
{
  "success": false,
  "message": "Cannot update a submitted payroll entry"
}
```

---

### 6.5 Submit Payroll Entry

Finalizes the payroll entry. Once submitted, it cannot be edited.

```
POST /payroll/entries/{entry_id}/submit
```

**Request Body** (none required; optionally send final state):
```json
{
  "employeeIds": ["EMP_1716900000000"],
  "metadata": {
    "employeeRows": [
      {
        "employeeId": "EMP_1716900000000",
        "hours": "168",
        "holidayHours": "8",
        "notes": "Final submission"
      }
    ]
  }
}
```

**Validation Rules**:
- At least one employee must be selected.
- Every selected employee must have a non-empty, valid numeric `hours` value.

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Payroll submitted successfully",
  "data": {
    "id": "PAY_1716900000000",
    "periodLabel": "May 2026",
    "status": "submitted",
    "submittedAt": "2026-05-29T03:15:00.000Z",
    "updatedAt": "2026-05-29T03:15:00.000Z"
  }
}
```

**Response** `400 Bad Request`:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "employeeIds",
      "message": "At least one employee must be selected"
    },
    {
      "field": "employeeRows[0].hours",
      "message": "Work hours must be a valid number"
    }
  ]
}
```

---

### 6.6 Delete Payroll Entry

Only pending (non-submitted) entries can be deleted.

```
DELETE /payroll/entries/{entry_id}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Payroll entry deleted",
  "data": {
    "id": "PAY_1716900000000",
    "deletedAt": "2026-05-29T03:20:00.000Z"
  }
}
```

**Response** `409 Conflict`:
```json
{
  "success": false,
  "message": "Cannot delete a submitted payroll entry"
}
```

---

### 6.7 Upload Payroll Document

Attaches a supporting document (payslip, timesheet, etc.) to a payroll entry.

```
POST /payroll/entries/{entry_id}/documents
Content-Type: multipart/form-data
```

**Form Fields**:
| Field  | Type | Required | Description |
|--------|------|----------|-------------|
| `file` | file | Yes | Document file (pdf, jpg, png, doc, docx, xls, xlsx, csv) |

**Response** `201 Created`:
```json
{
  "success": true,
  "message": "Document attached to payroll entry",
  "data": {
    "entryId": "PAY_1716900000000",
    "documentId": "pdoc-001",
    "fileName": "may_timesheet.pdf",
    "fileSize": 125000,
    "uploadedAt": "2026-05-29T03:10:00.000Z",
    "documentPaths": ["payslip_may_2026.pdf", "may_timesheet.pdf"]
  }
}
```

---

## 7. Payroll APIs — Automation Config

Automation allows the system to auto-generate payroll entries on a recurring schedule (weekly, biweekly, monthly).

### 7.1 Get Automation Config

```
GET /payroll/automation
```

**Response** `200 OK` (configured):
```json
{
  "success": true,
  "message": "Automation config fetched",
  "data": {
    "startDate": "2026-01-01T00:00:00.000Z",
    "frequency": "monthly",
    "isActive": true,
    "lastGeneratedDate": "2026-05-01T00:00:00.000Z"
  }
}
```

**Response** `200 OK` (not configured):
```json
{
  "success": true,
  "message": "No automation configured",
  "data": null
}
```

---

### 7.2 Set / Update Automation Config

```
PUT /payroll/automation
```

**Request Body**:
```json
{
  "startDate": "2026-01-01",
  "frequency": "monthly",
  "isActive": true
}
```

**Allowed `frequency` values**: `weekly`, `biweekly`, `monthly`

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Automation config saved",
  "data": {
    "startDate": "2026-01-01T00:00:00.000Z",
    "frequency": "monthly",
    "isActive": true,
    "lastGeneratedDate": null
  }
}
```

---

### 7.3 Disable Automation

```
POST /payroll/automation/disable
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Automation disabled",
  "data": {
    "startDate": "2026-01-01T00:00:00.000Z",
    "frequency": "monthly",
    "isActive": false,
    "lastGeneratedDate": "2026-05-01T00:00:00.000Z"
  }
}
```

---

### 7.4 Run Automation (Generate Entries)

Triggers the backend to generate any missing payroll entries from the last generated date up to today. This can be called on app launch or on a schedule.

```
POST /payroll/automation/run
```

**Request Body**: None

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Automation completed",
  "data": {
    "entriesGenerated": 2,
    "generatedEntries": [
      {
        "id": "PAY_1716900100000",
        "periodLabel": "April 2026",
        "periodStart": "2026-04-01T00:00:00.000Z",
        "periodEnd": "2026-04-30T00:00:00.000Z",
        "isAutoGenerated": true
      },
      {
        "id": "PAY_1716900200000",
        "periodLabel": "May 2026",
        "periodStart": "2026-05-01T00:00:00.000Z",
        "periodEnd": "2026-05-31T00:00:00.000Z",
        "isAutoGenerated": true
      }
    ],
    "lastGeneratedDate": "2026-05-01T00:00:00.000Z"
  }
}
```

> **Backend Logic**: Max 52 entries per run (safety cap). Skip periods whose end date is in the future. Check for duplicate periods before creating.

---

## 8. Data Flow Diagrams

### Tasks Page — Data Loading & User Interaction

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TASKS PAGE FLOW                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  APP LAUNCH / PAGE OPEN                                                 │
│  ─────────────────────                                                  │
│  1. Client calls GET /tasks                                             │
│  2. Server returns list of TaskModel objects                            │
│  3. UI renders task cards (title, description, status badge)            │
│  4. Pull-to-refresh re-calls GET /tasks                                 │
│                                                                         │
│  USER TAPS A TASK CARD                                                  │
│  ─────────────────────                                                  │
│  1. Client calls GET /tasks/{task_id}                                   │
│  2. Task Details page renders based on taskType:                        │
│                                                                         │
│  ┌─ taskType: "onboarding_form" ──→ Open T2 Business Form              │
│  │                                                                      │
│  ├─ taskType: "sheet_remarks" ────→ Open Query Sheet Remarks            │
│  │   │                                                                  │
│  │   ├─ GET /tasks/{id}/query-sheet  → load transaction rows            │
│  │   │                                                                  │
│  │   ├─ OPTION A: Download sheet → fill in Excel → upload              │
│  │   │   POST /tasks/{id}/query-sheet/upload (multipart)                │
│  │   │                                                                  │
│  │   └─ OPTION B: Fill in remarks row-by-row in UI → submit            │
│  │       POST /tasks/{id}/query-sheet/remarks                           │
│  │                                                                      │
│  ├─ taskType: "basic_docs_upload" → Open Documents Upload               │
│  │   │                                                                  │
│  │   ├─ GET /tasks/{id}/document-buckets  → load upload categories      │
│  │   ├─ POST /tasks/{id}/documents/upload  → upload per category        │
│  │   └─ POST /tasks/{id}/documents/submit  → mark complete             │
│  │                                                                      │
│  ├─ taskType: "payroll" ──────────→ Navigate to Payroll page            │
│  │                                                                      │
│  └─ taskType: "info" ────────────→ Show details + "Mark Complete"       │
│      POST /tasks/{id}/complete                                          │
│                                                                         │
│  AFTER COMPLETION                                                       │
│  ────────────────                                                       │
│  Navigate back to Tasks list → re-fetch GET /tasks                      │
│  Status changes from "pending" → "complete"                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Payroll Page — Data Loading & User Interaction

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PAYROLL PAGE FLOW                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  APP LAUNCH / PAGE OPEN                                                 │
│  ─────────────────────                                                  │
│  1. Client calls GET /payroll/employees                                 │
│  2. Client calls GET /payroll/entries (sorted by periodStart DESC)      │
│  3. Client calls GET /payroll/automation (to check config)              │
│  4. Optionally: POST /payroll/automation/run (generate missing entries) │
│  5. UI renders two tabs: [Employees] [Entries]                          │
│                                                                         │
│  ───── EMPLOYEES TAB ─────                                              │
│                                                                         │
│  TAP "+" FAB → Navigate to Employee Form                                │
│  │                                                                      │
│  ├─ Fill form → POST /payroll/employees  → Employee created             │
│  └─ Navigate back → re-fetch GET /payroll/employees                     │
│                                                                         │
│  TAP EMPLOYEE CARD → Navigate to Employee Form (edit mode)              │
│  │                                                                      │
│  ├─ GET /payroll/employees/{id}  → pre-fill form fields                 │
│  ├─ Edit fields → PATCH /payroll/employees/{id}                         │
│  └─ Navigate back → re-fetch GET /payroll/employees                     │
│                                                                         │
│  LONG-PRESS EMPLOYEE → Confirm delete dialog                            │
│  │                                                                      │
│  └─ DELETE /payroll/employees/{id}  → re-fetch list                     │
│                                                                         │
│  ───── ENTRIES TAB ─────                                                │
│                                                                         │
│  TAP "+" FAB → Create new entry                                         │
│  │                                                                      │
│  ├─ First time: Show tenure selection bottom sheet                      │
│  │   (weekly/monthly/quarterly/semi-annually/annually)                  │
│  │   → Save tenure preference locally AND to server                     │
│  │                                                                      │
│  ├─ Compute period dates from tenure + last entry's end date            │
│  ├─ POST /payroll/entries  → Entry created                              │
│  └─ Navigate to Entry Detail page                                       │
│                                                                         │
│  TAP ENTRY CARD → Navigate to Entry Detail                              │
│  │                                                                      │
│  ├─ GET /payroll/entries/{id}  → load entry + employee details          │
│  │                                                                      │
│  ├─ Select/deselect employees (checkbox panel)                          │
│  ├─ Enter hours, holiday hours, notes per employee (table)              │
│  ├─ Add notes for the overall entry                                     │
│  ├─ Attach documents → POST /payroll/entries/{id}/documents             │
│  │                                                                      │
│  ├─ TAP "Save" → PATCH /payroll/entries/{id}                           │
│  │                                                                      │
│  └─ TAP "Submit Payroll" → confirm dialog                               │
│      → POST /payroll/entries/{id}/submit                                │
│      → status changes to "submitted" (read-only)                        │
│      → Navigate back                                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### OCR Page — Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          OCR PAGE FLOW                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PAGE OPEN                                                              │
│  ─────────                                                              │
│  Empty state — "No files selected"                                      │
│                                                                         │
│  USER ACTION: "Take Photo"                                              │
│  │                                                                      │
│  ├─ Open device camera → capture image                                  │
│  └─ Add to local file list (displayed as thumbnail)                     │
│                                                                         │
│  USER ACTION: "Choose Files"                                            │
│  │                                                                      │
│  ├─ Open file picker (pdf, jpg, jpeg, png)                              │
│  ├─ Allow multiple files                                                │
│  └─ Add all to local file list                                          │
│                                                                         │
│  USER ACTION: Delete icon on a file                                     │
│  │                                                                      │
│  └─ Remove from local list (no server call yet)                         │
│                                                                         │
│  USER ACTION: "Send"                                                    │
│  │                                                                      │
│  ├─ Show loading overlay                                                │
│  ├─ For each file in list:                                              │
│  │   POST /documents/upload (category: "ocr")                           │
│  │   ├─ Success → continue to next file                                 │
│  │   └─ Failure → show toast error, continue with remaining files       │
│  │                                                                      │
│  ├─ All done → "All files uploaded" toast                               │
│  ├─ Clear local file list                                               │
│  └─ Navigate to /tasks                                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Database Schema Suggestions

### `tasks` Table

```sql
CREATE TABLE tasks (
    id              VARCHAR(100) PRIMARY KEY,
    client_id       VARCHAR(100) NOT NULL REFERENCES users(id),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | complete
    task_type       VARCHAR(50),  -- onboarding_form | sheet_remarks | basic_docs_upload | info | payroll
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,

    -- Admin who assigned the task
    assigned_by     VARCHAR(100) REFERENCES admin_users(id)
);

CREATE INDEX idx_tasks_client_id ON tasks(client_id);
CREATE INDEX idx_tasks_status ON tasks(status);
```

### `query_sheet_rows` Table

```sql
CREATE TABLE query_sheet_rows (
    id              SERIAL PRIMARY KEY,
    task_id         VARCHAR(100) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    row_index       INT NOT NULL,
    date            VARCHAR(50),
    details         TEXT,
    payment         VARCHAR(50),
    receipt         VARCHAR(100),
    hst             VARCHAR(50),
    our_remarks     TEXT,
    client_remarks  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(task_id, row_index)
);
```

### `task_documents` Table

```sql
CREATE TABLE task_documents (
    id                  VARCHAR(100) PRIMARY KEY,
    task_id             VARCHAR(100) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    category            VARCHAR(255),  -- bucket label
    file_name           VARCHAR(255) NOT NULL,
    original_filename   VARCHAR(255) NOT NULL,
    file_type           VARCHAR(100),
    file_size           BIGINT,
    storage_path        TEXT NOT NULL,  -- cloud storage key/URL
    status              VARCHAR(20) DEFAULT 'uploaded',
    uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_documents_task_id ON task_documents(task_id);
```

### `employees` Table

```sql
CREATE TABLE employees (
    id                      VARCHAR(100) PRIMARY KEY,
    client_id               VARCHAR(100) NOT NULL REFERENCES users(id),
    name                    VARCHAR(255) NOT NULL,
    email                   VARCHAR(255),
    first_name              VARCHAR(100),
    last_name               VARCHAR(100),
    middle_name             VARCHAR(100),
    date_of_birth           DATE,
    gender                  VARCHAR(30),
    phone                   VARCHAR(50),
    sin                     VARCHAR(20),  -- ENCRYPTED AT REST (AES-256)
    address_line_1          VARCHAR(255),
    address_line_2          VARCHAR(255),
    city                    VARCHAR(100),
    country                 VARCHAR(100),
    province_state          VARCHAR(100),
    postal_code             VARCHAR(20),
    start_date              DATE,
    position                VARCHAR(255),
    department              VARCHAR(255),
    hourly_rate             DECIMAL(10, 2),
    federal_tax_credit      DECIMAL(12, 2),
    provincial_tax_credit   DECIMAL(12, 2),
    salary                  DECIMAL(10, 2),
    metadata                JSONB DEFAULT '{}',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employees_client_id ON employees(client_id);
```

### `payroll_entries` Table

```sql
CREATE TABLE payroll_entries (
    id                  VARCHAR(100) PRIMARY KEY,
    client_id           VARCHAR(100) NOT NULL REFERENCES users(id),
    period_label        VARCHAR(100) NOT NULL,
    period_start        DATE NOT NULL,
    period_end          DATE NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | submitted
    employee_ids        JSONB DEFAULT '[]',
    total_amount        DECIMAL(12, 2),
    notes               TEXT,
    document_paths      JSONB DEFAULT '[]',
    metadata            JSONB DEFAULT '{}',  -- contains employeeRows array
    is_auto_generated   BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at        TIMESTAMPTZ
);

CREATE INDEX idx_payroll_entries_client_id ON payroll_entries(client_id);
CREATE INDEX idx_payroll_entries_status ON payroll_entries(status);
CREATE INDEX idx_payroll_entries_period ON payroll_entries(period_start, period_end);
```

### `payroll_automation_configs` Table

```sql
CREATE TABLE payroll_automation_configs (
    id                      SERIAL PRIMARY KEY,
    client_id               VARCHAR(100) NOT NULL UNIQUE REFERENCES users(id),
    start_date              DATE NOT NULL,
    frequency               VARCHAR(20) NOT NULL,  -- weekly | biweekly | monthly
    is_active               BOOLEAN DEFAULT TRUE,
    last_generated_date     DATE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `ocr_documents` Table (extension of existing `documents` table)

```sql
-- Add OCR-specific columns to existing documents table or create a linked table:
ALTER TABLE documents ADD COLUMN IF NOT EXISTS
    ocr_status          VARCHAR(20) DEFAULT NULL;  -- NULL | pending | processing | completed | failed

ALTER TABLE documents ADD COLUMN IF NOT EXISTS
    ocr_result          JSONB DEFAULT NULL;  -- extracted text + structured fields

ALTER TABLE documents ADD COLUMN IF NOT EXISTS
    ocr_confidence      DECIMAL(3, 2) DEFAULT NULL;  -- 0.00 to 1.00

ALTER TABLE documents ADD COLUMN IF NOT EXISTS
    ocr_processed_at    TIMESTAMPTZ DEFAULT NULL;
```

---

## API Endpoint Summary Table

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| **Tasks** ||||
| 1 | GET | `/tasks` | List tasks for user |
| 2 | GET | `/tasks/{task_id}` | Get task details |
| 3 | POST | `/tasks/{task_id}/complete` | Mark task complete |
| 4 | GET | `/tasks/{task_id}/query-sheet` | Get query sheet rows |
| 5 | POST | `/tasks/{task_id}/query-sheet/upload` | Upload completed Excel |
| 6 | POST | `/tasks/{task_id}/query-sheet/remarks` | Submit row-by-row remarks |
| 7 | GET | `/tasks/{task_id}/document-buckets` | Get upload categories |
| 8 | POST | `/tasks/{task_id}/documents/upload` | Upload task document |
| 9 | POST | `/tasks/{task_id}/documents/submit` | Submit all task docs |
| **OCR** ||||
| 10 | POST | `/documents/upload` | Upload OCR document |
| 11 | GET | `/documents/ocr-status` | Check OCR status |
| 12 | GET | `/documents/{document_id}/ocr-result` | Get OCR results |
| **Payroll — Employees** ||||
| 13 | GET | `/payroll/employees` | List employees |
| 14 | GET | `/payroll/employees/{id}` | Get employee |
| 15 | POST | `/payroll/employees` | Create employee |
| 16 | PATCH | `/payroll/employees/{id}` | Update employee |
| 17 | DELETE | `/payroll/employees/{id}` | Delete employee |
| **Payroll — Entries** ||||
| 18 | GET | `/payroll/entries` | List entries |
| 19 | GET | `/payroll/entries/{id}` | Get entry |
| 20 | POST | `/payroll/entries` | Create entry |
| 21 | PATCH | `/payroll/entries/{id}` | Update entry |
| 22 | POST | `/payroll/entries/{id}/submit` | Submit entry |
| 23 | DELETE | `/payroll/entries/{id}` | Delete entry |
| 24 | POST | `/payroll/entries/{id}/documents` | Upload entry doc |
| **Payroll — Automation** ||||
| 25 | GET | `/payroll/automation` | Get config |
| 26 | PUT | `/payroll/automation` | Set/update config |
| 27 | POST | `/payroll/automation/disable` | Disable automation |
| 28 | POST | `/payroll/automation/run` | Generate entries |

---

## Important Notes for Backend Developer

### Security

- **SIN (Social Insurance Number)** must be encrypted at rest using AES-256. Never return the full SIN in list endpoints — mask it as `***-***-789` in list views, only return full value in the detail endpoint with explicit permission.
- All file uploads must be scanned for viruses (Cloudflare integration).
- Implement rate limiting on upload endpoints.

### Data Ownership

- All queries must be scoped to the authenticated user's `client_id`. A user must never see another user's tasks, employees, or payroll entries.
- Tasks are created by admins via the admin panel. The client API only supports reading tasks and marking them complete.

### File Storage

- Use Cloudflare R2 or equivalent object storage.
- Generate pre-signed URLs for file downloads (expiry: 1 hour).
- The original Excel sheet for query-sheet tasks should be downloadable via `downloadUrl` in the query-sheet response.

### JSON Key Casing

- The client app (Flutter) uses **camelCase** for JSON keys (`firstName`, `taskType`, `periodLabel`).
- If the backend uses snake_case internally, apply a camelCase serializer/middleware for all API responses going to the client app. The client has fallback parsing for both `createdAt` and `created_at`, but prefer consistent camelCase.

### Pagination

- Default page size: 20 for tasks/entries, 50 for employees.
- Always return `pagination` metadata in list responses.

### Timestamps

- Store all timestamps in UTC.
- Return ISO 8601 format with timezone: `2026-05-29T02:50:00.000Z`
