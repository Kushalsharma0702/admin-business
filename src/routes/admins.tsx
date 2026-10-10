import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ListPage } from "@/components/app/ListPage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/useAuthStore";
import {
  adminUsersApi, notificationConfigsApi, TASK_TYPES,
  type AdminUser, type NotificationConfig, type AuditLogEntry,
} from "@/lib/api";
import { Loader2, WifiOff, Plus, ShieldOff, ShieldCheck, ScrollText, Trash2, Ban } from "lucide-react";

export const Route = createFileRoute("/admins")({ component: AdminsPage });

const EMPTY_ADMIN_FORM = { name: "", email: "", password: "", permissions: [] as string[] };

function AdminsPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser?.role === "superadmin";

  if (!isSuperAdmin) {
    return (
      <ListPage title="Admins" subtitle="Manage staff accounts">
        <Card className="p-8 flex flex-col items-center gap-3 text-center text-muted-foreground">
          <ShieldOff className="w-8 h-8" />
          <p className="font-medium text-foreground">Superadmin access required</p>
          <p className="text-sm">Only a superadmin can manage staff accounts and permissions.</p>
        </Card>
      </ListPage>
    );
  }

  return (
    <ListPage title="Admins" subtitle="Manage staff accounts, permissions, and view their activity">
      <div className="space-y-6">
        <AdminsSection />
        <NotificationConfigsSection />
        <AuditLogSection />
      </div>
    </ListPage>
  );
}

