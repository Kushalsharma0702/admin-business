import { K as jsxRuntimeExports, O as Outlet } from "./index.mjs";
import { L as Link } from "./router-CxdnWRBk.mjs";
import { u as useRouterState, A as AppShell } from "./AppShell-BCNUyQp7.mjs";
import { a as cn$1 } from "./index-De8JtfrF.mjs";
import { c as createLucideIcon } from "./createLucideIcon-B0qOMXcq.mjs";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./dialog-iHg5lQpM.mjs";
import "./index-BSEENsC1.mjs";
import "./index-H_3XM99b.mjs";
import "./useAppStore-DqzUQQt1.mjs";
const __iconNode = [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
];
const ArrowLeft = createLucideIcon("arrow-left", __iconNode);
const sections = [{
  heading: "Business Settings",
  items: [{
    to: "/settings/business-profile",
    label: "Business profile"
  }, {
    to: "/settings/connections",
    label: "Connections"
  }, {
    to: "/settings/extraction",
    label: "Extraction"
  }, {
    to: "/settings/automation",
    label: "Automation"
  }, {
    to: "/settings/approvals",
    label: "Approvals"
  }, {
    to: "/settings/mileage",
    label: "Mileage"
  }, {
    to: "/settings/exports",
    label: "Exports"
  }, {
    to: "/settings/lists",
    label: "Lists"
  }, {
    to: "/settings/vault",
    label: "Vault"
  }]
}, {
  heading: "Manage",
  items: [{
    to: "/settings/subscription",
    label: "Subscription"
  }]
}, {
  heading: "Quick Links",
  items: [{
    to: "/clients",
    label: "Client list"
  }]
}];
function SettingsLayout() {
  const path = useRouterState({
    select: (s) => s.location.pathname
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AppShell, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/dashboard", className: "inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "w-4 h-4" }),
      " Back"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[220px_1fr] gap-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "space-y-5", children: sections.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-2", children: s.heading }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-0.5", children: s.items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: item.to, className: cn$1("block px-3 py-2 text-sm rounded-md", path.startsWith(item.to) ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"), children: item.label }, item.to)) })
      ] }, s.heading)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {}) })
    ] })
  ] });
}
export {
  SettingsLayout as component
};
