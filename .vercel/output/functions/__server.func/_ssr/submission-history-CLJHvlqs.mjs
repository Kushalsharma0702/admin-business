import { V as reactExports, K as jsxRuntimeExports } from "./index.mjs";
import { L as ListPage } from "./ListPage-DwCHn9Xa.mjs";
import { a as useAppStore } from "./useAppStore-DqzUQQt1.mjs";
import { S as StatusBadge } from "./StatusBadge-uIqVQAhZ.mjs";
import { f as fmtDate, d as downloadCSV } from "./utils-BjL8ABdx.mjs";
import { B as Button } from "./button-A6qM_v8i.mjs";
import { I as Input } from "./input-CsecQHmO.mjs";
import { D as Download } from "./download-BJ5LkEki.mjs";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./AppShell-BCNUyQp7.mjs";
import "./router-CxdnWRBk.mjs";
import "./index-De8JtfrF.mjs";
import "./createLucideIcon-B0qOMXcq.mjs";
import "./dialog-iHg5lQpM.mjs";
import "./index-BSEENsC1.mjs";
import "./index-H_3XM99b.mjs";
function SubmissionHistoryPage() {
  const {
    submissions
  } = useAppStore();
  const [tab, setTab] = reactExports.useState("costs");
  const [q, setQ] = reactExports.useState("");
  const filtered = submissions.filter((s) => s.itemId.toLowerCase().includes(q.toLowerCase()) || s.submittedBy.toLowerCase().includes(q.toLowerCase()));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ListPage, { title: "Submission History", subtitle: `${submissions.length} records`, actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: () => downloadCSV("submissions.csv", submissions), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-4 h-4 mr-1" }),
    "Export history"
  ] }), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-1 mb-3", children: [["costs", "Costs and sales"], ["statements", "Supplier statements"], ["vault", "Vault"]].map(([k, l]) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setTab(k), className: `px-3 py-1.5 text-sm rounded-md ${tab === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`, children: l }, k)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { placeholder: "Search…", value: q, onChange: (e) => setQ(e.target.value), className: "max-w-sm mb-4" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-card rounded-lg border border-border overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Item ID" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Submitted at" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Submitted by" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Method" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Owned by" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Date" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: filtered.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border last:border-0 hover:bg-muted/40", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: s.status }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 font-medium", children: s.itemId }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: s.submittedAt }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: s.submittedBy }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: s.method }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: s.ownedBy }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: fmtDate(s.date) })
      ] }, s.id)) })
    ] }) })
  ] });
}
export {
  SubmissionHistoryPage as component
};
