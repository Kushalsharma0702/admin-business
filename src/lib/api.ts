// src/lib/api.ts — typed fetch client for the TaxEase backend
// Dev → localhost:3001 | Prod browser → same origin | Prod SSR → loopback API
export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? "http://localhost:3001"
    : typeof window !== "undefined"
      ? window.location.origin
      : "http://127.0.0.1:3001");

export const ADMIN_STATUSES = [
  "On Hold",
  "Not to Do",
  "Data not received",
  "Partial Data received",
  "Data Missing Closed",
  "Work in Progress",
  "Query sent to Support team",
  "Query sent to client",
  "Partial Query received",
  "Review",
  "Sent for Approval to support team",
  "Sent for Approval to client",
  "Approval received",
  "Send for automation",
  "Received from automation",
  "Filed",
] as const;

export type AdminStatus = (typeof ADMIN_STATUSES)[number];

export const TASK_TYPES = [
  "CORPORATE_TAX_RETURN", "HST", "BOOKKEEPING", "PAYROLL",
  "PD7A", "WCB", "T4", "T4A", "T5018", "T5",
  "CORPORATE_TAX_QUARTERLY_PAYMENT", "HST_QUARTERLY_PAYMENT",
  "CUSTOM",
  // Not a real `tasks.task_type` — reuses the same notification-routing table
  // (task_type is just a free string key there) so Onboarding's completion
  // email is editable from this same Admins page screen.
  "ONBOARDING",
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

/**
 * Keys the notification-routing table accepts. A superset of TASK_TYPES:
 * task_type there is a free string, so admin-side events that aren't tasks
 * (onboarding / client take-on completion) are routed through the same table
 * and are editable from the same screen.
 */
export const NOTIFICATION_ROUTING_KEYS = [
  ...TASK_TYPES.filter((t) => t !== "ONBOARDING"),
  "ONBOARDING",
  "CLIENT_TAKE_ON",
] as const;

/** Where a routing key's email goes when nothing is configured for it. */
export const NOTIFICATION_FALLBACKS: Record<string, string> = {
  ONBOARDING: "support@diamondaccounts.ca, accounts@diamondaccounts.ca, admin@diamondaccounts.ca",
  CLIENT_TAKE_ON: "accounts@diamondaccounts.ca",
};
export const DEFAULT_NOTIFICATION_EMAIL = "accounts@diamondaccounts.ca";
export type TaskPriority = "high" | "medium" | "low" | "none";

/** Repeat rule deciding when a generated bookkeeping task falls due. */
export type DueRule = {
  type: "default" | "day" | "week" | "month" | "year";
  interval?: number;
  /** type "week": 0=Sun … 6=Sat */
  weekdays?: number[];
  /** type "month" / "year" */
  dayOfMonth?: number | "last";
  /** type "year", 1-12 */
  month?: number;
};

export interface ApiTask {
  id: string;
  clientId: string;
  assignedBy: string | null;
  /** Owning staff member — distinct from assignedBy (who gave it to the client). */
  assignedTo: string | null;
  assignedToName: string | null;
  /** Admin-side "done". Independent of status/completedAt, which are the client's. */
  closedAt: string | null;
  closedBy: string | null;
  closedByName: string | null;
  title: string;
  description: string | null;
  instructions: string | null;
  priority: TaskPriority;
  status: "pending" | "draft" | "complete";
  adminStatus: string;
  taskType: TaskType | string | null;
  currentSubtask: string | null;
  clientProgress: string | null;
  dueDate: string | null;
  openDate: string | null;
  taxYear: number | null;
  config: Record<string, unknown>;
  metadata: Record<string, unknown>;
  draftData: Record<string, unknown> | null;
  completionNote: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  clientName?: string;
  clientEmail?: string;
}

// ─── General Documentation types ─────────────────────────────────────────────
export interface GeneralDocField {
  key: string;
  name: string;
  placeholder: string;
  required: boolean;
  maxCount: number;
  acceptedTypes: string[];
  notes: string;
  displayOrder: number;
}

export interface GeneralDocUpload {
  id: string;
  fieldKey: string;
  slotIndex: number;
  fileName: string;
  originalFilename: string;
  fileType: string | null;
  fileSize: number;
  s3Key: string | null;
  uploadedAt: string;
}

export interface GeneralDocFieldStatus extends GeneralDocField {
  uploadedCount: number;
  pendingCount: number;
  status: "complete" | "pending" | "optional";
  slots: Array<{
    slotIndex: number;
    uploadedFile: {
      id: string; fileName: string; originalFilename: string;
      fileType: string | null; fileSize: number; s3Key: string | null; uploadedAt: string;
      reuploadReason: string | null; reuploadRequestedAt: string | null;
    } | null;
    status: "uploaded" | "pending" | "reupload_requested";
  }>;
}

export interface GeneralDocStatus {
  enabled: boolean;
  fields: GeneralDocFieldStatus[];
  overall: "submitted" | "partial" | "pending" | "not_required";
}

export interface UserProfile {
  id: string;
  userId: string;
  profileType: "personal" | "business";
  profileName: string;
  businessName: string | null;
  isDefault: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ClientTask {
  id: string;
  slug?: string | null;
  taskType: TaskType | string | null;
  taskName: string;
  clientProgress: string | null;
  dueDate: string | null;
  openDate: string | null;
  taxYear: number | null;
  status: "pending" | "complete";
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientSubtask {
  id: string;
  order: number;
  clientProgress: string;
  status: "pending" | "active" | "completed" | "skipped";
  completedAt: string | null;
}

export interface DocumentSlot {
  slotIndex: number;
  label: string;
  status: "pending" | "uploaded";
  uploadedFile: { id: string; fileName: string; fileSize: number; fileType?: string | null; uploadedAt: string } | null;
}

export interface DocumentRequirement {
  key: string;
  label: string;
  category: string;
  group: string | null;
  quantity: number;
  required: boolean;
  slots: DocumentSlot[];
  uploadedCount: number;
  pendingCount: number;
}

/** @deprecated use DocumentRequirement */
export interface ClientDocumentBucket extends DocumentRequirement {}

export interface ClientTaskDetails {
  task: ClientTask;
  workflow: {
    taskType: string;
    displayName: string;
    currentClientProgress: string | null;
    progressMilestones: string[];
    subtaskWorkflow: SubtaskWorkflowStep[];
    generation: Record<string, unknown> | null;
    relatedTasks: Record<string, unknown>[];
  } | null;
  subtasks: ClientSubtask[];
  fields: {
    config: Record<string, unknown> | null;
    configSchema: ConfigFieldDef[];
    formSchema: import("./formTypes").FormField[];
    documentRequirements: DocumentRequirement[] | null;
    documentBuckets: DocumentRequirement[] | null;
    documentSummary: { totalSlots: number; uploadedSlots: number; pendingSlots: number; complete: boolean } | null;
    querySheet: { totalRows: number; downloadUrl: string | null } | null;
    metadata: {
      route: string | null;
      submissionModes: string[] | null;
      editableField: string | null;
      readOnlyFields: string[] | null;
    };
  };
  templateVersion: import("./formTypes").TemplateVersion | null;
  submission: import("./formTypes").TaskSubmission | null;
  actions: string[];
}

export interface ApiTaskWithConfig extends ApiTask {
  configSchema: ConfigFieldDef[];
  subDetails: TaskSubDetails | null;
}

export interface SubtaskInfo {
  id: string;
  subtaskName: string;
  subtaskOrder: number;
  status: "pending" | "active" | "completed" | "skipped";
  completedAt: string | null;
  completedBy: string | null;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  fromSubtask: string | null;
  toSubtask: string | null;
  fromProgress: string | null;
  toProgress: string | null;
  performedBy: string | null;
  performedByName: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ConfigFieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "boolean" | "textarea" | "password";
  required?: boolean;
  options?: string[];
  dependsOn?: { field: string; value: string | boolean };
}

export interface SubtaskWorkflowStep {
  order: number;
  subtask: string;
  clientProgress: string;
}

export interface TaskSubDetails {
  generation: Record<string, unknown> | null;
  subtaskWorkflow: SubtaskWorkflowStep[];
  relatedTasks: Record<string, unknown>[];
  progressMilestones: string[];
}

export interface TaskTypeInfo {
  key: TaskType;
  displayName: string;
  subtaskCount: number;
  subtasks: string[];
  configFields: string[];
  configSchema: ConfigFieldDef[];
  subDetails: TaskSubDetails;
}

export interface ApiClient {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  occupation: string | null;
  clientSince: string | null;
  portalStatus: "active" | "pending" | "none";
  createdAt: string;
}

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("taxease_token") ?? "";
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  // FormData bodies must NOT get an explicit Content-Type — the browser needs
  // to set its own "multipart/form-data; boundary=..." or the server can't
  // parse the upload.
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Request failed");
  return json;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ success: boolean; data: { token: string; user: { id: string; name: string; role: string; email: string } } }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
};

// ─── Superadmin — Staff accounts, permissions, audit log ─────────────────────
export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "superadmin";
  permissions: string[];
  isActive: boolean;
  createdAt: string;
};
export type AuditLogEntry = {
  id: string;
  adminId?: string;
  adminName: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};
