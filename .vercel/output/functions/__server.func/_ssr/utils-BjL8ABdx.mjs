const initials = (name) => name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
const palette = ["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-sky-500", "bg-violet-500", "bg-teal-500", "bg-fuchsia-500", "bg-orange-500", "bg-cyan-500"];
const colorFor = (name) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = h * 31 + name.charCodeAt(i) >>> 0;
  return palette[h % palette.length];
};
const fmtMoney = (n, currency = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
const fmtDate = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const downloadCSV = (filename, rows) => {
  const list = rows;
  if (list.length === 0) {
    const blob2 = new Blob([""], { type: "text/csv" });
    const url2 = URL.createObjectURL(blob2);
    const a2 = document.createElement("a");
    a2.href = url2;
    a2.download = filename;
    a2.click();
    URL.revokeObjectURL(url2);
    return;
  }
  const headers = Object.keys(list[0]);
  const escape = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...list.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
export {
  fmtMoney as a,
  colorFor as c,
  downloadCSV as d,
  fmtDate as f,
  initials as i
};
