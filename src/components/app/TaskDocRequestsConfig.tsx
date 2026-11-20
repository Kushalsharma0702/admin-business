// TaskDocRequestsConfig — "Documents requested from the client", per task.
//
// Same editor shape as GeneralDocsConfig (field name, key, placeholder,
// required, max count, accepted types, notes), but scoped to one task and
// deliberately allowing the SAME document type to be added more than once:
// "Business Bank Statements …0010" and "…0547" are two independent requests
// with their own keys, uploads and completion state. That is why quick-add
// here doesn't disable an already-added suggestion the way the General Docs
// editor does — it appends a numbered duplicate instead.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, ChevronDown, ChevronUp, FileText, Download, Paperclip } from "lucide-react";
import type { TaskDocRequest, TaskDocRequirement } from "@/lib/api";

const FILE_TYPE_OPTIONS = ["pdf", "jpg", "jpeg", "png", "xls", "xlsx", "doc", "docx", "csv"];

// Every request accepts all file types and any number of files (the backend
// caps a request at MAX_FILES slots); the client's uploads come back as a zip.
const MAX_FILES = 50;

const SUGGESTED: { name: string }[] = [
  { name: "Business Bank Statements" },
  { name: "Business Credit Card Statements" },
  { name: "Loan Statements" },
  { name: "Line of Credit Statement" },
  { name: "Purchase / Expense Details" },
  { name: "Sales Invoices" },
  { name: "Sales Excel Sheet" },
  { name: "Cancelled Cheque" },
  { name: "Others" },
];

export type RequestDraft = Partial<TaskDocRequest>;

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function toRequestDraft(r: Partial<TaskDocRequest>, idx: number): RequestDraft {
  return {
    key:           r.key || "",
    name:          r.name || "",
    placeholder:   r.placeholder || "",
    required:      r.required ?? true,
    maxCount:      MAX_FILES,
    acceptedTypes: FILE_TYPE_OPTIONS,
    notes:         r.notes || "",
    done:          r.done ?? false,
    displayOrder:  r.displayOrder ?? idx + 1,
  };
}

