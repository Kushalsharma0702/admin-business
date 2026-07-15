// GeneralDocsConfig — admin UI for configuring a client's General Documentation
// Used in: (1) Invite Dialog, (2) Client Detail "general-docs" tab
import { useState } from "react";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import { Switch }  from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import type { GeneralDocField } from "@/lib/api";

const FILE_TYPE_OPTIONS = ["pdf", "jpg", "jpeg", "png", "xls", "xlsx", "doc", "docx", "csv"];

const SUGGESTED_FIELDS: Omit<GeneralDocField, "displayOrder">[] = [
  { key: "business_bank_statements", name: "Business Bank Statements",       placeholder: "Upload bank statements",         required: true,  maxCount: 3, acceptedTypes: ["pdf","jpg","png"],          notes: "" },
  { key: "business_credit_card",     name: "Business Credit Card Statements", placeholder: "Upload credit card statements",  required: true,  maxCount: 3, acceptedTypes: ["pdf","jpg","png"],          notes: "" },
  { key: "loan_statements",          name: "Loan Statements",                 placeholder: "Upload loan statements",         required: false, maxCount: 2, acceptedTypes: ["pdf","jpg","png"],          notes: "" },
  { key: "loc_statement",            name: "Line of Credit Statement",        placeholder: "Upload line of credit statement",required: false, maxCount: 1, acceptedTypes: ["pdf","jpg","png"],          notes: "" },
  { key: "purchase_expense",         name: "Purchase / Expense Details",      placeholder: "Upload expense documents",       required: false, maxCount: 5, acceptedTypes: ["pdf","jpg","png","xlsx"],   notes: "" },
  { key: "gst_certificate",          name: "GST Certificate",                 placeholder: "Upload GST certificate",         required: false, maxCount: 1, acceptedTypes: ["pdf","jpg","png"],          notes: "" },
  { key: "cancelled_cheque",         name: "Cancelled Cheque",                placeholder: "Upload cancelled cheque",        required: false, maxCount: 1, acceptedTypes: ["pdf","jpg","png"],          notes: "" },
  { key: "pan_card",                 name: "PAN",                             placeholder: "Upload PAN card",                required: false, maxCount: 1, acceptedTypes: ["pdf","jpg","png"],          notes: "" },
  { key: "electricity_bill",         name: "Electricity Bill",                placeholder: "Upload electricity bill",        required: false, maxCount: 1, acceptedTypes: ["pdf","jpg","png"],          notes: "" },
  { key: "sales_invoices",           name: "Sales Invoices",                  placeholder: "Upload sales invoices",          required: false, maxCount: 5, acceptedTypes: ["pdf","jpg","png","xlsx"],   notes: "" },
];

interface Props {
  value: { enabled: boolean; fields: Partial<GeneralDocField>[] };
  onChange: (v: { enabled: boolean; fields: Partial<GeneralDocField>[] }) => void;
  compact?: boolean;
}

type FieldDraft = Partial<GeneralDocField> & { _id: string };

function uid() { return Math.random().toString(36).slice(2); }

function toFieldDraft(f: Partial<GeneralDocField>, idx: number): FieldDraft {
  return {
    _id:          f.key ? `${f.key}_${idx}` : uid(),
    key:          f.key || "",
    name:         f.name || "",
    placeholder:  f.placeholder || "",
    required:     f.required ?? false,
    maxCount:     f.maxCount ?? 1,
    acceptedTypes: f.acceptedTypes ?? ["pdf","jpg","jpeg","png"],
    notes:        f.notes || "",
    displayOrder: f.displayOrder ?? idx + 1,
  };
}

