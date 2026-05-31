import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ListPage } from "@/components/app/ListPage";
import { ClientAvatar } from "@/components/app/ClientAvatar";
import { fmtDate } from "@/components/app/utils";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { clientsApi, type ApiClient } from "@/lib/api";
import { Loader2, WifiOff } from "lucide-react";

export const Route = createFileRoute("/clients/")({ component: ClientsList });

function ClientsList() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "without" | "with">("all");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-clients", q],
    queryFn: () => clientsApi.list(q, 1, 100),
    staleTime: 30_000,
  });

  const clients: ApiClient[] = data?.data ?? [];

  const filtered = clients.filter((c) => {
    if (tab === "without" && c.portalStatus !== "none") return false;
    if (tab === "with" && c.portalStatus === "none") return false;
    return true;
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

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading clients from backend…
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 text-destructive py-8 justify-center">
          <WifiOff className="w-4 h-4" /> Cannot connect to backend (http://localhost:3001). Is it running?
        </div>
      )}

      {!isLoading && !isError && (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Client name</th>
                <th className="text-left px-4 py-2.5 font-semibold">Email</th>
                <th className="text-left px-4 py-2.5 font-semibold">Portal status</th>
                <th className="text-left px-4 py-2.5 font-semibold">Client since</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link to="/clients/$clientId/$tab" params={{ clientId: c.id, tab: "home" }}
                      className="flex items-center gap-2.5 text-primary font-medium hover:underline">
                      <ClientAvatar name={c.name} size={28} />
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      c.portalStatus === "active" ? "bg-emerald-50 text-emerald-700" :
                      c.portalStatus === "pending" ? "bg-amber-50 text-amber-700" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {c.portalStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(c.clientSince)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No clients found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </ListPage>
  );
}
