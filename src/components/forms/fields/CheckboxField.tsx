import { FormField } from "@/lib/formTypes";
import { Checkbox } from "@/components/ui/checkbox";

interface Props { field: FormField; value: boolean; onChange: (v: boolean) => void; disabled?: boolean; error?: string; }

export function CheckboxField({ field, value, onChange, disabled, error }: Props) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Checkbox id={field.id} checked={!!value} onCheckedChange={(checked) => onChange(!!checked)} disabled={disabled} />
        <label htmlFor={field.id} className="text-sm font-medium cursor-pointer">
          {field.label}{field.required && <span className="text-destructive ml-1">*</span>}
        </label>
      </div>
      {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
