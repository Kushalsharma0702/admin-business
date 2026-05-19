import { K as jsxRuntimeExports } from "./index.mjs";
import { u as useNavigate } from "./router-CxdnWRBk.mjs";
import { L as ListPage } from "./ListPage-DwCHn9Xa.mjs";
import { a as useAppStore } from "./useAppStore-DqzUQQt1.mjs";
import { S as StatusBadge } from "./StatusBadge-uIqVQAhZ.mjs";
import { C as ClientAvatar } from "./ClientAvatar-Dc-i8bYn.mjs";
import { a as fmtMoney, f as fmtDate } from "./utils-BjL8ABdx.mjs";
import { C as Card } from "./card-CDOUGn8L.mjs";
import { B as Button } from "./button-A6qM_v8i.mjs";
import { t as toast } from "./index-De8JtfrF.mjs";
import { i as Receipt } from "./dialog-iHg5lQpM.mjs";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./AppShell-BCNUyQp7.mjs";
import "./createLucideIcon-B0qOMXcq.mjs";
import "./index-BSEENsC1.mjs";
import "./index-H_3XM99b.mjs";
function BillingPage() {
  const navigate = useNavigate();
  const {
    billing,
    clients
  } = useAppStore();
  const totalBilled = billing.reduce((a, b) => a + b.amount, 0);
  const totalPaid = billing.filter((b) => b.status === "Paid").reduce((a, b) => a + b.amount, 0);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ListPage, { title: "Billing", subtitle: `${billing.length} invoices`, actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", onClick: () => toast.success("Invoice draft created"), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Receipt, { className: "w-4 h-4 mr-1" }),
    "Create invoice"
  ] }), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-4 mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Total billed" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xl font-semibold", children: fmtMoney(totalBilled) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Total paid" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xl font-semibold text-emerald-600", children: fmtMoney(totalPaid) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Outstanding" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xl font-semibold text-rose-600", children: fmtMoney(totalBilled - totalPaid) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-card rounded-lg border border-border overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Invoice #" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Client" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Date" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Description" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right px-4 py-2.5 font-semibold", children: "Amount" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 pl-6 font-semibold", children: "Status" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: billing.map((b) => {
        const client = clients.find((c) => c.id === b.clientId);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { onClick: () => client && navigate({
          to: "/clients/$clientId/$tab",
          params: {
            clientId: client.id,
            tab: "billing"
          }
        }), className: "border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 font-medium", children: b.invoiceNumber }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: client && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ClientAvatar, { name: client.name, size: 22 }),
            client.name
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: fmtDate(b.date) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: b.description }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-right", children: fmtMoney(b.amount) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 pl-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: b.status }) })
        ] }, b.id);
      }) })
    ] }) })
  ] });
}
export {
  BillingPage as component
};
