import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ListPage } from "@/components/app/ListPage";
import { ClientAvatar } from "@/components/app/ClientAvatar";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { tasksApi, ADMIN_STATUSES, type ApiTask } from "@/lib/api";
import { Loader2, WifiOff } from "lucide-react";
import { fmtDate } from "@/components/app/utils";

export const Route = createFileRoute("/tasks")({ component: TasksPage });

const ADMIN_STATUS_COLORS: Record<string, string> = {
  "Filed": "bg-emerald-100 text-emerald-800",
  "Approval received": "bg-emerald-50 text-emerald-700",
  "Review": "bg-blue-50 text-blue-700",
  "Work in Progress": "bg-blue-100 text-blue-800",
  "Query sent to client": "bg-amber-50 text-amber-700",
  "Query sent to Support team": "bg-amber-100 text-amber-800",
  "Sent for Approval to client": "bg-purple-50 text-purple-700",
  "Sent for Approval to support team": "bg-purple-100 text-purple-800",
  "Partial Query received": "bg-orange-50 text-orange-700",
  "Partial Data received": "bg-yellow-50 text-yellow-700",
  "Data not received": "bg-rose-50 text-rose-700",
  "Data Missing Closed": "bg-gray-100 text-gray-600",
  "On Hold": "bg-slate-100 text-slate-600",
  "Not to Do": "bg-gray-50 text-gray-500",
};

function AdminStatusBadge({ status }: { status: string }) {
  const cls = ADMIN_STATUS_COLORS[status] ?? "bg-muted text-muted-foreground";
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${cls}`}>{status}</span>;
}

function ClientStatusBadge({ status }: { status: string }) {
  return status === "complete"
    ? <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">Complete</span>
    : <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">Pending</span>;
}

function TasksPage() {
  const navigate = useNavigate();
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>("All");
  const [q, setQ] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-tasks"],
    queryFn: () => tasksApi.listAll({ per_page: 100 }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const all: ApiTask[] = data?.data ?? [];
  const filtered = all.filter((t) =>
    (adminStatusFilter === "All" || t.adminStatus === adminStatusFilter) &&
    (t.title.toLowerCase().includes(q.toLowerCase()) || (t.clientName ?? "").toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <ListPage title="Tasks" subtitle={`${all.length} total tasks`}>
      {/* Admin Status filter pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <button onClick={() => setAdminStatusFilter("All")}
          className={`px-3 py-1.5 text-xs rounded-full font-medium border ${adminStatusFilter === "All" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
          All
        </button>
        {ADMIN_STATUSES.map((s) => (
          <button key={s} onClick={() => setAdminStatusFilter(s)}
            className={`px-3 py-1.5 text-xs rounded-full font-medium border transition-colors ${adminStatusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
            {s}
          </button>
        ))}
      </div>

      <Input placeholder="Search tasks or client…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm mb-4" />

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading tasks from backend…
        </div>
      )}
      {isError && (
        <div className="flex items-center gap-2 text-destructive py-8 justify-center">
          <WifiOff className="w-4 h-4" /> Cannot connect to backend (http://localhost:3001).
        </div>
      )}

      {!isLoading && !isError && (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5">Admin Status</th>
                <th className="text-left px-4 py-2.5">Task</th>
                <th className="text-left px-4 py-2.5">Client</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Client Status</th>
                <th className="text-left px-4 py-2.5">Assigned</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}
                  onClick={() => navigate({ to: "/clients/$clientId/$tab", params: { clientId: t.clientId, tab: "tasks" } })}
                  className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer">
                  <td className="px-4 py-2.5"><AdminStatusBadge status={t.adminStatus} /></td>
                  <td className="px-4 py-2.5 font-medium max-w-[220px] truncate">{t.title}</td>
                  <td className="px-4 py-2.5">
                    {t.clientName && (
                      <span className="flex items-center gap-2">
                        <ClientAvatar name={t.clientName} size={22} />
                        <span className="truncate max-w-[140px]">{t.clientName}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{t.taskType ?? "—"}</td>
                  <td className="px-4 py-2.5"><ClientStatusBadge status={t.status} /></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(t.createdAt)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No tasks found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </ListPage>
  );
}
