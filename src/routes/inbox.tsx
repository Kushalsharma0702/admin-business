import { createFileRoute } from "@tanstack/react-router";
import { ListPage } from "@/components/app/ListPage";
import { useAppStore } from "@/store/useAppStore";
import { Card } from "@/components/ui/card";
import { Bell, CheckCircle2, FileText, AlertCircle } from "lucide-react";
import { fmtDate } from "@/components/app/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/inbox")({ component: InboxPage });

function InboxPage() {
  const { activity, tasks } = useAppStore();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const notifications = [
    ...tasks.filter(t => t.status === "With Client").map(t => ({
      id: `n-${t.id}`,
      icon: AlertCircle,
      iconCls: "bg-amber-50 text-amber-600",
      title: `Task "${t.name}" is waiting on client`,
      time: fmtDate(t.dueDate),
      read: false,
    })),
    ...activity.map(a => ({
      id: `n-${a.id}`,
      icon: a.type === "task_completed" ? CheckCircle2 : a.type === "doc_captured" ? FileText : Bell,
      iconCls: a.type === "task_completed" ? "bg-emerald-50 text-emerald-600" : a.type === "doc_captured" ? "bg-orange-50 text-orange-600" : "bg-indigo-50 text-indigo-600",
      title: a.title,
      time: a.timestamp,
      read: true,
    })),
  ];

  const filtered = filter === "unread" ? notifications.filter(n => !n.read) : notifications;

  return (
    <ListPage title="Inbox" subtitle={`${notifications.filter(n => !n.read).length} unread`}>
      <div className="flex gap-2 mb-4">
        {(["all", "unread"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-sm rounded-md capitalize ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{f}</button>
        ))}
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => toast.success("All marked as read")}>Mark all read</Button>
      </div>
      <div className="space-y-2">
        {filtered.map(n => (
          <Card key={n.id} className={`p-4 flex items-center gap-3 ${!n.read ? "border-primary/30 bg-primary/[0.02]" : ""}`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${n.iconCls}`}>
              <n.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm ${!n.read ? "font-medium" : ""}`}>{n.title}</div>
              <div className="text-xs text-muted-foreground">{n.time}</div>
            </div>
            {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
          </Card>
        ))}
      </div>
    </ListPage>
  );
}
