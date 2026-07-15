import { FormField } from "@/lib/formTypes";
import { Input } from "@/components/ui/input";

interface Props { field: FormField; value: string; onChange: (v: string) => void; disabled?: boolean; error?: string; }

export function NumberField({ field, value, onChange, disabled, error }: Props) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</label>
      <Input type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} disabled={disabled} min={field.min} max={field.max} step={field.step} className={error ? "border-destructive" : ""} />
      {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
