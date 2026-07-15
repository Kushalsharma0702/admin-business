import { FormField } from "@/lib/formTypes";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface Props { field: FormField; value: string; onChange: (v: string) => void; disabled?: boolean; error?: string; }

export function RadioField({ field, value, onChange, disabled, error }: Props) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</label>
      <RadioGroup value={value ?? ""} onValueChange={onChange} disabled={disabled} className="flex flex-col gap-2 mt-1">
        {(field.options ?? []).map((opt) => (
          <div key={opt.value} className="flex items-center gap-2">
            <RadioGroupItem id={`${field.id}-${opt.value}`} value={opt.value} />
            <Label htmlFor={`${field.id}-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
          </div>
        ))}
      </RadioGroup>
      {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
