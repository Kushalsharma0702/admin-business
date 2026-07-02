import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore, uid } from "@/store/useAppStore";
import { clientsApi, tasksApi, metaApi, ADMIN_STATUSES, type ApiTask, type AdminStatus, type TaskTypeInfo } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/app/EmptyState";
import { StatusBadge } from "@/components/app/StatusBadge";
import { fmtDate, fmtMoney } from "@/components/app/utils";
import { Upload, FileText, StickyNote, Scale, FileQuestion, FilePlus, Receipt, Clock, Send, Plus, Loader2, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/clients/$clientId/$tab")({ component: ClientTab });

function ClientTab() {
  const { clientId, tab } = useParams({ from: "/clients/$clientId/$tab" });
  const { data: clientRes, isLoading, isError } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => clientsApi.get(clientId),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading client…
    </div>
  );

  if (isError || !clientRes?.data) return (
    <div className="py-10 text-center text-muted-foreground">
      Client not found. <Link to="/clients" className="text-primary underline">Back</Link>
    </div>
  );

  switch (tab) {
    case "home": return <Home clientId={clientId} />;
    case "communication": return <Communication clientId={clientId} />;
    case "notes": return <Notes clientId={clientId} />;
    case "files": return <Files clientId={clientId} />;
    case "tasks": return <Tasks clientId={clientId} />;
    case "resolution-cases": return <Resolution clientId={clientId} />;
    case "organizers": return <Organizers clientId={clientId} />;
    case "transcripts": return <Transcripts clientId={clientId} />;
    case "billing": return <Billing clientId={clientId} />;
    case "time-entries": return <TimeEntries clientId={clientId} />;
    default: return <Home clientId={clientId} />;
  }
}

function Home({ clientId }: { clientId: string }) {
  const allTasks = useAppStore((s) => s.tasks);
  const tasks = useMemo(() => allTasks.filter((t) => t.clientId === clientId && t.status !== "Completed"), [allTasks, clientId]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="p-5">
        <div className="flex justify-between items-center mb-3"><h3 className="font-semibold">Tasks</h3><a href={`/clients/${clientId}/tasks`} className="text-primary text-sm">View all tasks</a></div>
        {tasks.length === 0 ? <EmptyState icon={FilePlus} title="No open tasks" /> : (
          <ul className="space-y-2">{tasks.map((t) => (
            <li key={t.id} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
              <span>{t.name}</span><span className="text-muted-foreground">{fmtDate(t.dueDate)}</span>
            </li>))}
          </ul>
        )}
      </Card>
      <Card className="p-5">
        <div className="flex justify-between items-center mb-3"><h3 className="font-semibold">Recent Files</h3><a href={`/clients/${clientId}/files`} className="text-primary text-sm">View all files</a></div>
        <EmptyState icon={Upload} title="Add files" description="Drag and drop files here" actionLabel="Upload file" onAction={() => toast.info("Open Files tab to upload")} />
      </Card>
      <Card className="p-5">
        <div className="flex justify-between items-center mb-3"><h3 className="font-semibold">Notes</h3><a href={`/clients/${clientId}/notes`} className="text-primary text-sm">Add a note</a></div>
        <EmptyState icon={StickyNote} title="No notes" description="There are no notes for this client." actionLabel="Add note" onAction={() => toast.info("Open Notes tab")} />
      </Card>
      <Card className="p-5">
        <div className="flex justify-between items-center mb-3"><h3 className="font-semibold">Resolution Cases</h3><a href={`/clients/${clientId}/resolution-cases`} className="text-primary text-sm">Create resolution case</a></div>
        <EmptyState icon={Scale} title="No active resolution cases" description="Track IRS issues for this client." actionLabel="Create resolution case" onAction={() => toast.info("Open Resolution Cases tab")} />
      </Card>
    </div>
  );
}

