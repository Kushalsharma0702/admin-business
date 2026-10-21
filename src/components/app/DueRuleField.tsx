// DueRuleField — the Bookkeeping tab's "Due Date" control.
//
// Picks a repeat rule rather than a single date: each generated bookkeeping
// task falls due on the rule's first occurrence on or after its period ends.
// "Use the standard deadline" keeps whatever the frequency already implies
// (period end + 1 month for monthly/quarterly, + 3 for yearly), which is what
// every client configured before this field existed continues to get.
//
// The stored value is an object (see DueRule in lib/api). Keep it in sync with
// backend/src/schedule.js's normalizeDueRule — that is the authority on what a
// rule may contain, and it ignores anything it doesn't recognise.
import { Input } from "@/components/ui/input";
import type { DueRule } from "@/lib/api";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

type RuleType = DueRule["type"];

const TYPES: { value: RuleType; label: string }[] = [
  { value: "default", label: "Use the standard deadline for this frequency" },
  { value: "day",   label: "Every" },
  { value: "week",  label: "Every" },
  { value: "month", label: "Every" },
  { value: "year",  label: "Every" },
];

const UNIT: Record<Exclude<RuleType, "default">, [string, string]> = {
  day:   ["day", "days"],
  week:  ["week", "weeks"],
  month: ["month", "months"],
  year:  ["year", "years"],
};

export function describeDueRule(rule: DueRule | null | undefined): string {
  if (!rule || rule.type === "default") return "Standard deadline for the chosen frequency";
  const n = Math.max(1, Number(rule.interval) || 1);
  const [one, many] = UNIT[rule.type as Exclude<RuleType, "default">] ?? ["", ""];
  const every = n === 1 ? `Every ${one}` : `Every ${n} ${many}`;

  if (rule.type === "week") {
    const days = (rule.weekdays ?? []).map((d) => DAY_NAMES[d]).filter(Boolean);
    return days.length ? `${every} on ${days.join(", ")}` : every;
  }
  if (rule.type === "month") {
    const d = rule.dayOfMonth;
    return d === "last" ? `${every} on the last day` : d ? `${every} on day ${d}` : every;
  }
  if (rule.type === "year") {
    const m = rule.month ? MONTHS[rule.month - 1] : null;
    const d = rule.dayOfMonth === "last" ? "the last day" : rule.dayOfMonth;
    return m && d ? `${every} on ${m} ${d}` : every;
  }
  return every;
}

export function DueRuleField({
  value, onChange,
}: {
  value: DueRule | null | undefined;
  onChange: (v: DueRule | null) => void;
}) {
  const rule: DueRule = value && value.type ? value : { type: "default" };
  const interval = Math.max(1, Number(rule.interval) || 1);
  const weekdays = rule.weekdays ?? [];

  // Switching type keeps nothing from the previous one — a weekday list means
  // nothing to a monthly rule, and a stale value would be silently stored.
  const setType = (type: RuleType) => {
    if (type === "default") { onChange(null); return; }
    const next: DueRule = { type, interval: 1 };
    if (type === "week") next.weekdays = [new Date().getDay()];
    if (type === "month") next.dayOfMonth = 1;
    if (type === "year") { next.month = 1; next.dayOfMonth = 1; }
    onChange(next);
  };

  const patch = (p: Partial<DueRule>) => onChange({ ...rule, ...p });

  const toggleWeekday = (d: number) => {
    const next = weekdays.includes(d) ? weekdays.filter((x) => x !== d) : [...weekdays, d].sort();
    // At least one weekday must stay selected, otherwise the rule can't fire.
    patch({ weekdays: next.length ? next : weekdays });
  };

  const numberInput = (
    <Input
      type="number" min={1} max={52} value={interval}
      onChange={(e) => patch({ interval: Math.max(1, Math.min(52, Number(e.target.value) || 1)) })}
      className="h-8 w-16 text-center px-1"
      aria-label="Repeat interval"
    />
  );

  return (
    <div className="rounded-md border border-border divide-y divide-border bg-background">
      {TYPES.map((t) => {
        const selected = rule.type === t.value;
        const unitLabel = t.value === "default" ? null : UNIT[t.value][interval === 1 ? 0 : 1];
        return (
          <div key={t.value} className={selected ? "bg-muted/40" : ""}>
            <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer text-sm">
              <input
                type="radio"
                name="due-rule-type"
                className="h-4 w-4 accent-primary shrink-0"
                checked={selected}
                onChange={() => setType(t.value)}
              />
              <span className="flex items-center gap-2 flex-wrap">
                {t.label}
                {t.value !== "default" && (
                  <>
                    {selected ? numberInput : <span className="text-muted-foreground">1</span>}
                    <span>{unitLabel}</span>
                  </>
                )}
              </span>
            </label>

            {selected && t.value === "week" && (
              <div className="flex gap-1.5 px-3 pb-3 pl-10">
                {DAY_LABELS.map((d, i) => (
                  <button
                    key={i} type="button"
                    onClick={() => toggleWeekday(i)}
                    aria-pressed={weekdays.includes(i)}
                    aria-label={DAY_NAMES[i]}
                    className={`h-7 w-7 rounded-full text-xs font-medium border transition-colors ${
                      weekdays.includes(i)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}

            {selected && t.value === "month" && (
              <div className="flex items-center gap-2 px-3 pb-3 pl-10 text-sm">
                <span className="text-muted-foreground">on</span>
                <select
                  className="border border-border rounded-md h-8 px-2 text-sm bg-background"
                  value={String(rule.dayOfMonth ?? 1)}
                  onChange={(e) => patch({ dayOfMonth: e.target.value === "last" ? "last" : Number(e.target.value) })}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>day {d}</option>
                  ))}
                  <option value="last">the last day</option>
                </select>
              </div>
            )}

            {selected && t.value === "year" && (
              <div className="flex items-center gap-2 px-3 pb-3 pl-10 text-sm flex-wrap">
                <span className="text-muted-foreground">on</span>
                <select
                  className="border border-border rounded-md h-8 px-2 text-sm bg-background"
                  value={String(rule.month ?? 1)}
                  onChange={(e) => patch({ month: Number(e.target.value) })}
                >
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <select
                  className="border border-border rounded-md h-8 px-2 text-sm bg-background"
                  value={String(rule.dayOfMonth ?? 1)}
                  onChange={(e) => patch({ dayOfMonth: e.target.value === "last" ? "last" : Number(e.target.value) })}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                  <option value="last">last day</option>
                </select>
              </div>
            )}
          </div>
        );
      })}

      <div className="px-3 py-2 text-xs text-muted-foreground">
        {rule.type === "default"
          ? "Each bookkeeping task keeps the deadline its frequency implies."
          : <>Each task falls due on the first matching date on or after its period ends — <span className="text-foreground">{describeDueRule(rule)}</span>.</>}
      </div>
    </div>
  );
}
