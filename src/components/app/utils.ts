export const initials = (name: string) =>
  name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

const palette = ["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-sky-500", "bg-violet-500", "bg-teal-500", "bg-fuchsia-500", "bg-orange-500", "bg-cyan-500"];
export const colorFor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};

export const fmtMoney = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

export const fmtDate = (s?: string) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  // A calendar date ("2026-11-16", or midnight UTC) must not shift to the
  // previous day in timezones west of UTC (the Atlantic-time admins saw 15 Nov).
  const calendarDate = /^\d{4}-\d{2}-\d{2}(T00:00:00(\.000)?Z)?$/.test(s);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", ...(calendarDate ? { timeZone: "UTC" } : {}) });
};

export const downloadCSV = (filename: string, rows: readonly Record<string, unknown>[] | readonly object[]) => {
  const list = rows as readonly Record<string, unknown>[];
  if (list.length === 0) {
    const blob = new Blob([""], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const headers = Object.keys(list[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...list.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// Which config key holds "how often" depends on the task type - Corporate Tax
// (filing + its installments) doesn't have one, it's just tied to fiscal year end.
export function taskFrequency(t: { taskType?: string | null; config?: unknown }): string {
  const c = t.config as Record<string, unknown> | undefined;
  const key = t.taskType === "BOOKKEEPING" ? "bookkeepingFrequency"
    : t.taskType === "HST" || t.taskType === "HST_QUARTERLY_PAYMENT" ? "salesTaxFrequency"
    : t.taskType === "PAYROLL" ? "payrollFrequency"
    : null;
  const v = key ? c?.[key] : undefined;
  return typeof v === "string" && v ? v : "—";
}
