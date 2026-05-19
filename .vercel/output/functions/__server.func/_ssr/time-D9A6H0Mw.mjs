import { K as jsxRuntimeExports } from "./index.mjs";
import { L as ListPage } from "./ListPage-DwCHn9Xa.mjs";
import { a as useAppStore } from "./useAppStore-DqzUQQt1.mjs";
import { C as ClientAvatar } from "./ClientAvatar-Dc-i8bYn.mjs";
import { f as fmtDate, a as fmtMoney } from "./utils-BjL8ABdx.mjs";
import { B as Button } from "./button-A6qM_v8i.mjs";
import { t as toast } from "./index-De8JtfrF.mjs";
import { C as Clock } from "./dialog-iHg5lQpM.mjs";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./AppShell-BCNUyQp7.mjs";
import "./router-CxdnWRBk.mjs";
import "./createLucideIcon-B0qOMXcq.mjs";
import "./index-BSEENsC1.mjs";
import "./index-H_3XM99b.mjs";
function TimePage() {
  const {
    timeEntries,
    clients
  } = useAppStore();
  const total = timeEntries.reduce((a, b) => a + b.hours, 0);
  const totalAmount = timeEntries.reduce((a, b) => a + b.hours * b.rate, 0);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ListPage, { title: "Time", subtitle: `${total.toFixed(1)} hours logged · ${fmtMoney(totalAmount)}`, actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", onClick: () => toast.success("Time logged"), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "w-4 h-4 mr-1" }),
    "Log time"
  ] }), children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-card rounded-lg border border-border overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Date" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Client" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Description" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right px-4 py-2.5 font-semibold", children: "Hours" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right px-4 py-2.5 font-semibold", children: "Rate" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right px-4 py-2.5 font-semibold", children: "Amount" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 pl-6 font-semibold", children: "Logged by" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: timeEntries.map((t) => {
      const client = clients.find((c) => c.id === t.clientId);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border last:border-0 hover:bg-muted/40", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: fmtDate(t.date) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: client && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ClientAvatar, { name: client.name, size: 22 }),
          client.name
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: t.description }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-right", children: t.hours }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-right", children: fmtMoney(t.rate) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-right font-medium", children: fmtMoney(t.hours * t.rate) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 pl-6", children: t.loggedBy })
      ] }, t.id);
    }) })
  ] }) }) });
}
export {
  TimePage as component
};
