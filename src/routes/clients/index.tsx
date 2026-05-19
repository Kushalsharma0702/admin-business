import { createFileRoute, Link } from "@tanstack/react-router";
import { ListPage } from "@/components/app/ListPage";
import { useAppStore } from "@/store/useAppStore";
import { ClientAvatar } from "@/components/app/ClientAvatar";
import { fmtDate } from "@/components/app/utils";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export const Route = createFileRoute("/clients/")({ component: ClientsList });

function ClientsList() {
  const clients = useAppStore((s) => s.clients);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "without" | "with">("all");
  const filtered = clients.filter((c) => {
    if (tab === "without" && c.portalStatus !== "none") return false;
    if (tab === "with" && c.portalStatus === "none") return false;
    return c.name.toLowerCase().includes(q.toLowerCase()) || c.email.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <ListPage title="Client Portals" subtitle={`${clients.length} clients`}>
      <div className="flex gap-6 border-b border-border mb-4 text-sm">
        {[
          { k: "all", l: "All client portal users" },
          { k: "without", l: "Without client portals" },
          { k: "with", l: "With portal users" },
        ].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k as typeof tab)}
            className={`pb-3 border-b-2 ${tab === t.k ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground"}`}>
            {t.l}
          </button>
        ))}
      </div>
      <Input placeholder="Search clients…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm mb-4" />
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">Client name</th>
              <th className="text-left px-4 py-2.5 font-semibold">Email</th>
              <th className="text-left px-4 py-2.5 font-semibold">Client type</th>
              <th className="text-left px-4 py-2.5 font-semibold">Created on</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="px-4 py-3">
                  <Link to="/clients/$clientId/$tab" params={{ clientId: c.id, tab: "home" }} className="flex items-center gap-2.5 text-primary font-medium hover:underline">
                    <ClientAvatar name={c.name} size={28} />
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{c.email || "—"}</td>
                <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">{c.type}</span></td>
                <td className="px-4 py-3 text-muted-foreground">{fmtDate(c.createdOn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ListPage>
  );
}