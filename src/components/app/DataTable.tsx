import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronUp, ChevronDown } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: "left" | "right" | "center";
}

export function DataTable<T extends { id: string }>({
  columns, data, selectable, onRowClick, selected, onSelectedChange, empty,
}: {
  columns: Column<T>[];
  data: T[];
  selectable?: boolean;
  onRowClick?: (row: T) => void;
  selected?: string[];
  onSelectedChange?: (ids: string[]) => void;
  empty?: ReactNode;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const av = (a as Record<string, unknown>)[sortKey];
        const bv = (b as Record<string, unknown>)[sortKey];
        const ord = (av ?? "") < (bv ?? "") ? -1 : (av ?? "") > (bv ?? "") ? 1 : 0;
        return sortDir === "asc" ? ord : -ord;
      })
    : data;

  const toggleAll = () => {
    if (!onSelectedChange) return;
    if (selected && selected.length === data.length) onSelectedChange([]);
    else onSelectedChange(data.map((d) => d.id));
  };
  const toggle = (id: string) => {
    if (!onSelectedChange || !selected) return;
    onSelectedChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  if (data.length === 0 && empty) return <>{empty}</>;

  return (
    <div className="overflow-x-auto bg-card rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            {selectable && (
              <th className="w-10 px-3 py-2.5">
                <Checkbox checked={selected ? selected.length === data.length && data.length > 0 : false} onCheckedChange={toggleAll} />
              </th>
            )}
            {columns.map((c) => (
              <th
                key={c.key}
                style={{ width: c.width }}
                className={cn(
                  "px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide",
                  c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                  c.sortable && "cursor-pointer select-none hover:text-foreground",
                )}
                onClick={() => {
                  if (!c.sortable) return;
                  if (sortKey === c.key) setSortDir(sortDir === "asc" ? "desc" : "asc");
                  else { setSortKey(c.key); setSortDir("asc"); }
                }}
              >
                <span className="inline-flex items-center gap-1">
                  {c.header}
                  {c.sortable && sortKey === c.key && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.id}
              className={cn("border-b border-border last:border-0 hover:bg-muted/40 transition-colors", onRowClick && "cursor-pointer")}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('[data-stop-row]')) return;
                onRowClick?.(row);
              }}
            >
              {selectable && (
                <td className="px-3 py-2.5" data-stop-row>
                  <Checkbox checked={selected?.includes(row.id) ?? false} onCheckedChange={() => toggle(row.id)} />
                </td>
              )}
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    "px-3 py-2.5 text-foreground",
                    c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                  )}
                >
                  {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}