// ── Staff accounts ────────────────────────────────────────────────────────────
function AdminsSection() {
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_ADMIN_FORM);
  const [logsFor, setLogsFor] = useState<AdminUser | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminUsersApi.list(),
  });
  const { data: keysRes } = useQuery({
    queryKey: ["permission-keys"],
    queryFn: () => adminUsersApi.permissionKeys(),
  });
  const admins: AdminUser[] = data?.data ?? [];
  const permissionKeys: string[] = keysRes?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => adminUsersApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setShowCreate(false);
      setForm(EMPTY_ADMIN_FORM);
      toast.success("Admin created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const togglePermissionMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      adminUsersApi.update(id, { permissions }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminUsersApi.update(id, { isActive }),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(vars.isActive ? "Admin re-enabled" : "Admin disabled");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => adminUsersApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Admin removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Staff Accounts</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Add admins, grant permissions, disable or remove access.</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" />Add admin</Button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}
      {isError && (
        <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
          <WifiOff className="h-8 w-8" /><p>Could not load admins.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Email</th>
                <th className="text-left px-4 py-2.5">Role</th>
                <th className="text-left px-4 py-2.5">Permissions</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium">{a.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{a.email}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.role === "superadmin" ? "bg-purple-100 text-purple-800" : "bg-muted text-muted-foreground"}`}>
                      {a.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {a.role === "superadmin" ? (
                      <span className="text-xs text-muted-foreground">all</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {permissionKeys.map((key) => {
                          const active = a.permissions.includes(key);
                          return (
                            <button
                              key={key}
                              onClick={() => {
                                const next = active ? a.permissions.filter((p) => p !== key) : [...a.permissions, key];
                                togglePermissionMutation.mutate({ id: a.id, permissions: next });
                              }}
                              className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                            >
                              {key}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                      {a.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {a.role !== "superadmin" && a.id !== currentUser?.id && (
                      <div className="flex items-center gap-3 justify-end">
                        <button
                          title="View activity log"
                          onClick={() => setLogsFor(a)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ScrollText className="w-4 h-4" />
                        </button>
                        <button
                          title={a.isActive ? "Disable" : "Re-enable"}
                          onClick={() => toggleActiveMutation.mutate({ id: a.id, isActive: !a.isActive })}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {a.isActive ? <Ban className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                        </button>
                        <button
                          title="Remove admin"
                          onClick={() => { if (confirm(`Remove ${a.name}'s access?`)) removeMutation.mutate(a.id); }}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No staff accounts yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add admin</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Name</Label>
              <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Email</Label>
              <Input className="mt-1" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Initial password</Label>
              <Input className="mt-1" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Permissions</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {permissionKeys.map((key) => {
                  const active = form.permissions.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm((f) => ({
                        ...f,
                        permissions: active ? f.permissions.filter((p) => p !== key) : [...f.permissions, key],
                      }))}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminLogsDialog admin={logsFor} onClose={() => setLogsFor(null)} />
    </Card>
  );
}

function AdminLogsDialog({ admin, onClose }: { admin: AdminUser | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-logs", admin?.id],
    queryFn: () => adminUsersApi.logsFor(admin!.id),
    enabled: !!admin,
  });
  const entries: AuditLogEntry[] = data?.data ?? [];

  return (
    <Dialog open={!!admin} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Activity — {admin?.name}</DialogTitle>
          <DialogDescription>What this admin has changed in Admins/Notifications settings.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No activity recorded for this admin yet.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {entries.map((e) => (
              <div key={e.id} className="text-sm border-b border-border pb-2 last:border-0">
                <div className="font-medium">{e.action.replace(/_/g, " ")}</div>
                <div className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</div>
                {Object.keys(e.details || {}).length > 0 && (
                  <pre className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap">{JSON.stringify(e.details, null, 0)}</pre>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Task-type notification routing ────────────────────────────────────────────
function NotificationConfigsSection() {
  const qc = useQueryClient();
  const [taskType, setTaskType] = useState<string>(TASK_TYPES[0]);
  const [email, setEmail] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["notification-configs"],
    queryFn: () => notificationConfigsApi.list(),
  });
  const configs: NotificationConfig[] = data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: () => notificationConfigsApi.save(taskType, email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-configs"] });
      setEmail("");
      toast.success(`Notifications for ${taskType} will go to ${email}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (tt: string) => notificationConfigsApi.remove(tt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-configs"] });
      toast.success("Notification routing removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Card className="p-5">
      <h3 className="font-semibold">Client-Change Notifications</h3>
      <p className="text-xs text-muted-foreground mt-0.5 mb-4">
        When a client completes or submits a task of a given type, an email is sent to the address below.
        E.g. HST → a@gmail.com, Payroll → b@gmail.com.
      </p>

      <div className="flex flex-wrap items-end gap-2 mb-4">
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Task type</Label>
          <select
            className="mt-1 h-9 border border-border rounded-md px-2 text-sm bg-background block"
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
          >
            {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[220px]">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Notify email</Label>
          <Input className="mt-1" type="email" placeholder="a@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button onClick={() => email.trim() && saveMutation.mutate()} disabled={!email.trim() || saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Save
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-4 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : configs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No task types routed yet.</p>
      ) : (
        <div className="space-y-2">
          {configs.map((c) => (
            <div key={c.taskType} className="flex items-center justify-between text-sm border border-border rounded-md px-3 py-2">
              <div><span className="font-medium">{c.taskType}</span> <span className="text-muted-foreground">→ {c.email}</span></div>
              <button onClick={() => removeMutation.mutate(c.taskType)} className="text-destructive hover:text-destructive/80">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Global recent activity ────────────────────────────────────────────────────
function AuditLogSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["audit-log", 1],
    queryFn: () => adminUsersApi.auditLog(1, 20),
  });
  const entries: AuditLogEntry[] = data?.data.entries ?? [];

  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-3">Recent Activity</h3>
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-4 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No admin activity recorded yet.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {entries.map((e) => (
            <div key={e.id} className="text-sm border-b border-border pb-2 last:border-0">
              <span className="font-medium">{e.adminName ?? "Unknown admin"}</span>{" "}
              <span className="text-muted-foreground">{e.action.replace(/_/g, " ")}</span>{" "}
              <span className="text-xs text-muted-foreground">— {new Date(e.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
