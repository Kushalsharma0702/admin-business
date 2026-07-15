import { FormField } from "@/lib/formTypes";
import { Textarea } from "@/components/ui/textarea";

interface Props { field: FormField; value: string; onChange: (v: string) => void; disabled?: boolean; error?: string; }

export function TextareaField({ field, value, onChange, disabled, error }: Props) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</label>
      <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} disabled={disabled} rows={field.rows ?? 4} className={error ? "border-destructive" : ""} />
      {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
