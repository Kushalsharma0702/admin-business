import { V as reactExports, K as jsxRuntimeExports } from "./index.mjs";
import { L as ListPage } from "./ListPage-DwCHn9Xa.mjs";
import { a as useAppStore } from "./useAppStore-DqzUQQt1.mjs";
import { D as DataTable } from "./DataTable-CQS5Fzdd.mjs";
import { S as StatusBadge } from "./StatusBadge-uIqVQAhZ.mjs";
import { B as Button } from "./button-A6qM_v8i.mjs";
import { I as Input } from "./input-CsecQHmO.mjs";
import { f as fmtDate, a as fmtMoney, d as downloadCSV } from "./utils-BjL8ABdx.mjs";
import { t as toast } from "./index-De8JtfrF.mjs";
import { c as createLucideIcon } from "./createLucideIcon-B0qOMXcq.mjs";
import { D as Download } from "./download-BJ5LkEki.mjs";
import { P as Plus } from "./plus-DgNPYq10.mjs";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./AppShell-BCNUyQp7.mjs";
import "./router-CxdnWRBk.mjs";
import "./dialog-iHg5lQpM.mjs";
import "./index-BSEENsC1.mjs";
import "./index-H_3XM99b.mjs";
import "./checkbox-B8Yax9Aq.mjs";
import "./index-CjC7qu5-.mjs";
import "./check-DbjqB_8n.mjs";
import "./chevron-up-DC1ELb_B.mjs";
const __iconNode = [
  ["path", { d: "M10 11v6", key: "nco0om" }],
  ["path", { d: "M14 11v6", key: "outv1u" }],
  ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", key: "miytrc" }],
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", key: "e791ji" }]
];
const Trash2 = createLucideIcon("trash-2", __iconNode);
function CostsPage() {
  const {
    costs,
    deleteCosts,
    clients
  } = useAppStore();
  const [tab, setTab] = reactExports.useState("All");
  const [q, setQ] = reactExports.useState("");
  const [sel, setSel] = reactExports.useState([]);
  const filtered = costs.filter((c) => (tab === "All" || c.status === tab) && (c.supplier.toLowerCase().includes(q.toLowerCase()) || c.description.toLowerCase().includes(q.toLowerCase())));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ListPage, { title: "Costs", actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    sel.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
      deleteCosts(sel);
      setSel([]);
      toast.success(`${sel.length} deleted`);
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-4 h-4 mr-1" }),
      "Delete (",
      sel.length,
      ")"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: () => downloadCSV("costs.csv", filtered), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-4 h-4 mr-1" }),
      "Export"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", className: "bg-[#FF5800] hover:bg-[#FF5800]/90", onClick: () => toast.success("Add documents flow"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-4 h-4 mr-1" }),
      "Add documents"
    ] })
  ] }), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-1 mb-3", children: ["All", "Processing", "To review", "Ready"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setTab(t), className: `px-3 py-1.5 text-sm rounded-md ${tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`, children: t }, t)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { placeholder: "Search costs…", value: q, onChange: (e) => setQ(e.target.value), className: "max-w-sm mb-4" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(DataTable, { selectable: true, selected: sel, onSelectedChange: setSel, data: filtered, columns: [{
      key: "date",
      header: "Date",
      render: (r) => fmtDate(r.date)
    }, {
      key: "supplier",
      header: "Supplier",
      render: (r) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: r.supplier }),
      sortable: true
    }, {
      key: "description",
      header: "Description"
    }, {
      key: "total",
      header: "Total",
      align: "right",
      render: (r) => fmtMoney(r.total)
    }, {
      key: "tax",
      header: "Tax",
      align: "right",
      render: (r) => fmtMoney(r.tax)
    }, {
      key: "category",
      header: "Category"
    }, {
      key: "paymentMethod",
      header: "Payment"
    }, {
      key: "status",
      header: "Status",
      render: (r) => /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: r.status })
    }, {
      key: "client",
      header: "Client",
      render: (r) => clients.find((c) => c.id === r.clientId)?.name ?? "—"
    }] })
  ] });
}
export {
  CostsPage as component
};
