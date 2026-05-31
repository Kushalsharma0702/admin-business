// src/lib/api.ts — typed fetch client for the TaxEase backend
export const API_BASE = "http://localhost:3001";

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
  "Filed",
] as const;

export type AdminStatus = (typeof ADMIN_STATUSES)[number];

export interface ApiTask {
  id: string;
  clientId: string;
  assignedBy: string | null;
  title: string;
  description: string | null;
  status: "pending" | "complete";
  adminStatus: AdminStatus;
  taskType: string | null;
  metadata: Record<string, unknown>;
  completionNote: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // admin-list extras
  clientName?: string;
  clientEmail?: string;
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
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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

// ─── Admin — Clients ──────────────────────────────────────────────────────────
export const clientsApi = {
  list: (search = "", page = 1, per_page = 50) =>
    request<{ success: boolean; data: ApiClient[]; pagination: { total_items: number } }>(
      `/api/admin/clients?search=${encodeURIComponent(search)}&page=${page}&per_page=${per_page}`,
    ),
  get: (id: string) =>
    request<{ success: boolean; data: ApiClient }>(`/api/admin/clients/${id}`),
  create: (body: { email: string; name: string; password?: string; phone?: string; occupation?: string }) =>
    request<{ success: boolean; data: ApiClient }>("/api/admin/clients", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// ─── Admin — Tasks ────────────────────────────────────────────────────────────
export const tasksApi = {
  listAll: (params: { clientId?: string; adminStatus?: string; status?: string; page?: number; per_page?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.clientId) q.set("clientId", params.clientId);
    if (params.adminStatus) q.set("adminStatus", params.adminStatus);
    if (params.status) q.set("status", params.status);
    q.set("page", String(params.page ?? 1));
    q.set("per_page", String(params.per_page ?? 50));
    return request<{ success: boolean; data: ApiTask[]; pagination: { total_items: number } }>(`/api/admin/tasks?${q}`);
  },
  listForClient: (clientId: string) =>
    request<{ success: boolean; data: ApiTask[] }>(`/api/admin/clients/${clientId}/tasks`),
  create: (clientId: string, body: { title: string; description?: string; taskType?: string; adminStatus?: AdminStatus; metadata?: object }) =>
    request<{ success: boolean; data: ApiTask }>(`/api/admin/clients/${clientId}/tasks`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (taskId: string, body: { adminStatus?: AdminStatus; title?: string; description?: string; status?: string }) =>
    request<{ success: boolean; data: ApiTask }>(`/api/admin/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (taskId: string) =>
    request<{ success: boolean }>(`/api/admin/tasks/${taskId}`, { method: "DELETE" }),
};

// ─── Admin — Dashboard ────────────────────────────────────────────────────────
export const dashboardApi = {
  get: () =>
    request<{ success: boolean; data: { totalClients: number; totalTasks: number; pendingTasks: number; completedTasks: number; statusBreakdown: { admin_status: string; count: number }[] } }>("/api/admin/dashboard"),
};