function Communication({ clientId }: { clientId: string }) {
  const allMessages = useAppStore((s) => s.messages);
  const addMessage = useAppStore((s) => s.addMessage);
  const msgs = useMemo(() => allMessages.filter((m) => m.clientId === clientId), [allMessages, clientId]);
  const [text, setText] = useState("");
  const send = () => {
    if (!text.trim()) return;
    addMessage({ id: uid(), clientId, from: "Angela Martin", to: "Client", channel: "Portal", body: text, sentAt: new Date().toLocaleString() });
    setText(""); toast.success("Message sent");
  };
  return (
    <Card className="p-5">
      <div className="flex gap-2 text-xs mb-4">{["All","Email","SMS","Portal messages"].map((f) => <button key={f} className="px-2 py-1 rounded bg-muted">{f}</button>)}</div>
      <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
        {msgs.map((m) => (
          <div key={m.id} className={`p-3 rounded-lg ${m.from === "Angela Martin" ? "bg-primary/10 ml-12" : "bg-muted mr-12"}`}>
            <div className="text-xs text-muted-foreground mb-1">{m.from} • {m.channel} • {m.sentAt}</div>
            <div className="text-sm">{m.body}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2"><Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" rows={2} /><Button onClick={send}><Send className="w-4 h-4" /></Button></div>
    </Card>
  );
}

function Notes({ clientId }: { clientId: string }) {
  const allNotes = useAppStore((s) => s.notes);
  const addNote = useAppStore((s) => s.addNote);
  const notes = useMemo(() => allNotes.filter((n) => n.clientId === clientId), [allNotes, clientId]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  return (
    <Card className="p-5">
      <div className="flex justify-between mb-4"><h3 className="font-semibold">Notes</h3><Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />Add note</Button></div>
      {notes.length === 0 ? <EmptyState icon={StickyNote} title="No notes" description="There are no notes for this client." actionLabel="Add note" onAction={() => setOpen(true)} /> :
        <div className="space-y-3">{notes.map((n) => (<div key={n.id} className="p-3 border border-border rounded"><div className="text-xs text-muted-foreground mb-1">{n.author} • {n.createdAt}</div><div className="text-sm">{n.text}</div></div>))}</div>}
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Add note</DialogTitle></DialogHeader>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Note text…" />
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => { if (!text.trim()) return; addNote({ id: uid(), clientId, text, author: "Angela Martin", createdAt: new Date().toLocaleString() }); setText(""); setOpen(false); toast.success("Note added"); }}>Save</Button>
        </DialogFooter></DialogContent></Dialog>
    </Card>
  );
}

function Files({ clientId }: { clientId: string }) {
  const allFiles = useAppStore((s) => s.files);
  const addFile = useAppStore((s) => s.addFile);
  const files = useMemo(() => allFiles.filter((f) => f.clientId === clientId), [allFiles, clientId]);
  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files; if (!list) return;
    Array.from(list).forEach((f) => addFile({ id: uid(), clientId, name: f.name, type: f.type || "file", size: f.size, uploadedAt: new Date().toLocaleString(), uploadedBy: "Angela Martin" }));
    toast.success(`${list.length} file(s) uploaded`);
  };
  return (
    <Card className="p-5">
      <div className="flex justify-between mb-4"><h3 className="font-semibold">Files</h3>
        <label className="inline-flex"><input type="file" multiple className="hidden" onChange={onUpload} /><span className="cursor-pointer inline-flex items-center px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm"><Upload className="w-4 h-4 mr-1.5" />Upload</span></label></div>
      {files.length === 0 ? (
        <label className="block border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:bg-muted/30">
          <input type="file" multiple className="hidden" onChange={onUpload} />
          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <div className="font-medium">Add files</div><div className="text-sm text-muted-foreground">Drag and drop files here</div>
        </label>
      ) : (
        <table className="w-full text-sm"><thead className="text-xs uppercase text-muted-foreground border-b border-border"><tr><th className="text-left py-2">Name</th><th className="text-left py-2">Type</th><th className="text-right py-2">Size</th><th className="text-left py-2 pl-4">Uploaded</th><th className="text-left py-2">By</th></tr></thead>
          <tbody>{files.map((f) => <tr key={f.id} className="border-b border-border last:border-0"><td className="py-2"><FileText className="w-4 h-4 inline mr-2 text-muted-foreground" />{f.name}</td><td>{f.type}</td><td className="text-right">{(f.size/1024).toFixed(1)} KB</td><td className="pl-4">{f.uploadedAt}</td><td>{f.uploadedBy}</td></tr>)}</tbody></table>
      )}
    </Card>
  );
}

function Tasks({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    taskType: "CORPORATE_TAX_RETURN" as string,
    adminStatus: "Data not received" as AdminStatus,
    description: "",
  });
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: taskTypesRes } = useQuery({
    queryKey: ["task-types"],
    queryFn: () => metaApi.getTaskTypes(),
    staleTime: 60_000,
  });
  const workflowTypes: TaskTypeInfo[] = taskTypesRes?.data ?? [];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["client-tasks", clientId],
    queryFn: () => tasksApi.listForClient(clientId),
    staleTime: 15_000,
  });

  const tasks: ApiTask[] = data?.data ?? [];
  const active = tasks.filter((t) => t.status !== "complete");
  const done = tasks.filter((t) => t.status === "complete");

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error("Task title is required"); return; }
    try {
      await tasksApi.create(clientId, {
        title: form.title,
        description: form.description || undefined,
        taskType: form.taskType,
        adminStatus: form.adminStatus,
      });
      toast.success("Task assigned to client");
      setOpen(false);
      setForm({ title: "", taskType: "CORPORATE_TAX_RETURN", adminStatus: "Data not received", description: "" });
      queryClient.invalidateQueries({ queryKey: ["client-tasks", clientId] });
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create task");
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: AdminStatus) => {
    setUpdatingId(taskId);
    try {
      await tasksApi.update(taskId, { adminStatus: newStatus });
      toast.success(`Status → ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ["client-tasks", clientId] });
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      await tasksApi.delete(taskId);
      toast.success("Task deleted");
      queryClient.invalidateQueries({ queryKey: ["client-tasks", clientId] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  if (isLoading) return <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Loading tasks…</div>;
  if (isError) return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <WifiOff className="w-8 h-8 text-destructive" />
      <div className="text-destructive font-medium">Backend not reachable</div>
      <div className="text-muted-foreground text-sm">Run: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">cd backend && node src/index.js</code></div>
      <Button size="sm" onClick={() => refetch()}>Retry</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />Assign task</Button>
      </div>

      {/* ── Active tasks ── */}
      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-semibold text-sm">Active tasks ({active.length})</div>
        {active.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground text-center">No active tasks</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground bg-muted/40">
              <tr>
                <th className="text-left px-4 py-2">Task</th>
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-left px-4 py-2">Client Status</th>
                <th className="text-left px-4 py-2">Admin Status</th>
                <th className="text-left px-4 py-2">Assigned</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {active.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium">{t.title}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{t.taskType ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">Pending</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={t.adminStatus}
                      disabled={updatingId === t.id}
                      onChange={(e) => handleStatusChange(t.id, e.target.value as AdminStatus)}
                      className="text-xs border border-border rounded px-1.5 py-1 bg-background min-w-[160px] disabled:opacity-50"
                    >
                      {ADMIN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {updatingId === t.id && <Loader2 className="inline w-3 h-3 animate-spin ml-1 text-muted-foreground" />}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{fmtDate(t.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => handleDelete(t.id)} className="text-xs text-destructive hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* ── Completed tasks ── */}
      {done.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border font-semibold text-sm">Completed by client ({done.length})</div>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground bg-muted/40">
              <tr>
                <th className="text-left px-4 py-2">Task</th>
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-left px-4 py-2">Admin Status</th>
                <th className="text-left px-4 py-2">Completed</th>
              </tr>
            </thead>
            <tbody>
              {done.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">{t.title}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{t.taskType ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <select
                      value={t.adminStatus}
                      disabled={updatingId === t.id}
                      onChange={(e) => handleStatusChange(t.id, e.target.value as AdminStatus)}
                      className="text-xs border border-border rounded px-1.5 py-1 bg-background min-w-[160px] disabled:opacity-50"
                    >
                      {ADMIN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{fmtDate(t.completedAt ?? t.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── Create task dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assign task to client</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Task title *</label>
              <Input placeholder="e.g. Upload T4 slips" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Task type</label>
              <select
                className="mt-1 w-full border border-border rounded-md h-9 px-2 text-sm bg-background"
                value={form.taskType}
                onChange={(e) => {
                  const taskType = e.target.value;
                  const wf = workflowTypes.find((t) => t.key === taskType);
                  setForm((f) => ({
                    ...f,
                    taskType,
                    title: wf && (!f.title.trim() || workflowTypes.some((t) => t.displayName === f.title))
                      ? wf.displayName
                      : f.title,
                  }));
                }}
              >
                <optgroup label="Workflow tasks">
                  {workflowTypes.map((t) => (
                    <option key={t.key} value={t.key}>{t.displayName}</option>
                  ))}
                </optgroup>
                <optgroup label="Other task types">
                  <option value="info">Info (read + mark complete)</option>
                  <option value="onboarding_form">T2 Onboarding Form</option>
                  <option value="sheet_remarks">Query Sheet Remarks</option>
                  <option value="basic_docs_upload">Documents Upload</option>
                  <option value="payroll">Payroll Setup</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Admin Status</label>
              <select className="mt-1 w-full border border-border rounded-md h-9 px-2 text-sm bg-background"
                value={form.adminStatus} onChange={(e) => setForm({ ...form, adminStatus: e.target.value as AdminStatus })}>
                {ADMIN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description (optional)</label>
              <Textarea placeholder="Instructions shown to the client…" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Assign task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Resolution({ clientId }: { clientId: string }) {
  void clientId;
  return <Card className="p-5"><EmptyState icon={Scale} title="No active resolution cases" description="Track tax resolution work for this client." actionLabel="Create resolution case" onAction={() => toast.success("Resolution case created")} /></Card>;
}
function Organizers({ clientId }: { clientId: string }) { void clientId; return <Card className="p-5"><EmptyState icon={FileQuestion} title="No organizers sent" description="Send a tax organizer to gather client info." actionLabel="Send organizer" onAction={() => toast.success("Organizer sent")} /></Card>; }
function Transcripts({ clientId }: { clientId: string }) { void clientId; return <Card className="p-5"><EmptyState icon={FileText} title="No transcripts" description="Request IRS transcripts for this client." actionLabel="Request transcript" onAction={() => toast.success("Transcript requested")} /></Card>; }

function Billing({ clientId }: { clientId: string }) {
  const allBilling = useAppStore((s) => s.billing);
  const items = useMemo(() => allBilling.filter((b) => b.clientId === clientId), [allBilling, clientId]);
  const totalBilled = useMemo(() => items.reduce((a, b) => a + b.amount, 0), [items]);
  const totalPaid = useMemo(() => items.filter((b) => b.status === "Paid").reduce((a, b) => a + b.amount, 0), [items]);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total billed</div><div className="text-xl font-semibold">{fmtMoney(totalBilled)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total paid</div><div className="text-xl font-semibold text-emerald-600">{fmtMoney(totalPaid)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Outstanding</div><div className="text-xl font-semibold text-rose-600">{fmtMoney(totalBilled - totalPaid)}</div></Card>
      </div>
      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex justify-between"><span className="font-semibold text-sm">Invoices</span><Button size="sm" onClick={() => toast.success("Invoice draft created")}><Receipt className="w-4 h-4 mr-1" />Create invoice</Button></div>
        <table className="w-full text-sm"><thead className="text-xs uppercase text-muted-foreground bg-muted/40"><tr><th className="text-left px-4 py-2">Invoice #</th><th className="text-left px-4 py-2">Date</th><th className="text-left px-4 py-2">Description</th><th className="text-right px-4 py-2">Amount</th><th className="text-left px-4 py-2 pl-6">Status</th></tr></thead>
          <tbody>{items.map((b) => <tr key={b.id} className="border-b border-border last:border-0"><td className="px-4 py-2.5 font-medium">{b.invoiceNumber}</td><td className="px-4 py-2.5">{fmtDate(b.date)}</td><td className="px-4 py-2.5">{b.description}</td><td className="px-4 py-2.5 text-right">{fmtMoney(b.amount)}</td><td className="px-4 py-2.5 pl-6"><StatusBadge status={b.status} /></td></tr>)}</tbody></table>
      </Card>
    </div>
  );
}

function TimeEntries({ clientId }: { clientId: string }) {
  const allTimeEntries = useAppStore((s) => s.timeEntries);
  const items = useMemo(() => allTimeEntries.filter((t) => t.clientId === clientId), [allTimeEntries, clientId]);
  const total = useMemo(() => items.reduce((a, b) => a + b.hours, 0), [items]);
  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex justify-between"><span className="font-semibold text-sm">Time entries — {total.toFixed(1)} hrs total</span><Button size="sm" onClick={() => toast.success("Time logged")}><Clock className="w-4 h-4 mr-1" />Log time</Button></div>
      <table className="w-full text-sm"><thead className="text-xs uppercase text-muted-foreground bg-muted/40"><tr><th className="text-left px-4 py-2">Date</th><th className="text-left px-4 py-2">Description</th><th className="text-right px-4 py-2">Hours</th><th className="text-right px-4 py-2">Rate</th><th className="text-right px-4 py-2">Amount</th><th className="text-left px-4 py-2 pl-6">Logged by</th></tr></thead>
        <tbody>{items.map((t) => <tr key={t.id} className="border-b border-border last:border-0"><td className="px-4 py-2.5">{fmtDate(t.date)}</td><td className="px-4 py-2.5">{t.description}</td><td className="px-4 py-2.5 text-right">{t.hours}</td><td className="px-4 py-2.5 text-right">{fmtMoney(t.rate)}</td><td className="px-4 py-2.5 text-right font-medium">{fmtMoney(t.hours * t.rate)}</td><td className="px-4 py-2.5 pl-6">{t.loggedBy}</td></tr>)}</tbody></table>
    </Card>
  );
}