export function TaskDocRequestsConfig({
  value, onChange, requirements, onDownload, onDownloadAll, downloadingAll,
}: {
  value: RequestDraft[];
  onChange: (v: RequestDraft[]) => void;
  /** Live upload state from the server, keyed by request key — omitted for an unsaved task. */
  requirements?: TaskDocRequirement[];
  onDownload?: (documentId: string) => void;
  onDownloadAll?: () => void;
  downloadingAll?: boolean;
}) {
  // Keyed by list position, like GeneralDocsConfig: rows live in the parent's
  // state and are rebuilt every render, so position is the only identity that
  // survives a keystroke.
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const fields = value.map(toRequestDraft);
  const byKey = new Map((requirements ?? []).map((r) => [r.key, r]));
  const uploadedTotal = (requirements ?? []).reduce((n, r) => n + r.uploadedCount, 0);

  const update = (next: RequestDraft[]) =>
    onChange(next.map((f, i) => ({ ...f, displayOrder: i + 1 })));

  // Keys must stay unique or two requests share one upload bucket. The backend
  // enforces this too; doing it here keeps what the admin sees honest.
  const uniqueKey = (base: string, skipIdx = -1) => {
    const taken = new Set(fields.filter((_, i) => i !== skipIdx).map((f) => f.key).filter(Boolean));
    if (!base) return "";
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(`${base}_${n}`)) n++;
    return `${base}_${n}`;
  };

  const addSuggested = (s: typeof SUGGESTED[number]) => {
    setExpanded((e) => ({ ...e, [fields.length]: false }));
    update([...fields, {
      key: uniqueKey(slugify(s.name)), name: s.name, placeholder: `Upload ${s.name.toLowerCase()}`,
      required: true, maxCount: MAX_FILES, acceptedTypes: FILE_TYPE_OPTIONS, notes: "",
      displayOrder: fields.length + 1,
    }]);
  };

  const addBlank = () => {
    setExpanded((e) => ({ ...e, [fields.length]: true }));
    update([...fields, {
      key: "", name: "", placeholder: "", required: true, maxCount: MAX_FILES,
      acceptedTypes: FILE_TYPE_OPTIONS, notes: "", displayOrder: fields.length + 1,
    }]);
  };

  const removeField = (idx: number) => {
    setExpanded((e) => {
      const next: Record<number, boolean> = {};
      for (const k of Object.keys(e)) {
        const i = Number(k);
        if (i < idx) next[i] = e[i];
        else if (i > idx) next[i - 1] = e[i];
      }
      return next;
    });
    update(fields.filter((_, i) => i !== idx));
  };

  const patchField = (idx: number, patch: Partial<RequestDraft>) =>
    update(fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)));

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Documents requested</p>
          <p className="text-xs text-muted-foreground">
            What the client is asked to upload for this task. Add the same type twice to collect
            two of them (e.g. two bank accounts).
          </p>
        </div>
        {onDownloadAll && uploadedTotal > 0 && (
          <Button type="button" size="sm" variant="outline" onClick={onDownloadAll} disabled={downloadingAll} className="shrink-0">
            <Download className="h-3.5 w-3.5 mr-1" />
            {downloadingAll ? "Preparing…" : `Download all (${uploadedTotal})`}
          </Button>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Quick add</p>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED.map((s) => (
            <button
              key={s.name} type="button" onClick={() => addSuggested(s)}
              className="text-xs px-2 py-1 rounded-full border border-primary/40 text-primary hover:bg-primary/10"
            >
              + {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {fields.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">
            No documents requested yet — the client sees no upload section for this task.
          </p>
        )}
        {fields.map((f, idx) => {
          const live = f.key ? byKey.get(f.key) : undefined;
          const uploads = (live?.slots ?? []).filter((s) => s.uploadedFile);
          return (
            <Card key={idx} className="p-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {f.name || <span className="text-muted-foreground italic">Unnamed request</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {f.required ? <span className="text-destructive">Required</span> : <span>Optional</span>}
                    {live && <> · <span className="text-foreground">{live.uploadedCount} uploaded</span></>}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button" size="sm" variant={f.done ? "secondary" : "outline"} className="h-7 text-xs"
                    onClick={() => patchField(idx, { done: !f.done })}
                  >
                    {f.done ? "Done ✓" : "Mark as done"}
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => setExpanded((e) => ({ ...e, [idx]: !e[idx] }))}>
                    {expanded[idx] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeField(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Files the client has already sent for this request. */}
              {uploads.length > 0 && (
                <div className="mt-2 space-y-1">
                  {uploads.map((s) => (
                    <button
                      key={s.slotIndex} type="button"
                      onClick={() => s.uploadedFile && onDownload?.(s.uploadedFile.id)}
                      className="w-full flex items-center gap-1.5 text-xs bg-muted/40 rounded px-2 py-1 text-left hover:bg-muted"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate flex-1">{s.uploadedFile!.fileName}</span>
                      <Download className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {expanded[idx] && (
                <div className="mt-3 grid gap-3 border-t pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 pt-1">
                      <Switch
                        checked={f.required ?? false}
                        onCheckedChange={(v) => patchField(idx, { required: v })}
                        id={`task-doc-req-${idx}`}
                      />
                      <Label htmlFor={`task-doc-req-${idx}`} className="text-xs">Required</Label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Notes (shown to client)</Label>
                    <Textarea
                      value={f.notes || ""}
                      onChange={(e) => patchField(idx, { notes: e.target.value })}
                      placeholder="Additional instructions or context"
                      rows={2}
                      className="text-sm resize-none"
                    />
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addBlank} className="w-full">
        <Plus className="h-4 w-4 mr-1" />
        Add Custom Request
      </Button>

      {(requirements?.length ?? 0) > 0 && uploadedTotal === 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Paperclip className="h-3 w-3" /> The client hasn't uploaded anything yet.
        </p>
      )}
    </div>
  );
}
