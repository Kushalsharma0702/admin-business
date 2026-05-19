import { K as jsxRuntimeExports } from "./index.mjs";
import { a as cn$1 } from "./index-De8JtfrF.mjs";
const map = {
  "With Client": "bg-amber-100 text-amber-800 border-amber-200",
  "In Progress": "bg-sky-100 text-sky-800 border-sky-200",
  "Review": "bg-violet-100 text-violet-800 border-violet-200",
  "Completed": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Processing": "bg-slate-100 text-slate-700 border-slate-200",
  "To review": "bg-amber-100 text-amber-800 border-amber-200",
  "Ready": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Paid": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Unpaid": "bg-rose-100 text-rose-800 border-rose-200",
  "Draft": "bg-slate-100 text-slate-700 border-slate-200",
  "Archived": "bg-slate-100 text-slate-700 border-slate-200",
  "Active": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Pending": "bg-amber-100 text-amber-800 border-amber-200",
  "Reconciled": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Overdue": "bg-rose-100 text-rose-800 border-rose-200",
  "With client": "bg-amber-100 text-amber-800 border-amber-200",
  "High": "bg-rose-100 text-rose-800 border-rose-200",
  "Medium": "bg-amber-100 text-amber-800 border-amber-200",
  "Low": "bg-sky-100 text-sky-800 border-sky-200",
  "No priority": "bg-slate-100 text-slate-600 border-slate-200"
};
function StatusBadge({ status }) {
  const cls = map[status] || "bg-slate-100 text-slate-700 border-slate-200";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: cn$1("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border", cls), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-current opacity-70" }),
    status
  ] });
}
export {
  StatusBadge as S
};
