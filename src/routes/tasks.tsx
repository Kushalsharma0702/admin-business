import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ListPage } from "@/components/app/ListPage";
import { useAppStore } from "@/store/useAppStore";
import { StatusBadge } from "@/components/app/StatusBadge";
import { ClientAvatar } from "@/components/app/ClientAvatar";
import { fmtDate } from "@/components/app/utils";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export const Route = createFileRoute("/tasks")({ component: TasksPage });

function TasksPage() {
  const navigate = useNavigate();
  const { tasks, clients } = useAppStore();
  const [tab, setTab] = useState<string>("All");
  const [q, setQ] = useState("");
  const statuses = ["All", "With Client", "In Progress", "Review", "Completed"];
  const filtered = tasks.filter(t =>
    (tab === "All" || t.status === tab) &&
    (t.name.toLowerCase().includes(q.toLowerCase()) || t.assignee.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <ListPage title="Tasks" subtitle={`${tasks.length} total tasks`}>
      <div className="flex gap-1 mb-3">
        {statuses.map(s => (
          <button key={s} onClick={() => setTab(s)} className={`px-3 py-1.5 text-sm rounded-md ${tab === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s}</button>
        ))}
      </div>
      <Input placeholder="Search tasks…" value={q} onChange={e => setQ(e.target.value)} className="max-w-sm mb-4" />
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">Status</th>
              <th className="text-left px-4 py-2.5 font-semibold">Task name</th>
              <th className="text-left px-4 py-2.5 font-semibold">Client</th>
              <th className="text-left px-4 py-2.5 font-semibold">Type</th>
              <th className="text-left px-4 py-2.5 font-semibold">Assignee</th>
              <th className="text-left px-4 py-2.5 font-semibold">Due</th>
              <th className="text-left px-4 py-2.5 font-semibold">Priority</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => {
              const client = clients.find(c => c.id === t.clientId);
              return (
                <tr key={t.id} onClick={() => navigate({ to: "/clients/$clientId/$tab", params: { clientId: t.clientId, tab: "tasks" } })} className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer">
                  <td className="px-4 py-2.5"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-2.5 font-medium">{t.name}</td>
                  <td className="px-4 py-2.5">
                    {client && <span className="flex items-center gap-2"><ClientAvatar name={client.name} size={22} />{client.name}</span>}
                  </td>
                  <td className="px-4 py-2.5">{t.type}</td>
                  <td className="px-4 py-2.5">{t.assignee}</td>
                  <td className="px-4 py-2.5">{fmtDate(t.dueDate)}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={t.priority} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ListPage>
  );
}
