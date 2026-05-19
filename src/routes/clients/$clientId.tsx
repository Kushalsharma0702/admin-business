import { createFileRoute, Link, Outlet, useParams, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useAppStore } from "@/store/useAppStore";
import { ClientAvatar } from "@/components/app/ClientAvatar";
import { Button } from "@/components/ui/button";
import { Star, Copy, Pencil } from "lucide-react";
import { fmtDate } from "@/components/app/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/clients/$clientId")({ component: ClientLayout });

const tabs = [
  ["home", "Home"], ["communication", "Communication"], ["notes", "Notes"], ["files", "Files"],
  ["tasks", "Tasks"], ["resolution-cases", "Resolution Cases"], ["organizers", "Organizers"],
  ["transcripts", "Transcripts"], ["billing", "Billing"], ["time-entries", "Time Entries"],
] as const;

function ClientLayout() {
  const { clientId } = useParams({ from: "/clients/$clientId" });
  const path = useRouterState({ select: (s) => s.location.pathname });
  const client = useAppStore((s) => s.clients.find((c) => c.id === clientId));
  if (!client) return <AppShell><div>Client not found. <Link to="/clients" className="text-primary">Back</Link></div></AppShell>;

  const age = client.dob ? new Date().getFullYear() - new Date(client.dob).getFullYear() : "";

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-4">
        <ClientAvatar name={client.name} size={40} />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{client.name}</h1>
            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">{client.type}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-5 border-b border-border mb-6 text-sm overflow-x-auto">
        {tabs.map(([slug, label]) => {
          const active = path.endsWith(`/${slug}`);
          return (
            <Link key={slug} from="/clients/$clientId" to="/clients/$clientId/$tab" params={{ clientId, tab: slug }} className={`pb-3 border-b-2 whitespace-nowrap ${active ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {label}
            </Link>
          );
        })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <aside className="space-y-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Client Portal</h3>
              <button className="text-xs text-primary">Done</button>
            </div>
            {client.portalStatus !== "none" ? (
              <div className="text-xs space-y-1.5">
                <div className="text-foreground font-medium">{client.name}</div>
                <div className="text-muted-foreground truncate">{client.portalEmail}</div>
                <div className="text-muted-foreground">Invite sent {fmtDate(client.portalInviteSent)}</div>
                <div className="flex items-center justify-between pt-2">
                  <button className="text-destructive text-xs">Remove access</button>
                  <button onClick={() => toast.success("Invite resent")} className="text-xs text-primary border border-border rounded px-2 py-1">Resend invite</button>
                </div>
              </div>
            ) : <div className="text-xs text-muted-foreground">No portal access</div>}
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2"><h3 className="font-semibold text-sm">Client Info</h3><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></div>
            <div className="space-y-2.5 text-xs">
              <Field label="Full name" value={client.name} />
              <div>
                <div className="text-muted-foreground uppercase text-[10px] font-semibold mb-0.5">Personal email</div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500" />
                  <a className="text-primary truncate flex-1" href={`mailto:${client.email}`}>{client.email || "—"}</a>
                  <Copy className="w-3 h-3 text-muted-foreground cursor-pointer" onClick={() => { navigator.clipboard.writeText(client.email); toast.success("Copied"); }} />
                </div>
              </div>
              <div>
                <div className="text-muted-foreground uppercase text-[10px] font-semibold mb-0.5">Mobile</div>
                <div className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500" /><span>{client.phone || "—"}</span></div>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2"><h3 className="font-semibold text-sm">About</h3><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></div>
            <div className="space-y-2.5 text-xs">
              <Field label="SSN/ITIN" value={client.ssn} />
              <Field label="DOB" value={`${fmtDate(client.dob)}${age ? ` (age ${age})` : ""}`} />
              <Field label="Occupation" value={client.occupation} />
              <Field label="Client since" value={fmtDate(client.clientSince)} />
              <Field label="Created on" value={fmtDate(client.createdOn)} />
            </div>
          </div>
        </aside>
        <div><Outlet /></div>
      </div>
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground uppercase text-[10px] font-semibold mb-0.5">{label}</div>
      <div className="text-foreground">{value || "—"}</div>
    </div>
  );
}