export const adminUsersApi = {
  list: () => request<{ success: boolean; data: AdminUser[] }>("/api/admin/admins"),
  permissionKeys: () => request<{ success: boolean; data: string[] }>("/api/admin/permission-keys"),
  create: (body: { name: string; email: string; password: string; permissions?: string[] }) =>
    request<{ success: boolean; data: AdminUser }>("/api/admin/admins", {
      method: "POST", body: JSON.stringify(body),
    }),
  update: (id: string, body: { permissions?: string[]; isActive?: boolean }) =>
    request<{ success: boolean; data: AdminUser }>(`/api/admin/admins/${id}`, {
      method: "PATCH", body: JSON.stringify(body),
    }),
  remove: (id: string) =>
    request<{ success: boolean; data: { id: string } }>(`/api/admin/admins/${id}`, { method: "DELETE" }),
  logsFor: (id: string) =>
    request<{ success: boolean; data: AuditLogEntry[] }>(`/api/admin/admins/${id}/logs`),
  auditLog: (page = 1, per_page = 50) =>
    request<{ success: boolean; data: { entries: AuditLogEntry[]; page: number; perPage: number; total: number } }>(
      `/api/admin/audit-log?page=${page}&per_page=${per_page}`
    ),
};

// ─── Superadmin — Task-type notification routing ─────────────────────────────
export type NotificationConfig = { taskType: string; email: string; updatedAt: string };
export const notificationConfigsApi = {
  list: () => request<{ success: boolean; data: NotificationConfig[] }>("/api/admin/notification-configs"),
  save: (taskType: string, email: string) =>
    request<{ success: boolean; data: NotificationConfig }>(`/api/admin/notification-configs/${taskType}`, {
      method: "PUT", body: JSON.stringify({ email }),
    }),
  remove: (taskType: string) =>
    request<{ success: boolean }>(`/api/admin/notification-configs/${taskType}`, { method: "DELETE" }),
};

