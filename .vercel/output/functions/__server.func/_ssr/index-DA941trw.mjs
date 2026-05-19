import { K as jsxRuntimeExports } from "./index.mjs";
import { L as ListPage } from "./ListPage-DwCHn9Xa.mjs";
import { a as useAppStore } from "./useAppStore-DqzUQQt1.mjs";
import { D as DataTable } from "./DataTable-CQS5Fzdd.mjs";
import { S as StatusBadge } from "./StatusBadge-uIqVQAhZ.mjs";
import { f as fmtDate, a as fmtMoney } from "./utils-BjL8ABdx.mjs";
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
import "./checkbox-B8Yax9Aq.mjs";
import "./index-CjC7qu5-.mjs";
import "./check-DbjqB_8n.mjs";
import "./chevron-up-DC1ELb_B.mjs";
const SplitComponent = () => {
  const sales = useAppStore((s) => s.sales);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ListPage, { title: "Sales", children: /* @__PURE__ */ jsxRuntimeExports.jsx(DataTable, { selectable: true, selected: [], onSelectedChange: () => {
  }, data: sales, columns: [{
    key: "date",
    header: "Date",
    render: (r) => fmtDate(r.date)
  }, {
    key: "customer",
    header: "Customer"
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
    key: "status",
    header: "Status",
    render: (r) => /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: r.status })
  }] }) });
};
export {
  SplitComponent as component
};
