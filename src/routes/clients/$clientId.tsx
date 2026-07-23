import { createFileRoute, Link, Outlet, useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app/AppShell";
import { clientsApi } from "@/lib/api";
import { ClientAvatar } from "@/components/app/ClientAvatar";
import { Star, Copy, Pencil, Loader2, Trash2 } from "lucide-react";
import { fmtDate } from "@/components/app/utils";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/clients/$clientId")({ component: ClientLayout });

const tabs = [
  ["home", "Home"], ["client-take-on", "Client Take-On"], ["onboarding", "On-Boarding"], ["general-docs", "General Docs"], ["tasks", "Tasks"],
  ["communication", "Communication"], ["notes", "Notes"], ["files", "Files"],
  ["resolution-cases", "Resolution Cases"], ["organizers", "Organizers"],
  ["transcripts", "Transcripts"], ["billing", "Billing"], ["time-entries", "Time Entries"],
  ["profiles", "Profiles"],
] as const;

function ClientLayout() {
  const { clientId } = useParams({ from: "/clients/$clientId" });
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: res, isLoading, isError } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => clientsApi.get(clientId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => clientsApi.delete(clientId),
    onSuccess: () => {
      toast.success("Client deleted");
      qc.invalidateQueries({ queryKey: ["clients"] });
      navigate({ to: "/clients" });
    },
    onError: () => toast.error("Failed to delete client"),
  });

  if (isLoading) return (
    <AppShell>
      <div className="flex items-center gap-2 py-20 justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading client…
      </div>
    </AppShell>
  );

  if (isError || !res?.data) return (
    <AppShell>
      <div className="py-10 text-center text-muted-foreground">
        Client not found. <Link to="/clients" className="text-primary">Back</Link>
      </div>
    </AppShell>
  );

  const client = res.data;

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-4">
        <ClientAvatar name={client.name} size={40} />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{client.name}</h1>
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
            </div>
            {client.portalStatus !== "none" ? (
              <div className="text-xs space-y-1.5">
                <div className="text-foreground font-medium">{client.name}</div>
                <div className="text-muted-foreground truncate">{client.email}</div>
                <div className="flex items-center justify-between pt-2">
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
                <div className="text-muted-foreground uppercase text-[10px] font-semibold mb-0.5">Email</div>
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
              <Field label="Occupation" value={client.occupation ?? ""} />
              <Field label="Client since" value={fmtDate(client.clientSince ?? "")} />
              <Field label="Created on" value={fmtDate(client.createdAt)} />
            </div>
          </div>
          <button
            onClick={() => setConfirmOpen(true)}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Client
          </button>
        </aside>

        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-sm mx-4 p-6">
              <h2 className="text-base font-semibold mb-1">Delete client?</h2>
              <p className="text-sm text-muted-foreground mb-5">
                This will permanently delete <span className="font-medium text-foreground">{client.name}</span> and all their data from the database. This cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setConfirmOpen(false); deleteMutation.mutate(); }}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Yes, delete permanently
                </button>
              </div>
            </div>
          </div>
        )}
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