// ─── Admin — Clients ──────────────────────────────────────────────────────────
export const clientsApi = {
  list: (search = "", page = 1, per_page = 50) =>
    request<{ success: boolean; data: ApiClient[]; pagination: { total_items: number } }>(
      `/api/admin/clients?search=${encodeURIComponent(search)}&page=${page}&per_page=${per_page}`,
    ),
  get: (id: string) =>
    request<{ success: boolean; data: ApiClient }>(`/api/admin/clients/${id}`),
  create: (body: { email: string; name: string; phone?: string; occupation?: string }) =>
    request<{ success: boolean; data: ApiClient & { inviteSent?: boolean; inviteExpiresAt?: string } }>("/api/admin/clients", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/api/admin/clients/${id}`, { method: "DELETE" }),
};

// ─── Admin — Tasks ────────────────────────────────────────────────────────────
export const tasksApi = {
  listAll: (params: { clientId?: string; adminStatus?: string; status?: string; taskType?: string; clientProgress?: string; page?: number; per_page?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.clientId)       q.set("clientId", params.clientId);
    if (params.adminStatus)    q.set("adminStatus", params.adminStatus);
    if (params.status)         q.set("status", params.status);
    if (params.taskType)       q.set("taskType", params.taskType);
    if (params.clientProgress) q.set("clientProgress", params.clientProgress);
    q.set("page", String(params.page ?? 1));
    q.set("per_page", String(params.per_page ?? 50));
    return request<{ success: boolean; data: ApiTask[]; pagination: { total_items: number } }>(`/api/admin/tasks?${q}`);
  },
  listForClient: (clientId: string) =>
    request<{ success: boolean; data: ApiTask[] }>(`/api/admin/clients/${clientId}/tasks`),
  /** Active (`closed:false`) or Closed (`closed:true`) half of a client's tasks, paged. */
  listForClientByState: (clientId: string, closed: boolean, page = 1, per_page = 10) =>
    request<{ success: boolean; data: ApiTask[]; pagination: { page: number; per_page: number; total_items: number; total_pages: number } }>(
      `/api/admin/clients/${clientId}/tasks?closed=${closed}&page=${page}&per_page=${per_page}`
    ),
  create: (clientId: string, body: {
    title?: string; description?: string; instructions?: string;
    taskType?: TaskType | string;
    selectedSubtasks?: string[];
    priority?: TaskPriority;
    adminStatus?: AdminStatus | string;
    assignedTo?: string | null;
    config?: Record<string, unknown>; metadata?: object;
    formFields?: ConfigFieldDef[];
    documentRequirements?: { key: string; quantity: number }[];
    documentRequests?: Partial<TaskDocRequest>[];
    taxYear?: number; dueDate?: string; openDate?: string;
  }) =>
    request<{ success: boolean; data: ApiTaskWithConfig }>(`/api/admin/clients/${clientId}/tasks`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (taskId: string, body: { adminStatus?: string; title?: string; description?: string | null; status?: string; dueDate?: string | null; openDate?: string | null; assignedTo?: string | null; config?: Record<string, unknown>; documentRequirements?: { key: string; quantity: number }[]; documentRequests?: Partial<TaskDocRequest>[]; metadata?: object }) =>
    request<{ success: boolean; data: ApiTaskWithConfig }>(`/api/admin/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (taskId: string) =>
    request<{ success: boolean }>(`/api/admin/tasks/${taskId}`, { method: "DELETE" }),

  /** Admin-side "mark as done" — moves the task to Closed without touching the client's status. */
  close: (taskId: string, note?: string) =>
    request<{ success: boolean; data: ApiTask }>(`/api/admin/tasks/${taskId}/close`, {
      method: "POST", body: JSON.stringify({ note }),
    }),
  reopen: (taskId: string) =>
    request<{ success: boolean; data: ApiTask }>(`/api/admin/tasks/${taskId}/reopen`, { method: "POST" }),

  advanceSubtask: (taskId: string, subtaskName: string) =>
    request<{ success: boolean; data: { taskId: string; previousSubtask: string; currentSubtask: string; previousProgress: string; clientProgress: string; taskStatus: string; isTerminal: boolean } }>(`/api/admin/tasks/${taskId}/subtask`, {
      method: "PATCH",
      body: JSON.stringify({ subtaskName }),
    }),
  getSubtasks: (taskId: string) =>
    request<{ success: boolean; data: { taskId: string; taskType: string; workflow: string; subtasks: SubtaskInfo[] } }>(`/api/admin/tasks/${taskId}/subtasks`),
  getActivity: (taskId: string) =>
    request<{ success: boolean; data: ActivityLogEntry[] }>(`/api/admin/tasks/${taskId}/activity`),
};

// ─── Admin — Meta ────────────────────────────────────────────────────────────
export interface DocumentTypeCatalogItem {
  key: string;
  label: string;
  group: string | null;
  required?: boolean;
}

export const metaApi = {
  getTaskTypes: () =>
    request<{ success: boolean; data: TaskTypeInfo[] }>("/api/admin/meta/task-types"),
  getClientProgressValues: () =>
    request<{ success: boolean; data: string[] }>("/api/admin/meta/client-progress-values"),
  getDocumentTypes: () =>
    request<{ success: boolean; data: { general: DocumentTypeCatalogItem[]; sales: { label: string; items: DocumentTypeCatalogItem[] }; all: DocumentTypeCatalogItem[] } }>(
      "/api/admin/meta/document-types",
    ),
};

// ─── Admin — Dashboard ────────────────────────────────────────────────────────
export const dashboardApi = {
  get: () =>
    request<{ success: boolean; data: { totalClients: number; totalTasks: number; pendingTasks: number; completedTasks: number; statusBreakdown: { adminStatus: string; count: number }[] } }>("/api/admin/dashboard"),
};

// ─── Admin — Templates ────────────────────────────────────────────────────────
export const templatesApi = {
  list: (params: { search?: string; isActive?: boolean; page?: number; per_page?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.search)  q.set("search", params.search);
    if (params.isActive !== undefined) q.set("isActive", String(params.isActive));
    q.set("page", String(params.page ?? 1));
    q.set("per_page", String(params.per_page ?? 50));
    return request<{ success: boolean; data: import("./formTypes").TaskTemplate[]; pagination: { total_items: number } }>(`/api/admin/templates?${q}`);
  },
  get: (id: string) =>
    request<{ success: boolean; data: import("./formTypes").TaskTemplate }>(`/api/admin/templates/${id}`),
  create: (body: { name: string; description?: string; taskType?: string; category?: string }) =>
    request<{ success: boolean; data: import("./formTypes").TaskTemplate }>("/api/admin/templates", {
      method: "POST", body: JSON.stringify(body),
    }),
  update: (id: string, body: { name?: string; description?: string; category?: string; isActive?: boolean }) =>
    request<{ success: boolean; data: import("./formTypes").TaskTemplate }>(`/api/admin/templates/${id}`, {
      method: "PATCH", body: JSON.stringify(body),
    }),
  archive: (id: string) =>
    request<{ success: boolean }>(`/api/admin/templates/${id}`, { method: "DELETE" }),
  createVersion: (templateId: string, formSchema: import("./formTypes").FormField[]) =>
    request<{ success: boolean; data: import("./formTypes").TemplateVersion }>(`/api/admin/templates/${templateId}/versions`, {
      method: "POST", body: JSON.stringify({ formSchema }),
    }),
  getVersion: (templateId: string, versionId: string) =>
    request<{ success: boolean; data: import("./formTypes").TemplateVersion }>(`/api/admin/templates/${templateId}/versions/${versionId}`),
  updateVersion: (templateId: string, versionId: string, formSchema: import("./formTypes").FormField[]) =>
    request<{ success: boolean; data: import("./formTypes").TemplateVersion }>(`/api/admin/templates/${templateId}/versions/${versionId}`, {
      method: "PATCH", body: JSON.stringify({ formSchema }),
    }),
  publishVersion: (templateId: string, versionId: string) =>
    request<{ success: boolean }>(`/api/admin/templates/${templateId}/versions/${versionId}/publish`, {
      method: "POST", body: "{}",
    }),
};

// ─── Admin — Submissions ──────────────────────────────────────────────────────
export const submissionsApi = {
  list: (params: { clientId?: string; status?: string; taskId?: string; page?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.clientId) q.set("clientId", params.clientId);
    if (params.status)   q.set("status", params.status);
    if (params.taskId)   q.set("taskId", params.taskId);
    q.set("page", String(params.page ?? 1));
    return request<{ success: boolean; data: (import("./formTypes").TaskSubmission & { taskTitle?: string; clientName?: string })[]; pagination: { total_items: number } }>(`/api/admin/submissions?${q}`);
  },
  get: (id: string) =>
    request<{ success: boolean; data: import("./formTypes").TaskSubmission & { taskTitle?: string; clientName?: string; templateVersion?: import("./formTypes").TemplateVersion } }>(`/api/admin/submissions/${id}`),
  forTask: (taskId: string) =>
    request<{ success: boolean; data: import("./formTypes").TaskSubmission & { templateVersion?: import("./formTypes").TemplateVersion } }>(`/api/admin/submissions/task/${taskId}`),
  review: (id: string, body: { status: "reviewed" | "rejected"; reviewNotes?: string }) =>
    request<{ success: boolean; data: import("./formTypes").TaskSubmission }>(`/api/admin/submissions/${id}/review`, {
      method: "PATCH", body: JSON.stringify(body),
    }),
};

// ─── Admin — Clients extra ────────────────────────────────────────────────────
export const inviteApi = {
  resend: (clientId: string) =>
    request<{ success: boolean; data: { inviteExpiresAt: string } }>(`/api/admin/clients/${clientId}/resend-invite`, {
      method: "POST", body: "{}",
    }),
};

// ─── Client — Tasks ──────────────────────────────────────────────────────────
export const clientTasksApi = {
  list: (status = "all", page = 1, per_page = 20) =>
    request<{ success: boolean; data: ClientTask[]; pagination: { total_items: number } }>(
      `/v3/api/v1/tasks?status=${status}&page=${page}&per_page=${per_page}`,
    ),
  get: (taskId: string) =>
    request<{ success: boolean; data: ClientTask }>(`/v3/api/v1/tasks/${taskId}`),
  getDetails: (taskId: string) =>
    request<{ success: boolean; data: ClientTaskDetails }>(`/v3/api/v1/tasks/${taskId}/details`),
  saveConfig: (taskId: string, config: Record<string, unknown>) =>
    request<{ success: boolean; data: { taskId: string; config: Record<string, unknown>; configSchema: ConfigFieldDef[]; updatedAt: string } }>(
      `/v3/api/v1/tasks/${taskId}/config`,
      { method: "PATCH", body: JSON.stringify({ config }) },
    ),
  getDocumentRequirements: (taskId: string) =>
    request<{ success: boolean; data: { taskId: string; requirements: DocumentRequirement[]; summary: { totalSlots: number; uploadedSlots: number; pendingSlots: number; complete: boolean } } }>(
      `/v3/api/v1/tasks/${taskId}/document-buckets`,
    ),
  uploadDocument: (taskId: string, file: File, category: string, slotIndex: number) => {
    const form = new FormData();
    form.append("file", file);
    form.append("category", category);
    form.append("slotIndex", String(slotIndex));
    return request<{ success: boolean; data: { id: string; category: string; slotIndex: number; fileName: string } }>(
      `/v3/api/v1/tasks/${taskId}/documents/upload`,
      { method: "POST", body: form },
    );
  },
};

// ─── Admin — General Documentation ───────────────────────────────────────────
export const generalDocsAdminApi = {
  get: (clientId: string) =>
    request<{ success: boolean; data: GeneralDocStatus & { clientId: string; config: { enabled: boolean; fields: GeneralDocField[]; updatedAt: string } | null; uploadCount: number; uploads: GeneralDocUpload[] } }>(
      `/api/admin/clients/${clientId}/general-docs`
    ),
  save: (clientId: string, body: { enabled: boolean; fields: Partial<GeneralDocField>[] }) =>
    request<{ success: boolean; data: { clientId: string; enabled: boolean; fields: GeneralDocField[]; updatedAt: string } }>(
      `/api/admin/clients/${clientId}/general-docs`,
      { method: "PUT", body: JSON.stringify(body) }
    ),
  deleteUpload: (uploadId: string) =>
    request<{ success: boolean }>(`/api/admin/general-docs/uploads/${uploadId}`, { method: "DELETE" }),
  getDownloadUrl: (uploadId: string, forceDownload = false) =>
    request<{ success: boolean; data: { downloadUrl: string; fileName: string } }>(
      `/api/admin/general-docs/uploads/${uploadId}/download${forceDownload ? "?download=1" : ""}`
    ),
  requestReupload: (uploadId: string, reason?: string) =>
    request<{ success: boolean; data: { id: string; status: string; reuploadReason: string | null; reuploadRequestedAt: string | null } }>(
      `/api/admin/general-docs/uploads/${uploadId}/request-reupload`,
      { method: "POST", body: JSON.stringify({ reason }) }
    ),
};

// ─── Admin — Client Notes (internal, with optional image attachments) ────────
export type ClientNoteImage = {
  id: string;
  originalFilename: string;
  fileType: string | null;
  fileSize: number;
  uploadedAt: string;
};
export type ClientNote = {
  id: string;
  text: string;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
  images: ClientNoteImage[];
};
export const notesAdminApi = {
  list: (clientId: string) =>
    request<{ success: boolean; data: { clientId: string; notes: ClientNote[] } }>(
      `/api/admin/clients/${clientId}/notes`
    ),
  create: (clientId: string, text: string, images: File[] = []) => {
    const form = new FormData();
    form.append("text", text);
    images.forEach((f) => form.append("images", f));
    return request<{ success: boolean; data: ClientNote }>(
      `/api/admin/clients/${clientId}/notes`,
      { method: "POST", body: form }
    );
  },
  addImages: (noteId: string, images: File[]) => {
    const form = new FormData();
    images.forEach((f) => form.append("images", f));
    return request<{ success: boolean; data: ClientNoteImage[] }>(
      `/api/admin/notes/${noteId}/images`,
      { method: "POST", body: form }
    );
  },
  deleteImage: (imageId: string) =>
    request<{ success: boolean }>(`/api/admin/notes/images/${imageId}`, { method: "DELETE" }),
  getImageDownloadUrl: (imageId: string) =>
    request<{ success: boolean; data: { downloadUrl: string; fileName: string } }>(
      `/api/admin/notes/images/${imageId}/download`
    ),
};

// ─── Admin — Task Detail (comments, attachments, activity) ──────────────────
export type TaskComment = {
  id: string;
  text: string;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
};
export type TaskAttachment = {
  id: string;
  originalFilename: string;
  fileType: string | null;
  fileSize: number;
  uploadedByName: string | null;
  uploadedAt: string;
};
export type TaskActivityEntry = {
  id: string;
  action: string;
  fromSubtask: string | null;
  toSubtask: string | null;
  fromProgress: string | null;
  toProgress: string | null;
  performedBy: string | null;
  performedByName: string | null;
  notes: string | null;
  createdAt: string;
};
export type TaskDetail = {
  taskId: string;
  comments: TaskComment[];
  attachments: TaskAttachment[];
  activity: TaskActivityEntry[];
};

export const taskDetailApi = {
  get: (taskId: string) =>
    request<{ success: boolean; data: TaskDetail }>(`/api/admin/tasks/${taskId}/detail`),
  addComment: (taskId: string, text: string) =>
    request<{ success: boolean; data: TaskComment }>(`/api/admin/tasks/${taskId}/comments`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  uploadAttachments: (taskId: string, files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    return request<{ success: boolean; data: TaskAttachment[] }>(
      `/api/admin/tasks/${taskId}/attachments`,
      { method: "POST", body: form }
    );
  },
  deleteAttachment: (attachmentId: string) =>
    request<{ success: boolean }>(`/api/admin/attachments/${attachmentId}`, { method: "DELETE" }),
  getAttachmentDownloadUrl: (attachmentId: string) =>
    request<{ success: boolean; data: { downloadUrl: string; fileName: string } }>(
      `/api/admin/attachments/${attachmentId}/download`
    ),
};

// ─── Admin — Task document requests + the client's uploads against them ─────
//
// Same shape as GeneralDocField, but configured per task rather than per
// client, and stored in tasks.metadata.documentRequests. Asking for the same
// kind of document twice is the point: two "Business Bank Statements" rows
// (…0010 and …0547) are two independent requests with their own keys.
export type TaskDocRequest = {
  key: string;
  name: string;
  placeholder: string;
  required: boolean;
  maxCount: number;
  acceptedTypes: string[];
  notes: string;
  displayOrder: number;
};

export type TaskDocRequirement = TaskDocRequest & {
  label: string;
  category: string;
  quantity: number;
  uploadedCount: number;
  pendingCount: number;
  slots: Array<{
    slotIndex: number;
    label: string;
    status: "uploaded" | "pending";
    uploadedFile: { id: string; fileName: string; fileSize: number; fileType: string | null; uploadedAt: string } | null;
  }>;
};

export type TaskDocUpload = {
  id: string;
  category: string;
  slotIndex: number;
  fileName: string;
  originalFilename: string;
  fileType: string | null;
  fileSize: number;
  hasFile: boolean;
  uploadedAt: string;
};

/**
 * Narrowed ask recorded once some documents have arrived (admin_status
 * "Partial Data received"): which requests are still outstanding, for which
 * period, and the note the client sees. Chaser emails switch wording once set.
 */
export type MissingDataRequest = {
  period: string | null;
  note: string | null;
  outstandingKeys: string[];
  requestedAt: string | null;
  requestedByName?: string | null;
};

export const taskDocsApi = {
  get: (taskId: string) =>
    request<{ success: boolean; data: { taskId: string; requirements: TaskDocRequirement[]; uploads: TaskDocUpload[]; uploadCount: number; missingDataRequest: MissingDataRequest | null } }>(
      `/api/admin/tasks/${taskId}/documents`
    ),
  saveMissingDataRequest: (taskId: string, body: { period?: string; note?: string; outstandingKeys?: string[]; sendEmail?: boolean }) =>
    request<{ success: boolean; message: string; data: ApiTask & { missingDataRequest: MissingDataRequest; emailed: boolean; emailError: string | null } }>(
      `/api/admin/tasks/${taskId}/missing-data-request`,
      { method: "POST", body: JSON.stringify(body) }
    ),
  clearMissingDataRequest: (taskId: string) =>
    request<{ success: boolean; data: ApiTask }>(
      `/api/admin/tasks/${taskId}/missing-data-request`, { method: "DELETE" }
    ),
  getDownloadUrl: (documentId: string, forceDownload = false) =>
    request<{ success: boolean; data: { downloadUrl: string; fileName: string } }>(
      `/api/admin/task-documents/${documentId}/download${forceDownload ? "?download=1" : ""}`
    ),
  /** Archive URL. The route streams a zip, so it is opened directly rather than fetched as JSON. */
  archiveUrl: (taskId: string) => `${API_BASE}/api/admin/tasks/${taskId}/documents/archive`,
  /**
   * The archive route needs the Authorization header, which a plain
   * window.open can't send — fetch it as a blob and save that instead.
   */
  downloadArchive: async (taskId: string, suggestedName: string) => {
    const res = await fetch(taskDocsApi.archiveUrl(taskId), {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) {
      const msg = await res.json().catch(() => null);
      throw new Error(msg?.message ?? "Could not build the archive");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

// ─── Admin — Assignable staff ────────────────────────────────────────────────
export type AssignableAdmin = { id: string; name: string; email: string };
export const assignableAdminsApi = {
  list: () => request<{ success: boolean; data: AssignableAdmin[] }>("/api/admin/assignable-admins"),
};

// ─── Admin — On-Boarding Details ─────────────────────────────────────────────
export type OnboardingField = {
  key: string;
  label: string;
  type: string; // text | textarea | number | date | select | ack | group
  required?: boolean;
  placeholder?: string;
  remarkLabel?: string;
  options?: string[];
  repeatable?: boolean;
  minItems?: number;
  itemLabel?: string;
  fields?: OnboardingField[];
  /** Shown only when another field in the same section/tab has this value — e.g. hst_quarter_option only when hst_period is "Quarterly". */
  dependsOn?: { field: string; value: string };
};
export type OnboardingSection = {
  key: string;
  title: string;
  description?: string;
  /** When set, this section renders on its own client tab of that slug rather than inline in the form. */
  tab?: string;
  /** The answer that has to match for the section's tab to be offered at all. */
  showWhen?: { field: string; value: string };
  fields: OnboardingField[];
};
export type OnboardingSchema = {
  version: number;
  title: string;
  subtitle: string;
  sections: OnboardingSection[];
};
export type OnboardingSubmission = {
  answers: Record<string, unknown>;
  status: string; // not_started | draft | submitted
  submittedAt: string | null;
  updatedAt: string | null;
};
export const onboardingAdminApi = {
  get: (clientId: string) =>
    request<{ success: boolean; data: { clientId: string; schema: OnboardingSchema; submission: OnboardingSubmission } }>(
      `/api/admin/clients/${clientId}/onboarding`
    ),
};

export type ClientTakeOnSubmission = {
  answers: Record<string, unknown>;
  status: string; // not_started | draft | submitted
  submittedAt: string | null;
  updatedAt: string | null;
};
export const clientTakeOnAdminApi = {
  get: (clientId: string) =>
    request<{ success: boolean; data: { clientId: string; schema: OnboardingSchema; submission: ClientTakeOnSubmission } }>(
      `/api/admin/clients/${clientId}/client-take-on`
    ),
  save: (clientId: string, body: { answers: Record<string, unknown>; submit: boolean }) =>
    request<{ success: boolean; data: ClientTakeOnSubmission }>(
      `/api/admin/clients/${clientId}/client-take-on`,
      { method: "PUT", body: JSON.stringify(body) }
    ),
};

// ─── Admin — Profiles ─────────────────────────────────────────────────────────
export const profilesAdminApi = {
  list: (clientId: string) =>
    request<{ success: boolean; data: UserProfile[] }>(`/api/admin/clients/${clientId}/profiles`),
  create: (clientId: string, body: { profileName: string; businessName?: string; profileType?: string; isDefault?: boolean }) =>
    request<{ success: boolean; data: UserProfile }>(`/api/admin/clients/${clientId}/profiles`, {
      method: "POST", body: JSON.stringify(body),
    }),
  update: (profileId: string, body: { profileName?: string; businessName?: string; isDefault?: boolean }) =>
    request<{ success: boolean; data: UserProfile }>(`/api/admin/profiles/${profileId}`, {
      method: "PATCH", body: JSON.stringify(body),
    }),
  delete: (profileId: string) =>
    request<{ success: boolean }>(`/api/admin/profiles/${profileId}`, { method: "DELETE" }),
};

// ─── Client — Forms ──────────────────────────────────────────────────────────
export const clientFormsApi = {
  getForm: (taskId: string) =>
    request<{ success: boolean; data: { taskId: string; title: string; description: string | null; status: string; formSchema: import("./formTypes").FormField[]; submission: import("./formTypes").TaskSubmission | null } }>(`/v3/api/v1/tasks/${taskId}/form`),
  saveDraft: (taskId: string, formData: Record<string, unknown>, attachments: import("./formTypes").Attachment[]) =>
    request<{ success: boolean; data: import("./formTypes").TaskSubmission }>(`/v3/api/v1/tasks/${taskId}/form/draft`, {
      method: "PUT", body: JSON.stringify({ formData, attachments }),
    }),
  submit: (taskId: string, formData: Record<string, unknown>, attachments: import("./formTypes").Attachment[]) =>
    request<{ success: boolean; data: { submissionId: string; status: string; submittedAt: string } }>(`/v3/api/v1/tasks/${taskId}/form/submit`, {
      method: "POST", body: JSON.stringify({ formData, attachments }),
    }),
  listSubmissions: (page = 1) =>
    request<{ success: boolean; data: (import("./formTypes").TaskSubmission & { taskTitle?: string })[] }>(`/v3/api/v1/submissions?page=${page}`),
  getSubmission: (id: string) =>
    request<{ success: boolean; data: import("./formTypes").TaskSubmission & { taskTitle?: string; templateVersion?: import("./formTypes").TemplateVersion } }>(`/v3/api/v1/submissions/${id}`),
};
