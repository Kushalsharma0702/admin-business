import { K as jsxRuntimeExports } from "./index.mjs";
import { A as AppShell } from "./AppShell-BCNUyQp7.mjs";
function PageHeader({ title, subtitle, actions }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold text-foreground tracking-tight", children: title }),
      subtitle && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground mt-1", children: subtitle })
    ] }),
    actions && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: actions })
  ] });
}
function ListPage({ title, subtitle, actions, children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AppShell, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title, subtitle, actions }),
    children
  ] });
}
export {
  ListPage as L
};