export function GeneralDocsConfig({ value, onChange, compact }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fields: FieldDraft[] = (value.fields || []).map(toFieldDraft);

  function update(updatedFields: FieldDraft[]) {
    onChange({
      enabled: value.enabled,
      fields: updatedFields.map(({ _id, ...rest }, i) => ({ ...rest, displayOrder: i + 1 })),
    });
  }

  function toggleEnabled(v: boolean) {
    onChange({ enabled: v, fields: value.fields });
  }

  function addBlank() {
    const draft: FieldDraft = {
      _id: uid(), key: "", name: "", placeholder: "",
      required: false, maxCount: 1, acceptedTypes: ["pdf","jpg","jpeg","png"],
      notes: "", displayOrder: fields.length + 1,
    };
    const next = [...fields, draft];
    setExpanded((e) => ({ ...e, [draft._id]: true }));
    update(next);
  }

  function addSuggested(s: typeof SUGGESTED_FIELDS[number]) {
    const exists = fields.some((f) => f.key === s.key);
    if (exists) return;
    const draft: FieldDraft = { _id: uid(), ...s, displayOrder: fields.length + 1 };
    const next = [...fields, draft];
    setExpanded((ex) => ({ ...ex, [draft._id]: false }));
    update(next);
  }

  function removeField(id: string) {
    update(fields.filter((f) => f._id !== id));
  }

  function patchField(id: string, patch: Partial<FieldDraft>) {
    update(fields.map((f) => f._id === id ? { ...f, ...patch } : f));
  }

  function toggleExpand(id: string) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  }

  const alreadyAdded = new Set(fields.map((f) => f.key).filter(Boolean));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">General Documentation</p>
          <p className="text-xs text-muted-foreground">
            Documents the client must upload before tasks are assigned
          </p>
        </div>
        <Switch checked={value.enabled} onCheckedChange={toggleEnabled} />
      </div>

      {value.enabled && (
        <>
          {/* Quick-add from suggestions */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Quick add</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_FIELDS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  disabled={alreadyAdded.has(s.key)}
                  onClick={() => addSuggested(s)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    alreadyAdded.has(s.key)
                      ? "bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50"
                      : "border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
                  }`}
                >
                  + {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Field list */}
          <div className="space-y-2">
            {fields.map((f, idx) => (
              <Card key={f._id} className="p-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {f.name || <span className="text-muted-foreground italic">Unnamed field</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Max {f.maxCount} file{(f.maxCount ?? 1) > 1 ? "s" : ""} ·{" "}
                      {f.required ? (
                        <span className="text-destructive">Required</span>
                      ) : (
                        <span>Optional</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => toggleExpand(f._id)}>
                      {expanded[f._id]
                        ? <ChevronUp className="h-4 w-4" />
                        : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeField(f._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {expanded[f._id] && (
                  <div className="mt-3 grid gap-3 border-t pt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Field Name</Label>
                        <Input
                          value={f.name || ""}
                          onChange={(e) => {
                            const name = e.target.value;
                            const key = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
                            patchField(f._id, { name, key: f.key || key });
                          }}
                          placeholder="e.g. Bank Statements"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Key (auto-generated)</Label>
                        <Input
                          value={f.key || ""}
                          onChange={(e) => patchField(f._id, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                          placeholder="bank_statements"
                          className="h-8 text-sm font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Placeholder</Label>
                      <Input
                        value={f.placeholder || ""}
                        onChange={(e) => patchField(f._id, { placeholder: e.target.value })}
                        placeholder="Instructions shown to client"
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Max Upload Count</Label>
                        <Input
                          type="number"
                          min={1} max={50}
                          value={f.maxCount ?? 1}
                          onChange={(e) => patchField(f._id, { maxCount: Math.max(1, Math.min(50, Number(e.target.value))) })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-5">
                        <Switch
                          checked={f.required ?? false}
                          onCheckedChange={(v) => patchField(f._id, { required: v })}
                          id={`req-${f._id}`}
                        />
                        <Label htmlFor={`req-${f._id}`} className="text-xs">Required</Label>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Accepted File Types</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {FILE_TYPE_OPTIONS.map((t) => {
                          const selected = (f.acceptedTypes ?? []).includes(t);
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                const cur = f.acceptedTypes ?? [];
                                patchField(f._id, {
                                  acceptedTypes: selected
                                    ? cur.filter((x) => x !== t)
                                    : [...cur, t],
                                });
                              }}
                              className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                                selected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-border text-muted-foreground hover:border-primary"
                              }`}
                            >
                              .{t}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Notes (shown to client)</Label>
                      <Textarea
                        value={f.notes || ""}
                        onChange={(e) => patchField(f._id, { notes: e.target.value })}
                        placeholder="Additional instructions or context"
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>

          <Button type="button" variant="outline" size="sm" onClick={addBlank} className="w-full">
            <Plus className="h-4 w-4 mr-1" />
            Add Custom Field
          </Button>
        </>
      )}
    </div>
  );
}
