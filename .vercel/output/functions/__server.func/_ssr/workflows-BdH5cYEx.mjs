import { K as jsxRuntimeExports } from "./index.mjs";
import { L as ListPage } from "./ListPage-DwCHn9Xa.mjs";
import { a as useAppStore } from "./useAppStore-DqzUQQt1.mjs";
import { B as Button } from "./button-A6qM_v8i.mjs";
import { S as Switch } from "./switch-CbF4ACRr.mjs";
import { t as toast } from "./index-De8JtfrF.mjs";
import { P as Plus } from "./plus-DgNPYq10.mjs";
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
import "./index-CjC7qu5-.mjs";
function WorkflowsPage() {
  const {
    workflows,
    toggleWorkflow
  } = useAppStore();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ListPage, { title: "Workflows", subtitle: `${workflows.length} workflows`, actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", className: "bg-[#FF5800] hover:bg-[#FF5800]/90", onClick: () => toast.success("Workflow created"), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-4 h-4 mr-1" }),
    "Create workflow"
  ] }), children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-card rounded-lg border border-border overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Name" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Trigger" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Actions" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Status" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Last run" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: workflows.map((w) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border last:border-0 hover:bg-muted/40", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 font-medium", children: w.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: w.trigger }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-muted-foreground", children: w.actions.join(", ") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: w.enabled, onCheckedChange: () => {
        toggleWorkflow(w.id);
        toast.success(w.enabled ? "Disabled" : "Enabled");
      } }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-muted-foreground", children: w.lastRun })
    ] }, w.id)) })
  ] }) }) });
}
export {
  WorkflowsPage as component
};
