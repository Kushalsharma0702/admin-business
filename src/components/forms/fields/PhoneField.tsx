import { FormField } from "@/lib/formTypes";
import { Input } from "@/components/ui/input";

interface Props { field: FormField; value: string; onChange: (v: string) => void; disabled?: boolean; error?: string; }

export function PhoneField({ field, value, onChange, disabled, error }: Props) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</label>
      <Input type="tel" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder ?? "+1 (416) 555-0100"} disabled={disabled} className={error ? "border-destructive" : ""} />
      {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
