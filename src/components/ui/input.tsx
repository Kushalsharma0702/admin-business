import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";

const INPUT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

// Every type="password" field gets a show/hide (eye) toggle automatically.
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    if (type === "password") {
      return (
        <div className="relative w-full">
          <input
            type={visible ? "text" : "password"}
            className={cn(INPUT_CLASS, "pr-10", className)}
            ref={ref}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
            aria-label={visible ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      );
    }

    return <input type={type} className={cn(INPUT_CLASS, className)} ref={ref} {...props} />;
  },
);
Input.displayName = "Input";

export { Input };
