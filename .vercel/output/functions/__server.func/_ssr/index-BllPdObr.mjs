import { K as jsxRuntimeExports } from "./index.mjs";
import { L as ListPage } from "./ListPage-DwCHn9Xa.mjs";
import { a as useAppStore } from "./useAppStore-DqzUQQt1.mjs";
import { D as DataTable } from "./DataTable-CQS5Fzdd.mjs";
import { f as fmtDate, a as fmtMoney, d as downloadCSV } from "./utils-BjL8ABdx.mjs";
import { B as Button } from "./button-A6qM_v8i.mjs";
import { t as toast } from "./index-De8JtfrF.mjs";
import { D as Download } from "./download-BJ5LkEki.mjs";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./AppShell-BCNUyQp7.mjs";
import "./router-CxdnWRBk.mjs";
import "./createLucideIcon-B0qOMXcq.mjs";
import "./dialog-iHg5lQpM.mjs";
import "./index-BSEENsC1.mjs";
import "./index-H_3XM99b.mjs";
import "./checkbox-B8Yax9Aq.mjs";
import "./index-CjC7qu5-.mjs";
import "./check-DbjqB_8n.mjs";
import "./chevron-up-DC1ELb_B.mjs";
const SplitComponent = () => {
  const {
    transactions,
    toggleTransactionMatch
  } = useAppStore();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ListPage, { title: "Bank", actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: () => downloadCSV("transactions.csv", transactions), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-4 h-4 mr-1" }),
      "Export all"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", onClick: () => toast.success("Paperwork requested"), children: "Request paperwork" })
  ] }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(DataTable, { selectable: true, selected: [], onSelectedChange: () => {
  }, data: transactions, columns: [{
    key: "date",
    header: "Date",
    render: (r) => fmtDate(r.date)
  }, {
    key: "description",
    header: "Description",
    render: (r) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: r.description })
  }, {
    key: "paidOut",
    header: "Paid out",
    align: "right",
    render: (r) => r.paidOut > 0 ? fmtMoney(r.paidOut) : "—"
  }, {
    key: "paidIn",
    header: "Paid in",
    align: "right",
    render: (r) => r.paidIn > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-emerald-600", children: fmtMoney(r.paidIn) }) : "—"
  }, {
    key: "match",
    header: "Match",
    render: (r) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => toggleTransactionMatch(r.id), className: `text-xs px-2 py-0.5 rounded ${r.matched ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`, children: r.matched ? "Matched" : "Unmatched" })
  }, {
    key: "account",
    header: "Account"
  }] }) });
};
export {
  SplitComponent as component
};
