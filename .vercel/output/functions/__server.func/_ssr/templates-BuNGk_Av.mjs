import { K as jsxRuntimeExports } from "./index.mjs";
import { L as ListPage } from "./ListPage-DwCHn9Xa.mjs";
import { C as Card } from "./card-CDOUGn8L.mjs";
import { B as Button } from "./button-A6qM_v8i.mjs";
import { t as toast } from "./index-De8JtfrF.mjs";
import { F as FileText } from "./dialog-iHg5lQpM.mjs";
import { c as createLucideIcon } from "./createLucideIcon-B0qOMXcq.mjs";
import { P as Plus } from "./plus-DgNPYq10.mjs";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./AppShell-BCNUyQp7.mjs";
import "./router-CxdnWRBk.mjs";
import "./index-BSEENsC1.mjs";
import "./useAppStore-DqzUQQt1.mjs";
import "./index-H_3XM99b.mjs";
const __iconNode$1 = [
  ["rect", { width: "8", height: "4", x: "8", y: "2", rx: "1", ry: "1", key: "tgr4d6" }],
  [
    "path",
    {
      d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
      key: "116196"
    }
  ],
  ["path", { d: "m9 14 2 2 4-4", key: "df797q" }]
];
const ClipboardCheck = createLucideIcon("clipboard-check", __iconNode$1);
const __iconNode = [
  ["path", { d: "m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7", key: "132q7q" }],
  ["rect", { x: "2", y: "4", width: "20", height: "16", rx: "2", key: "izxlao" }]
];
const Mail = createLucideIcon("mail", __iconNode);
const templates = [{
  id: "1",
  name: "Tax Return Engagement Letter",
  type: "Document",
  icon: FileText,
  description: "Standard engagement letter for individual tax return preparation."
}, {
  id: "2",
  name: "Client Welcome Email",
  type: "Email",
  icon: Mail,
  description: "Onboarding email template for new clients."
}, {
  id: "3",
  name: "Monthly Bookkeeping Checklist",
  type: "Checklist",
  icon: ClipboardCheck,
  description: "Standard monthly bookkeeping review checklist."
}, {
  id: "4",
  name: "Quarterly Tax Planning Letter",
  type: "Document",
  icon: FileText,
  description: "Quarterly letter outlining estimated tax payments."
}, {
  id: "5",
  name: "W-2 Collection Request",
  type: "Email",
  icon: Mail,
  description: "Email template requesting W-2 forms from clients."
}, {
  id: "6",
  name: "Extension Filing Notice",
  type: "Document",
  icon: FileText,
  description: "Notification to clients about filing extension."
}];
function TemplatesPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ListPage, { title: "Templates", subtitle: `${templates.length} templates`, actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", onClick: () => toast.success("Template created"), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-4 h-4 mr-1" }),
    "Create template"
  ] }), children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: templates.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "p-5 hover:shadow-md transition-shadow cursor-pointer group", onClick: () => toast.success(`Opening "${t.name}"`), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(t.icon, { className: "w-5 h-5 text-primary" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium text-sm group-hover:text-primary transition-colors", children: t.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground mt-0.5", children: t.type }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground mt-2", children: t.description })
    ] })
  ] }) }, t.id)) }) });
}
export {
  TemplatesPage as component
};
