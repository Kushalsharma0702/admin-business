import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useAppStore } from "@/store/useAppStore";
import { Card } from "@/components/ui/card";
import { Users, CheckSquare, FileSearch, DollarSign, Receipt, Link2, UserPlus, CheckCircle2 } from "lucide-react";
import { ClientAvatar } from "@/components/app/ClientAvatar";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from "recharts";
import { useState, useMemo } from "react";
import { fmtMoney, fmtDate } from "@/components/app/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({ component: DashboardPage });

function DashboardPage() {
  const navigate = useNavigate();
  const { clients, tasks, costs, sales, transactions, billing, activity, completeTask } = useAppStore();
  const [chartTab, setChartTab] = useState<"Costs" | "Sales" | "Bank">("Costs");

  const openTasks = tasks.filter((t) => t.status !== "Completed");
  const unmatchedDocs = costs.filter((c) => c.status === "To review").length + sales.filter((s) => s.status === "To review").length;
  const monthRev = billing.filter((b) => b.date.startsWith("2026-04")).reduce((a, b) => a + b.amount, 0);

  const taskStatusData = ["With Client", "In Progress", "Review", "Completed"].map((s) => ({
    status: s,
    count: tasks.filter((t) => t.status === s).length,
    fill: s === "With Client" ? "#D97706" : s === "In Progress" ? "#0EA5E9" : s === "Review" ? "#7C3AED" : "#16A34A",
  }));

  const week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const docsThisWeek = useMemo(() => {
    const data = chartTab === "Costs" ? costs : chartTab === "Sales" ? sales : transactions;
    return week.map((d, i) => ({ day: d, count: data.filter((_, idx) => idx % 7 === i).length }));
  }, [chartTab, costs, sales, transactions]);

  const overdue = (d?: string) => d && new Date(d) < new Date();

  const pendingItems = [
    ...openTasks.filter((t) => t.status === "With Client").slice(0, 3).map((t) => ({
      id: t.id, kind: "task" as const, title: t.name, sub: clients.find((c) => c.id === t.clientId)?.name ?? "", badge: overdue(t.dueDate) ? "Overdue" : "With client", color: overdue(t.dueDate) ? "destructive" : "warning",
      action: () => { completeTask(t.id); toast.success("Task marked complete"); },
      go: () => navigate({ to: "/clients/$clientId/$tab", params: { clientId: t.clientId, tab: "tasks" } }),
    })),
    ...costs.filter((c) => c.status === "To review").slice(0, 3).map((c) => ({
      id: c.id, kind: "cost" as const, title: c.supplier, sub: fmtMoney(c.total), badge: "To review", color: "warning",
      action: () => toast.success("Marked ready"),
      go: () => navigate({ to: "/costs" }),
    })),
  ];

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, Angela 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">Here's what's happening across your practice today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi icon={Users} label="Active Clients" value={clients.length} accent="bg-indigo-50 text-indigo-600" />
        <Kpi icon={CheckSquare} label="Open Tasks" value={openTasks.length} accent="bg-sky-50 text-sky-600" />
        <Kpi icon={FileSearch} label="Unmatched Documents" value={unmatchedDocs} accent="bg-amber-50 text-amber-600" />
        <Kpi icon={DollarSign} label="Monthly Revenue" value={fmtMoney(monthRev)} accent="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <Card className="lg:col-span-3 p-5">
          <h3 className="font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-1">
            {activity.map((a) => (
              <button
                key={a.id}
                onClick={() => a.clientId && navigate({ to: "/clients/$clientId/$tab", params: { clientId: a.clientId, tab: "home" } })}
                className="w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-muted text-left"
              >
                <ActivityIcon type={a.type} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.subtitle}</div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">{a.timestamp}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2 p-5">
          <h3 className="font-semibold text-foreground mb-4">Pending Actions</h3>
          <div className="space-y-2">
            {pendingItems.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-md border border-border">
                <div className="flex-1 min-w-0">
                  <button onClick={p.go} className="text-sm font-medium text-foreground hover:text-primary text-left truncate block">{p.title}</button>
                  <div className="text-xs text-muted-foreground">{p.sub}</div>
                </div>
                <StatusBadge status={p.badge} />
                <Button size="sm" variant="ghost" onClick={p.action}>Mark done</Button>
              </div>
            ))}
            <button onClick={() => navigate({ to: "/bank" })} className="w-full text-left p-2.5 rounded-md border border-border hover:bg-muted text-sm">
              <span className="font-medium">{transactions.filter((t) => !t.matched).length} unmatched bank transactions</span>
              <span className="text-primary ml-2">Review now →</span>
            </button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Tasks by status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskStatusData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis dataKey="status" type="category" stroke="#94a3b8" fontSize={12} width={90} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} onClick={(d) => navigate({ to: `/tasks`, search: { status: d.status } as never })} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Document capture this week</h3>
            <div className="flex gap-1 bg-muted rounded-md p-0.5">
              {(["Costs", "Sales", "Bank"] as const).map((t) => (
                <button key={t} onClick={() => setChartTab(t)} className={`px-3 py-1 text-xs rounded ${chartTab === t ? "bg-card shadow-sm font-medium" : "text-muted-foreground"}`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={docsThisWeek}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#4F46E5" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-4">Clients</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground uppercase">
              <tr className="border-b border-border">
                <th className="text-left font-medium py-2">Client</th>
                <th className="text-left font-medium py-2">Type</th>
                <th className="text-right font-medium py-2">Open tasks</th>
                <th className="text-right font-medium py-2">Unmatched docs</th>
                <th className="text-left font-medium py-2 pl-4">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const ot = tasks.filter((t) => t.clientId === c.id && t.status !== "Completed").length;
                const ud = costs.filter((x) => x.clientId === c.id && x.status === "To review").length;
                return (
                  <tr key={c.id} onClick={() => navigate({ to: "/clients/$clientId/$tab", params: { clientId: c.id, tab: "home" } })} className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <ClientAvatar name={c.name} size={28} />
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5"><span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">{c.type}</span></td>
                    <td className="py-2.5 text-right">{ot}</td>
                    <td className="py-2.5 text-right">{ud}</td>
                    <td className="py-2.5 pl-4 text-muted-foreground">{fmtDate(c.clientSince)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}

function Kpi({ icon: Icon, label, value, accent }: { icon: typeof Users; label: string; value: string | number; accent: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold mt-1">{value}</div>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const map = {
    client_added: { Icon: UserPlus, cls: "bg-indigo-50 text-indigo-600" },
    task_completed: { Icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-600" },
    doc_captured: { Icon: Receipt, cls: "bg-orange-50 text-orange-600" },
    txn_matched: { Icon: Link2, cls: "bg-sky-50 text-sky-600" },
  } as const;
  const v = map[type as keyof typeof map] || map.client_added;
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${v.cls}`}>
      <v.Icon className="w-4 h-4" />
    </div>
  );
}