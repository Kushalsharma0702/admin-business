import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ListPage } from "@/components/app/ListPage";
import { ClientAvatar } from "@/components/app/ClientAvatar";
import { Input } from "@/components/ui/input";
import { useState, type ReactNode } from "react";
import { tasksApi, assignableAdminsApi, ADMIN_STATUSES, type ApiTask } from "@/lib/api";
import { Loader2, WifiOff } from "lucide-react";
import { fmtDate, taskFrequency } from "@/components/app/utils";

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

// A heading above its control, so it's clear which filter is which even once
// a value is picked (a bare <select> only shows the selected text, not what
// it's a filter FOR).
function FilterField({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{heading}</span>
      {children}
    </div>
  );
}

// Removable tag for a currently-applied filter - lets the admin see every
// active filter at a glance (not just whichever dropdown/input they're
// looking at) and clear one without hunting for its control.
function FilterTag({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full pl-2.5 pr-1 py-1 font-medium">
      {label}
      <button onClick={onClear} aria-label={`Clear ${label} filter`} className="rounded-full hover:bg-primary/20 w-4 h-4 inline-flex items-center justify-center">×</button>
    </span>
  );
}

function TasksPage() {
  const navigate = useNavigate();
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>("All");
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>("All");
  const [q, setQ] = useState("");
  const [periodEndFrom, setPeriodEndFrom] = useState("");
  const [periodEndTo, setPeriodEndTo] = useState("");
  const [dueDateFrom, setDueDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState("All");
  const [processingTeamFilter, setProcessingTeamFilter] = useState("All");
  const [supportTeamFilter, setSupportTeamFilter] = useState("All");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-tasks"],
    queryFn: () => tasksApi.listAll({ per_page: 100 }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const { data: adminsRes } = useQuery({
    queryKey: ["assignable-admins"],
    queryFn: () => assignableAdminsApi.list(),
    staleTime: 60_000,
  });
  const assignableAdmins = adminsRes?.data ?? [];

  const all: ApiTask[] = data?.data ?? [];
  const taskTypes = Array.from(new Set(all.map((t) => t.taskType).filter((t): t is string => !!t))).sort();
  const frequencies = Array.from(new Set(all.map((t) => taskFrequency(t)).filter((f) => f !== "—"))).sort();
  // Every admin/superadmin, not just the ones already assigned to a task -
  // the same roster the task edit panel's Processing/Support team dropdowns use.
  const teamNames = assignableAdmins.map((a) => a.name).sort();
  const filtered = all.filter((t) =>
    (adminStatusFilter === "All" || t.adminStatus === adminStatusFilter) &&
    (taskTypeFilter === "All" || t.taskType === taskTypeFilter) &&
    (frequencyFilter === "All" || taskFrequency(t) === frequencyFilter) &&
    (processingTeamFilter === "All" || t.assignedToName === processingTeamFilter) &&
    (supportTeamFilter === "All" || t.supportAssignedToName === supportTeamFilter) &&
    (!periodEndFrom || (!!t.periodEnd && t.periodEnd >= periodEndFrom)) &&
    (!periodEndTo || (!!t.periodEnd && t.periodEnd <= periodEndTo)) &&
    (!dueDateFrom || (!!t.dueDate && t.dueDate >= dueDateFrom)) &&
    (!dueDateTo || (!!t.dueDate && t.dueDate <= dueDateTo)) &&
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

      <div className="flex flex-wrap items-end gap-3 mb-3">
        <FilterField heading="Search">
          <Input placeholder="Search tasks or client…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm h-9" />
        </FilterField>
        <FilterField heading="Task type">
          <select
            value={taskTypeFilter}
            onChange={(e) => setTaskTypeFilter(e.target.value)}
            className="h-9 text-sm border border-border rounded-md px-2 bg-background text-foreground"
          >
            <option value="All">All task types</option>
            {taskTypes.map((tt) => <option key={tt} value={tt}>{tt}</option>)}
          </select>
        </FilterField>
        <FilterField heading="Frequency">
          <select
            value={frequencyFilter}
            onChange={(e) => setFrequencyFilter(e.target.value)}
            className="h-9 text-sm border border-border rounded-md px-2 bg-background text-foreground"
          >
            <option value="All">All frequencies</option>
            {frequencies.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </FilterField>
        <FilterField heading="Processing team">
          <select
            value={processingTeamFilter}
            onChange={(e) => setProcessingTeamFilter(e.target.value)}
            className="h-9 text-sm border border-border rounded-md px-2 bg-background text-foreground"
          >
            <option value="All">All processing team</option>
            {teamNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </FilterField>
        <FilterField heading="Support team">
          <select
            value={supportTeamFilter}
            onChange={(e) => setSupportTeamFilter(e.target.value)}
            className="h-9 text-sm border border-border rounded-md px-2 bg-background text-foreground"
          >
            <option value="All">All support team</option>
            {teamNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </FilterField>
        <FilterField heading="Period end">
          <div className="flex items-center gap-1.5 text-sm">
            <Input type="date" value={periodEndFrom} onChange={(e) => setPeriodEndFrom(e.target.value)}
              className="h-9 w-[150px]" aria-label="Period end from" />
            <span className="text-muted-foreground">to</span>
            <Input type="date" value={periodEndTo} onChange={(e) => setPeriodEndTo(e.target.value)}
              className="h-9 w-[150px]" aria-label="Period end to" />
          </div>
        </FilterField>
        <FilterField heading="Due date">
          <div className="flex items-center gap-1.5 text-sm">
            <Input type="date" value={dueDateFrom} onChange={(e) => setDueDateFrom(e.target.value)}
              className="h-9 w-[150px]" aria-label="Due date from" />
            <span className="text-muted-foreground">to</span>
            <Input type="date" value={dueDateTo} onChange={(e) => setDueDateTo(e.target.value)}
              className="h-9 w-[150px]" aria-label="Due date to" />
          </div>
        </FilterField>
      </div>

      {/* Active-filter tags - what's actually applied, at a glance, each clearable on its own */}
      {(taskTypeFilter !== "All" || frequencyFilter !== "All" || processingTeamFilter !== "All" || supportTeamFilter !== "All"
        || periodEndFrom || periodEndTo || dueDateFrom || dueDateTo || q) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {q && <FilterTag label={`Search: ${q}`} onClear={() => setQ("")} />}
          {taskTypeFilter !== "All" && <FilterTag label={`Type: ${taskTypeFilter}`} onClear={() => setTaskTypeFilter("All")} />}
          {frequencyFilter !== "All" && <FilterTag label={`Frequency: ${frequencyFilter}`} onClear={() => setFrequencyFilter("All")} />}
          {processingTeamFilter !== "All" && <FilterTag label={`Processing team: ${processingTeamFilter}`} onClear={() => setProcessingTeamFilter("All")} />}
          {supportTeamFilter !== "All" && <FilterTag label={`Support team: ${supportTeamFilter}`} onClear={() => setSupportTeamFilter("All")} />}
          {(periodEndFrom || periodEndTo) && (
            <FilterTag
              label={`Period end: ${periodEndFrom || "…"} to ${periodEndTo || "…"}`}
              onClear={() => { setPeriodEndFrom(""); setPeriodEndTo(""); }}
            />
          )}
          {(dueDateFrom || dueDateTo) && (
            <FilterTag
              label={`Due date: ${dueDateFrom || "…"} to ${dueDateTo || "…"}`}
              onClear={() => { setDueDateFrom(""); setDueDateTo(""); }}
            />
          )}
          <button
            onClick={() => {
              setQ(""); setTaskTypeFilter("All"); setFrequencyFilter("All");
              setProcessingTeamFilter("All"); setSupportTeamFilter("All");
              setPeriodEndFrom(""); setPeriodEndTo(""); setDueDateFrom(""); setDueDateTo("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1"
          >
            Clear all
          </button>
        </div>
      )}

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
                <th className="text-left px-4 py-2.5">Frequency</th>
                <th className="text-left px-4 py-2.5">Period End</th>
                <th className="text-left px-4 py-2.5">Due Date</th>
                <th className="text-left px-4 py-2.5">Client Status</th>
                <th className="text-left px-4 py-2.5">Processing Team</th>
                <th className="text-left px-4 py-2.5">Support Team</th>
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
                  <td className="px-4 py-2.5 text-muted-foreground">{taskFrequency(t)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{t.periodEnd ? fmtDate(t.periodEnd) : "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{t.dueDate ? fmtDate(t.dueDate) : "—"}</td>
                  <td className="px-4 py-2.5"><ClientStatusBadge status={t.status} /></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{t.assignedToName ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{t.supportAssignedToName ?? "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">No tasks found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </ListPage>
  );
}
