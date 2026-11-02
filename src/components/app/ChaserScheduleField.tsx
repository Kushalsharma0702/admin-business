// ChaserScheduleField — the Bookkeeping tab's "Chaser Email Schedule" control.
//
// Lets an admin replace the standard reminder cadence for this client with
// their own: how soon after a task opens the first email goes, how often it
// repeats, how long it keeps going, plus any one-off extra dates.
//
// Limits mirror backend/src/chaser-schedule.js (which re-clamps on save and is
// the authority). Emails still only leave inside the send window — weekends,
// bank holidays, Mondays before 1 pm — and stop when the task is closed.
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { ChaserSchedule } from "@/lib/api";

const DEFAULTS = { intervalDays: 2, startOffsetDays: 0, durationDays: 14 };

export function describeChaserSchedule(v: ChaserSchedule | null | undefined): string {
  if (!v || v.mode !== "custom") return "Standard reminder cadence for the chosen frequency";
  const extra = v.extraDates?.length ? ` plus ${v.extraDates.length} extra date${v.extraDates.length > 1 ? "s" : ""}` : "";
  return `Every ${v.intervalDays} day(s), starting ${v.startOffsetDays} day(s) after the task opens, for ${v.durationDays} days${extra}`;
}

export function ChaserScheduleField({
  value, onChange,
}: {
  value: ChaserSchedule | null | undefined;
  onChange: (v: ChaserSchedule | null) => void;
}) {
  const [newDate, setNewDate] = useState("");
  const custom = value?.mode === "custom";
  const v: Required<Omit<ChaserSchedule, "mode">> = {
    intervalDays:    value?.intervalDays    ?? DEFAULTS.intervalDays,
    startOffsetDays: value?.startOffsetDays ?? DEFAULTS.startOffsetDays,
    durationDays:    value?.durationDays    ?? DEFAULTS.durationDays,
    extraDates:      value?.extraDates      ?? [],
  };
  const patch = (p: Partial<ChaserSchedule>) => onChange({ mode: "custom", ...v, ...p });

  const num = (label: string, key: "intervalDays" | "startOffsetDays" | "durationDays", min: number, max: number, suffix: string) => (
    <label className="flex items-center gap-2 text-sm">
      <span className="w-44 text-muted-foreground">{label}</span>
      <Input
        type="number" min={min} max={max} value={v[key]} className="h-8 w-20 text-center px-1"
        onChange={(e) => patch({ [key]: Math.max(min, Math.min(max, Math.trunc(Number(e.target.value)) || min)) })}
      />
      <span className="text-muted-foreground">{suffix}</span>
    </label>
  );

  const addDate = () => {
    if (!newDate || v.extraDates.includes(newDate) || v.extraDates.length >= 20) return;
    patch({ extraDates: [...v.extraDates, newDate].sort() });
    setNewDate("");
  };

  return (
    <div className="rounded-md border border-border divide-y divide-border bg-background">
      <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer text-sm">
        <input type="radio" name="chaser-mode" className="h-4 w-4 accent-primary" checked={!custom} onChange={() => onChange(null)} />
        Use the standard reminder cadence for this frequency
      </label>
      <div className={custom ? "bg-muted/40" : ""}>
        <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer text-sm">
          <input type="radio" name="chaser-mode" className="h-4 w-4 accent-primary" checked={custom} onChange={() => patch({})} />
          Custom schedule
        </label>
        {custom && (
          <div className="px-3 pb-3 pl-10 space-y-2">
            {num("Send a reminder every", "intervalDays", 1, 30, "day(s)")}
            {num("First email", "startOffsetDays", 0, 60, "day(s) after the task opens")}
            {num("Keep reminding for", "durationDays", 1, 120, "days")}
            <div className="pt-1">
              <p className="text-sm text-muted-foreground mb-1">Extra one-off dates</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {v.extraDates.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                {v.extraDates.map((d) => (
                  <span key={d} className="inline-flex items-center gap-1 text-xs rounded-full border border-border px-2 py-0.5">
                    {d}
                    <button type="button" aria-label={`Remove ${d}`} onClick={() => patch({ extraDates: v.extraDates.filter((x) => x !== d) })}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-8 w-44" />
                <Button type="button" size="sm" variant="outline" className="h-8" onClick={addDate} disabled={!newDate}>Add date</Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Emails only go out Tuesday–Friday from 9:00 AM (Monday from 1:00 PM) Atlantic time, never on
              Canadian bank holidays, and stop once the task is closed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
