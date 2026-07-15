import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore, uid } from "@/store/useAppStore";
import { clientsApi, tasksApi, metaApi, generalDocsAdminApi, profilesAdminApi, onboardingAdminApi, ADMIN_STATUSES, type ApiTask, type AdminStatus, type TaskTypeInfo, type DocumentTypeCatalogItem, type GeneralDocField, type GeneralDocStatus, type UserProfile, type OnboardingSection, type OnboardingField, type ConfigFieldDef } from "@/lib/api";
import { GeneralDocsConfig } from "@/components/app/GeneralDocsConfig";
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
    case "general-docs": return <GeneralDocs clientId={clientId} />;
    case "onboarding":   return <OnboardingTab clientId={clientId} />;
    case "profiles":     return <ProfilesTab clientId={clientId} />;
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

/** Renders one task-type config field with the correct input for its declared type. */
function ConfigFieldInput({
  field, value, onChange,
}: {
  field: ConfigFieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const label = (
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      {field.label}{field.required && <span className="text-rose-500"> *</span>}
    </label>
  );

  if (field.type === "boolean") {
    // Yes/No — matches the spec's Yes/No columns (T5, T4A, T5018)
    return (
      <div className="flex items-center justify-between gap-2">
        {label}
        <select
          className="border border-border rounded-md h-8 px-2 text-sm bg-background"
          value={value === true ? "yes" : value === false ? "no" : ""}
          onChange={(e) => onChange(e.target.value === "" ? null : e.target.value === "yes")}
        >
          <option value="">—</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        {label}
        <select
          className="mt-1 w-full border border-border rounded-md h-9 px-2 text-sm bg-background"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">Select…</option>
          {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        {label}
        <Textarea
          className="mt-1"
          rows={2}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  // text | number | date | password
  return (
    <div>
      {label}
      <Input
        className="mt-1"
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "password" ? "password" : "text"}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(field.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)}
      />
    </div>
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

  // Task-type config values (e.g. Payroll: nextPayDate, payrollFrequency, WCB…)
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const setConfigValue = (key: string, value: unknown) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  // key → quantity of documents the client must upload for this task (0/absent = not required)
  const [docReqs, setDocReqs] = useState<Record<string, number>>({});

  const { data: taskTypesRes } = useQuery({
    queryKey: ["task-types"],
    queryFn: () => metaApi.getTaskTypes(),
    staleTime: 60_000,
  });
  const workflowTypes: TaskTypeInfo[] = taskTypesRes?.data ?? [];

  const { data: docTypesRes } = useQuery({
    queryKey: ["document-types"],
    queryFn: () => metaApi.getDocumentTypes(),
    staleTime: 60_000,
  });
  const docCatalog: DocumentTypeCatalogItem[] = docTypesRes?.data?.all ?? [];

  const setDocQty = (key: string, qty: number) =>
    setDocReqs((prev) => {
      const next = { ...prev };
      if (qty > 0) next[key] = Math.min(50, qty);
      else delete next[key];
      return next;
    });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["client-tasks", clientId],
    queryFn: () => tasksApi.listForClient(clientId),
    staleTime: 15_000,
  });

  const tasks: ApiTask[] = data?.data ?? [];
  const active = tasks.filter((t) => t.status !== "complete");
  const done = tasks.filter((t) => t.status === "complete");

  // The config schema for the currently selected workflow task type (empty for non-workflow types)
  const activeSchema = workflowTypes.find((t) => t.key === form.taskType)?.configSchema ?? [];

  // Whether a config field should render given its dependsOn rule
  const configFieldVisible = (f: ConfigFieldDef): boolean => {
    if (!f.dependsOn) return true;
    return config[f.dependsOn.field] === f.dependsOn.value;
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error("Task title is required"); return; }

    // Validate required config fields (that are currently visible)
    const missing = activeSchema
      .filter((f) => f.required && configFieldVisible(f))
      .filter((f) => { const v = config[f.key]; return v === undefined || v === null || v === ""; });
    if (missing.length) {
      toast.error(`Please fill: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }

    try {
      const documentRequirements = Object.entries(docReqs)
        .filter(([, qty]) => qty > 0)
        .map(([key, quantity]) => ({ key, quantity }));

      // Only send config values for fields that belong to (and are visible for) this task type
      const configPayload: Record<string, unknown> = {};
      for (const f of activeSchema) {
        if (configFieldVisible(f) && config[f.key] !== undefined && config[f.key] !== "") {
          configPayload[f.key] = config[f.key];
        }
      }

      await tasksApi.create(clientId, {
        title: form.title,
        description: form.description || undefined,
        taskType: form.taskType,
        adminStatus: form.adminStatus,
        documentRequirements: documentRequirements.length ? documentRequirements : undefined,
        config: Object.keys(configPayload).length ? configPayload : undefined,
      });
      toast.success("Task assigned to client");
      setOpen(false);
      setForm({ title: "", taskType: "CORPORATE_TAX_RETURN", adminStatus: "Data not received", description: "" });
      setConfig({});
      setDocReqs({});
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
                  setConfig({}); // reset config values when task type changes
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

            {/* ── Task-type config fields (e.g. Payroll: pay date, frequency, WCB…) ── */}
            {activeSchema.length > 0 && (
              <div className="rounded-md border border-border p-3 space-y-3 bg-muted/30">
                <div className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  {workflowTypes.find((t) => t.key === form.taskType)?.displayName} details
                </div>
                {activeSchema.filter(configFieldVisible).map((f) => (
                  <ConfigFieldInput
                    key={f.key}
                    field={f}
                    value={config[f.key]}
                    onChange={(v) => setConfigValue(f.key, v)}
                  />
                ))}
              </div>
            )}

            {/* ── Required documents (upload fields shown to the client) ── */}
            {docCatalog.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Required documents ({Object.keys(docReqs).length} selected)
                </label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Pick which files the client must upload and how many of each.
                </p>
                <div className="mt-2 max-h-48 overflow-y-auto border border-border rounded-md divide-y divide-border">
                  {docCatalog.map((doc) => {
                    const qty = docReqs[doc.key] ?? 0;
                    const selected = qty > 0;
                    return (
                      <div key={doc.key} className="flex items-center gap-2 px-2.5 py-1.5">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => setDocQty(doc.key, e.target.checked ? Math.max(1, qty) : 0)}
                          className="h-4 w-4 accent-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{doc.label}</div>
                          {doc.group === "sales" && <div className="text-[10px] text-muted-foreground">Sales</div>}
                        </div>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={selected ? qty : ""}
                          disabled={!selected}
                          onChange={(e) => setDocQty(doc.key, Number(e.target.value) || 0)}
                          placeholder="0"
                          className="w-14 h-7 text-sm text-center border border-border rounded bg-background disabled:opacity-40"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

// ── On-Boarding Details tab (read-only view of client's submission) ─────────────
function OnboardingTab({ clientId }: { clientId: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["client-onboarding", clientId],
    queryFn:  () => onboardingAdminApi.get(clientId),
  });

  if (isLoading) return (
    <Card className="p-5"><div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div></Card>
  );
  if (isError) return (
    <Card className="p-5"><div className="flex flex-col items-center gap-3 py-8 text-muted-foreground"><WifiOff className="h-8 w-8" /><p>Could not load onboarding details.</p><Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button></div></Card>
  );

  const schema = data?.data.schema;
  const sub = data?.data.submission;
  const answers = (sub?.answers ?? {}) as Record<string, unknown>;
  const status = sub?.status ?? "not_started";

  const renderValue = (f: OnboardingField) => {
    const v = answers[f.key];
    if (f.type === "ack") {
      const m = (v ?? {}) as { confirmed?: boolean; remark?: string };
      return (
        <span>
          <span className={m.confirmed ? "text-emerald-600 font-medium" : "text-muted-foreground"}>{m.confirmed ? "Confirmed" : "Not confirmed"}</span>
          {m.remark ? <span className="text-muted-foreground"> — {m.remark}</span> : null}
        </span>
      );
    }
    if (f.type === "group") {
      const items = Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
      if (!items.length) return <span className="text-muted-foreground">—</span>;
      return (
        <div className="space-y-2 mt-1">
          {items.map((item, i) => (
            <div key={i} className="rounded-md border border-border p-2 bg-muted/30">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">{f.itemLabel ?? "Item"} {i + 1}</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {(f.fields ?? []).map((sub2) => (
                  <div key={sub2.key}><span className="text-muted-foreground">{sub2.label}: </span>{String(item[sub2.key] ?? "") || "—"}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }
    const s = v === undefined || v === null ? "" : String(v);
    return <span>{s || <span className="text-muted-foreground">—</span>}</span>;
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">On-Boarding Details</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Submitted by the client from the app.</p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status === "submitted" ? "bg-emerald-50 text-emerald-700" : status === "draft" ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground"}`}>
            {status === "submitted" ? "Submitted" : status === "draft" ? "Draft (in progress)" : "Not started"}
          </span>
        </div>
      </Card>

      {status === "not_started" ? (
        <Card className="p-5"><EmptyState icon={FileQuestion} title="Nothing submitted yet" description="The client has not filled in their on-boarding details." /></Card>
      ) : (
        (schema?.sections ?? []).map((section: OnboardingSection) => (
          <Card key={section.key} className="p-5">
            <h4 className="font-semibold mb-3">{section.title}</h4>
            <div className="space-y-3">
              {section.fields.map((f) => (
                <div key={f.key} className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-1 sm:gap-4 text-sm border-b border-border last:border-0 pb-3 last:pb-0">
                  <div className="text-muted-foreground">{f.label}</div>
                  <div className="text-foreground">{renderValue(f)}</div>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

// ── General Documentation tab ──────────────────────────────────────────────────
function GeneralDocs({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{ enabled: boolean; fields: Partial<GeneralDocField>[] }>({ enabled: true, fields: [] });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["client-general-docs", clientId],
    queryFn:  () => generalDocsAdminApi.get(clientId),
  });

  const status = data?.data as (GeneralDocStatus & { config: { enabled: boolean; fields: GeneralDocField[]; updatedAt: string } | null; uploads: Array<{ id: string; fieldKey: string; slotIndex: number; fileName: string; originalFilename: string; fileType: string | null; uploadedAt: string }> }) | undefined;

  const saveMutation = useMutation({
    mutationFn: () => generalDocsAdminApi.save(clientId, draft),
    onSuccess: () => {
      toast.success("General documentation config saved");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["client-general-docs", clientId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (uploadId: string) => generalDocsAdminApi.deleteUpload(uploadId),
    onSuccess: () => {
      toast.success("Upload deleted");
      qc.invalidateQueries({ queryKey: ["client-general-docs", clientId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const startEdit = () => {
    setDraft({
      enabled: status?.enabled ?? true,
      fields:  status?.config?.fields ?? [],
    });
    setEditing(true);
  };

  const overallColor = {
    submitted:   "bg-emerald-50 text-emerald-700",
    partial:     "bg-amber-50 text-amber-700",
    pending:     "bg-slate-100 text-slate-600",
    not_required: "bg-slate-100 text-slate-400",
  }[status?.overall ?? "pending"] ?? "bg-slate-100 text-slate-600";

  if (isLoading) return <div className="flex justify-center py-10 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" />Loading…</div>;
  if (isError) return (
    <div className="text-center py-10"><div className="text-destructive mb-2">Failed to load</div><Button size="sm" onClick={() => refetch()}>Retry</Button></div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">General Documentation</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pre-task document checklist configured for this client
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status?.overall && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${overallColor}`}>
              {status.overall === "submitted" ? "All submitted" :
               status.overall === "partial"   ? "Partial uploads" :
               status.overall === "not_required" ? "Not configured" : "Pending"}
            </span>
          )}
          {!editing && (
            <Button size="sm" variant="outline" onClick={startEdit}>
              {status?.config ? "Edit Config" : "Configure"}
            </Button>
          )}
        </div>
      </div>

      {/* Config editor */}
      {editing ? (
        <Card className="p-4">
          <GeneralDocsConfig value={draft} onChange={setDraft} />
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Saving…</> : "Save Configuration"}
            </Button>
          </div>
        </Card>
      ) : !status?.enabled ? (
        <Card className="p-8 text-center text-muted-foreground">
          <p className="text-sm">General Documentation is not configured for this client.</p>
          <Button size="sm" className="mt-3" onClick={startEdit}>Configure</Button>
        </Card>
      ) : (
        <>
          {/* Fields + uploads */}
          <div className="space-y-3">
            {(status?.fields ?? []).map((field) => (
              <Card key={field.key} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-sm">{field.name}</p>
                    {field.notes && <p className="text-xs text-muted-foreground mt-0.5">{field.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      field.status === "complete" ? "bg-emerald-50 text-emerald-700" :
                      field.status === "optional" ? "bg-slate-100 text-slate-500" :
                      "bg-amber-50 text-amber-700"
                    }`}>
                      {field.status === "complete" ? `${field.uploadedCount}/${field.maxCount} uploaded` :
                       field.status === "optional" ? "Optional" :
                       `${field.pendingCount} pending`}
                    </span>
                    {field.required && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">Required</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {field.slots.map((slot) => (
                    <div key={slot.slotIndex} className={`border rounded-md p-2.5 text-xs ${
                      slot.status === "uploaded" ? "bg-emerald-50 border-emerald-200" : "bg-muted/50 border-dashed"
                    }`}>
                      <div className="font-medium mb-1 text-muted-foreground">Slot {slot.slotIndex}</div>
                      {slot.uploadedFile ? (
                        <div className="space-y-1">
                          <p className="truncate font-medium" title={slot.uploadedFile.originalFilename}>
                            {slot.uploadedFile.originalFilename}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(slot.uploadedFile.uploadedAt).toLocaleDateString()}
                          </p>
                          <div className="flex gap-1 mt-1">
                            <button
                              className="text-primary hover:underline text-[10px]"
                              onClick={async () => {
                                try {
                                  const r = await generalDocsAdminApi.getDownloadUrl(slot.uploadedFile!.id);
                                  window.open(r.data.downloadUrl, "_blank");
                                } catch { toast.error("Could not load download URL"); }
                              }}
                            >Preview</button>
                            <span className="text-muted-foreground">·</span>
                            <button
                              className="text-destructive hover:underline text-[10px]"
                              onClick={() => {
                                if (confirm("Delete this upload?")) deleteMutation.mutate(slot.uploadedFile!.id);
                              }}
                            >Delete</button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Not uploaded</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Profiles tab ───────────────────────────────────────────────────────────────
function ProfilesTab({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newProfile, setNewProfile] = useState({ profileName: "", businessName: "", profileType: "business" });

  const { data, isLoading } = useQuery({
    queryKey: ["client-profiles", clientId],
    queryFn: () => profilesAdminApi.list(clientId),
  });
  const profiles: UserProfile[] = data?.data ?? [];

  const addMutation = useMutation({
    mutationFn: () => profilesAdminApi.create(clientId, { ...newProfile }),
    onSuccess: () => {
      toast.success("Profile added");
      setShowAdd(false);
      setNewProfile({ profileName: "", businessName: "", profileType: "business" });
      qc.invalidateQueries({ queryKey: ["client-profiles", clientId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => profilesAdminApi.delete(id),
    onSuccess: () => { toast.success("Profile removed"); qc.invalidateQueries({ queryKey: ["client-profiles", clientId] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-4 h-4 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold">Business Profiles</h3>
          <p className="text-xs text-muted-foreground">Manage multiple business contexts for this client</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" />Add Profile</Button>
      </div>

      <div className="space-y-2">
        {profiles.map((p) => (
          <Card key={p.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{p.profileName}</p>
              {p.businessName && <p className="text-xs text-muted-foreground">{p.businessName}</p>}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{p.profileType}</span>
                {p.isDefault && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Default</span>}
              </div>
            </div>
            {!p.isDefault && (
              <button
                className="text-xs text-destructive hover:underline"
                onClick={() => { if (confirm("Remove this profile?")) deleteMutation.mutate(p.id); }}
              >Remove</button>
            )}
          </Card>
        ))}
        {profiles.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground text-sm">
            No profiles configured. Add one to enable profile selection.
          </Card>
        )}
      </div>

      {showAdd && (
        <Card className="p-4 space-y-3">
          <p className="text-sm font-medium">New Profile</p>
          <div className="space-y-2">
            <Input placeholder="Profile name (e.g. Main Business)" value={newProfile.profileName}
              onChange={(e) => setNewProfile({ ...newProfile, profileName: e.target.value })} />
            <Input placeholder="Business name (optional)" value={newProfile.businessName}
              onChange={(e) => setNewProfile({ ...newProfile, businessName: e.target.value })} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !newProfile.profileName.trim()}>
              {addMutation.isPending ? "Adding…" : "Add Profile"}
            </Button>
          </div>
        </Card>
      )}
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