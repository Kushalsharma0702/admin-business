// FormBuilder.tsx — drag-and-drop form schema editor
import { FormField, FieldType, FIELD_TYPES, FieldOption } from "@/lib/formTypes";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormRenderer } from "./FormRenderer";
import { Plus, Trash2, GripVertical, Eye, EyeOff, ChevronUp, ChevronDown } from "lucide-react";

const FIELD_LABELS: Record<FieldType, string> = {
  text: "Short Text", textarea: "Long Text", number: "Number", email: "Email",
  phone: "Phone", date: "Date", select: "Dropdown", checkbox: "Checkbox",
  radio: "Radio", file_upload: "File Upload", signature: "Signature",
};

function genId() { return `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

interface Props {
  initialSchema?: FormField[];
  onSchemaChange: (schema: FormField[]) => void;
}

export function FormBuilder({ initialSchema = [], onSchemaChange }: Props) {
  const [fields, setFields] = useState<FormField[]>(initialSchema);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const update = (next: FormField[]) => { setFields(next); onSchemaChange(next); };

  const addField = (type: FieldType) => {
    const newField: FormField = {
      id: genId(), type, label: FIELD_LABELS[type],
      required: false, order: fields.length + 1,
      ...(type === "select" || type === "radio" ? { options: [{ label: "Option 1", value: "option_1" }] } : {}),
    };
    const next = [...fields, newField];
    update(next);
    setSelectedId(newField.id);
  };

  const deleteField = (id: string) => {
    const next = fields.filter((f) => f.id !== id).map((f, i) => ({ ...f, order: i + 1 }));
    update(next);
    if (selectedId === id) setSelectedId(null);
  };

  const moveField = (id: string, dir: -1 | 1) => {
    const idx = fields.findIndex((f) => f.id === id);
    if (idx < 0) return;
    const next = [...fields];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    update(next.map((f, i) => ({ ...f, order: i + 1 })));
  };

  const updateFieldProp = (id: string, key: keyof FormField, value: unknown) => {
    const next = fields.map((f) => f.id === id ? { ...f, [key]: value } : f);
    update(next);
  };

  const updateOption = (fieldId: string, index: number, key: keyof FieldOption, value: string) => {
    const next = fields.map((f) => {
      if (f.id !== fieldId) return f;
      const opts = [...(f.options ?? [])];
      opts[index] = { ...opts[index], [key]: value };
      return { ...f, options: opts };
    });
    update(next);
  };

  const addOption = (fieldId: string) => {
    const next = fields.map((f) => {
      if (f.id !== fieldId) return f;
      const opts = [...(f.options ?? [])];
      opts.push({ label: `Option ${opts.length + 1}`, value: `option_${opts.length + 1}` });
      return { ...f, options: opts };
    });
    update(next);
  };

  const removeOption = (fieldId: string, index: number) => {
    const next = fields.map((f) => {
      if (f.id !== fieldId) return f;
      const opts = [...(f.options ?? [])];
      opts.splice(index, 1);
      return { ...f, options: opts };
    });
    update(next);
  };

  const selected = fields.find((f) => f.id === selectedId);

  if (preview) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Preview Mode</p>
          <Button variant="outline" size="sm" onClick={() => setPreview(false)}>
            <EyeOff className="h-4 w-4 mr-2" />Back to Editor
          </Button>
        </div>
        <div className="border rounded-lg p-6">
          <FormRenderer schema={fields} mode="fill" taskId="preview" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 min-h-[500px]">
      {/* Left — Field Palette */}
      <div className="w-44 shrink-0 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Add Field</p>
        {FIELD_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => addField(type)}
            className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors flex items-center gap-2"
          >
            <Plus className="h-3.5 w-3.5 text-primary shrink-0" />
            {FIELD_LABELS[type]}
          </button>
        ))}
      </div>

      <Separator orientation="vertical" />

      {/* Center — Canvas */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            {fields.length} field{fields.length !== 1 ? "s" : ""}
          </p>
          <Button variant="ghost" size="sm" onClick={() => setPreview(true)} disabled={fields.length === 0}>
            <Eye className="h-4 w-4 mr-2" />Preview
          </Button>
        </div>

        {fields.length === 0 ? (
          <div className="border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground">
            <p className="text-sm">Click a field type on the left to add it to the form</p>
          </div>
        ) : (
          fields.map((field, idx) => (
            <div
              key={field.id}
              onClick={() => setSelectedId(field.id)}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedId === field.id ? "border-primary bg-primary/5" : "hover:border-muted-foreground/40"
              }`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate">{field.label}</span>
                <div className="flex gap-1.5 mt-1">
                  <Badge variant="secondary" className="text-[10px]">{field.type}</Badge>
                  {field.required && <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">required</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={(e) => { e.stopPropagation(); moveField(field.id, -1); }} disabled={idx === 0} className="p-1 hover:bg-muted rounded disabled:opacity-30">
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); moveField(field.id, 1); }} disabled={idx === fields.length - 1} className="p-1 hover:bg-muted rounded disabled:opacity-30">
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); deleteField(field.id); }} className="p-1 hover:bg-destructive/10 rounded text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Separator orientation="vertical" />

      {/* Right — Field Config */}
      <div className="w-64 shrink-0">
        {selected ? (
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Field Settings</p>

            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input value={selected.label} onChange={(e) => updateFieldProp(selected.id, "label", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Placeholder</Label>
              <Input value={selected.placeholder ?? ""} onChange={(e) => updateFieldProp(selected.id, "placeholder", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Help text</Label>
              <Input value={selected.helpText ?? ""} onChange={(e) => updateFieldProp(selected.id, "helpText", e.target.value)} />
            </div>

            <div className="flex items-center justify-between">
              <Label>Required</Label>
              <Switch checked={selected.required} onCheckedChange={(v) => updateFieldProp(selected.id, "required", v)} />
            </div>

            {selected.type === "number" && (
              <>
                <div className="flex gap-2">
                  <div className="space-y-1 flex-1"><Label>Min</Label><Input type="number" value={selected.min ?? ""} onChange={(e) => updateFieldProp(selected.id, "min", Number(e.target.value))} /></div>
                  <div className="space-y-1 flex-1"><Label>Max</Label><Input type="number" value={selected.max ?? ""} onChange={(e) => updateFieldProp(selected.id, "max", Number(e.target.value))} /></div>
                </div>
              </>
            )}

            {selected.type === "file_upload" && (
              <div className="space-y-1.5">
                <Label>Max size (MB)</Label>
                <Input type="number" value={selected.maxSizeMb ?? 10} onChange={(e) => updateFieldProp(selected.id, "maxSizeMb", Number(e.target.value))} />
              </div>
            )}

            {(selected.type === "select" || selected.type === "radio") && (
              <div className="space-y-2">
                <Label>Options</Label>
                {(selected.options ?? []).map((opt, i) => (
                  <div key={i} className="flex gap-1.5 items-center">
                    <Input className="h-7 text-xs" value={opt.label} onChange={(e) => updateOption(selected.id, i, "label", e.target.value)} placeholder="Label" />
                    <button type="button" onClick={() => removeOption(selected.id, i)} className="shrink-0 text-destructive hover:text-destructive/80">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <Button type="button" variant="ghost" size="sm" className="w-full text-xs h-7" onClick={() => addOption(selected.id)}>
                  <Plus className="h-3 w-3 mr-1" />Add option
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground text-sm py-8">
            Select a field to configure it
          </div>
        )}
      </div>
    </div>
  );
}
