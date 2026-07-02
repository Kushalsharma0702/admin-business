import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ListPage } from "@/components/app/ListPage";
import { ClientAvatar } from "@/components/app/ClientAvatar";
import { fmtDate } from "@/components/app/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import { clientsApi, inviteApi, type ApiClient } from "@/lib/api";
import { Loader2, WifiOff, UserPlus, Mail, RotateCcw, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/clients/")({ component: ClientsList });

const EMPTY_FORM = { name: "", email: "", phone: "", occupation: "" };

function ClientsList() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "pending" | "active">("all");
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-clients", q],
    queryFn: () => clientsApi.list(q, 1, 100),
    staleTime: 30_000,
  });

  const clients: ApiClient[] = data?.data ?? [];

  const filtered = clients.filter((c) => {
    if (tab === "pending") return c.portalStatus === "pending";
    if (tab === "active")  return c.portalStatus === "active";
    return true;
  });

  // ── Invite mutation ─────────────────────────────────────────────────────────
  const inviteMutation = useMutation({
    mutationFn: () => clientsApi.create({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || undefined, occupation: form.occupation.trim() || undefined }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin-clients"] });
      setShowInvite(false);
      setForm(EMPTY_FORM);
      toast.success(`Invite sent to ${res.data.email}`, {
        description: "The client will receive an email to set their password.",
        duration: 5000,
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Resend invite ───────────────────────────────────────────────────────────
  const handleResend = async (clientId: string, clientEmail: string) => {
    setResendingId(clientId);
    try {
      await inviteApi.resend(clientId);
      toast.success(`Invite resent to ${clientEmail}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to resend invite");
    } finally {
      setResendingId(null);
    }
  };

  const pendingCount = clients.filter((c) => c.portalStatus === "pending").length;

  return (
    <ListPage title="Client Portals" subtitle={`${clients.length} client${clients.length !== 1 ? "s" : ""}`}>
      <Toaster position="top-right" richColors />

      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-5 border-b border-border text-sm">
          {[
            { k: "all",     l: "All clients",       count: clients.length },
            { k: "active",  l: "Active",             count: clients.filter(c => c.portalStatus === "active").length },
            { k: "pending", l: "Invite pending",     count: pendingCount },
          ].map((t) => (
            <button key={t.k} onClick={() => setTab(t.k as typeof tab)}
              className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${tab === t.k ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t.l}
              {t.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${tab === t.k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <Button onClick={() => setShowInvite(true)} className="shrink-0">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Client
        </Button>
      </div>

      <Input placeholder="Search by name or email…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm mb-4" />

      {/* States */}
      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground py-10 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading clients…
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 text-destructive py-10 justify-center">
          <WifiOff className="w-4 h-4" /> Cannot connect to backend. Is it running on port 3001?
        </div>
      )}

      {/* Client table */}
      {!isLoading && !isError && (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Client</th>
                <th className="text-left px-4 py-2.5 font-semibold">Email</th>
                <th className="text-left px-4 py-2.5 font-semibold">Portal status</th>
                <th className="text-left px-4 py-2.5 font-semibold">Client since</th>
                <th className="text-left px-4 py-2.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link to="/clients/$clientId/$tab" params={{ clientId: c.id, tab: "home" }}
                      className="flex items-center gap-2.5 text-primary font-medium hover:underline">
                      <ClientAvatar name={c.name} size={28} />
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email || "—"}</td>
                  <td className="px-4 py-3">
                    {c.portalStatus === "active" ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />Active
                      </span>
                    ) : c.portalStatus === "pending" ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700">
                        <Clock className="h-3 w-3" />Invite pending
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{c.portalStatus}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(c.clientSince ?? undefined)}</td>
                  <td className="px-4 py-3">
                    {c.portalStatus === "pending" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => handleResend(c.id, c.email)}
                        disabled={resendingId === c.id}>
                        {resendingId === c.id
                          ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          : <RotateCcw className="h-3 w-3 mr-1" />}
                        Resend invite
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    {tab === "pending"
                      ? "No pending invites. Click \"Invite Client\" to add one."
                      : "No clients found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Invite Client Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showInvite} onOpenChange={(v) => { setShowInvite(v); if (!v) setForm(EMPTY_FORM); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Invite New Client
            </DialogTitle>
            <DialogDescription>
              An invitation email will be sent so the client can set their own password and access the portal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Full name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. John Smith"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email address <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="client@example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+1 (416) 555-0100"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Occupation <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  value={form.occupation}
                  onChange={(e) => setForm((f) => ({ ...f, occupation: e.target.value }))}
                  placeholder="e.g. Restaurant Owner"
                />
              </div>
            </div>

            {/* What happens next */}
            <div className="rounded-lg bg-muted/50 border p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-sm mb-2">What happens next</p>
              <div className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">1.</span> Client is created with <Badge variant="secondary" className="text-[10px] mx-0.5">invite pending</Badge> status.</div>
              <div className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">2.</span> An invite email is sent with a secure link (expires in 7 days).</div>
              <div className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">3.</span> Client clicks the link, sets their password, and logs in.</div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={!form.name.trim() || !form.email.trim() || inviteMutation.isPending}
            >
              {inviteMutation.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending invite…</>
                : <><Mail className="h-4 w-4 mr-2" />Send Invite</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ListPage>
  );
}
