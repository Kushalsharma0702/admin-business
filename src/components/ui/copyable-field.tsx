import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CopyableFieldProps {
  label: string;
  value: string | number | undefined | null;
  className?: string;
  /** Render inline (no border/bg), useful inside sidebar or dense layouts */
  inline?: boolean;
}

export function CopyableField({ label, value, className, inline = false }: CopyableFieldProps) {
  const [copied, setCopied] = useState(false);

  const displayValue = value === undefined || value === null || value === "" ? "—" : String(value);
  const isEmpty = displayValue === "—";

  const handleCopy = async () => {
    if (isEmpty) return;
    try {
      await navigator.clipboard.writeText(displayValue);
      setCopied(true);
      toast.success(`Copied: ${displayValue}`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  if (inline) {
    return (
      <div className={cn("group", className)}>
        <div className="text-muted-foreground uppercase text-[10px] font-semibold mb-0.5">{label}</div>
        <div className="flex items-center gap-1">
          <span className={cn("text-foreground flex-1", isEmpty && "text-muted-foreground")}>{displayValue}</span>
          {!isEmpty && (
            <button
              type="button"
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              title={`Copy ${label}`}
            >
              {copied ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/20 px-3 py-2 transition-colors hover:bg-muted/40 hover:border-border",
        className,
      )}
    >
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-semibold uppercase text-muted-foreground block">{label}</span>
        <p className={cn("text-sm font-medium mt-0.5 truncate", isEmpty && "text-muted-foreground italic")}>
          {displayValue}
        </p>
      </div>
      {!isEmpty && (
        <button
          type="button"
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1 rounded hover:bg-muted"
          title={`Copy ${label}`}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
      )}
    </div>
  );
}
