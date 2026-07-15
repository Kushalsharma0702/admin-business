import { FormField } from "@/lib/formTypes";
import { Input } from "@/components/ui/input";

interface Props {
  field: FormField;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  error?: string;
}

export function TextField({ field, value, onChange, disabled, error }: Props) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">
        {field.label}{field.required && <span className="text-destructive ml-1">*</span>}
      </label>
      <Input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        disabled={disabled}
        className={error ? "border-destructive" : ""}
      />
      {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
