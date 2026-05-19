import { V as reactExports, K as jsxRuntimeExports } from "./index.mjs";
import { a as useAppStore } from "./useAppStore-DqzUQQt1.mjs";
import { C as Card } from "./card-CDOUGn8L.mjs";
import { B as Button } from "./button-A6qM_v8i.mjs";
import { S as Switch } from "./switch-CbF4ACRr.mjs";
import { t as toast } from "./index-De8JtfrF.mjs";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-BSEENsC1.mjs";
import "./router-CxdnWRBk.mjs";
import "./index-CjC7qu5-.mjs";
function AutomationPage() {
  const {
    automationSettings,
    updateAutomation
  } = useAppStore();
  const [form, setForm] = reactExports.useState(automationSettings);
  const save = () => {
    updateAutomation(form);
    toast.success("Automation settings saved");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-2xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold mb-6", children: "Automation" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-6 space-y-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-muted-foreground uppercase mb-1 block", children: "Auto-categorisation" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "w-full border border-border rounded-md h-9 px-2 text-sm bg-background", value: form.autoCategorisation, onChange: (e) => setForm({
          ...form,
          autoCategorisation: e.target.value
        }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Always" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Sometimes" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Never" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-muted-foreground uppercase mb-1 block", children: "Default category" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "w-full border border-border rounded-md h-9 px-2 text-sm bg-background", value: form.defaultCategory, onChange: (e) => setForm({
          ...form,
          defaultCategory: e.target.value
        }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Office Expenses" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Travel" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Meals" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Supplies" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Utilities" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-sm font-medium", children: "Smart Suggestions" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: form.smartSuggestions, onCheckedChange: (v) => setForm({
          ...form,
          smartSuggestions: v
        }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-sm font-medium", children: "Auto-apply" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: form.autoApply, onCheckedChange: (v) => setForm({
          ...form,
          autoApply: v
        }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-sm font-medium", children: "Group uncategorised" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: form.groupUncategorised, onCheckedChange: (v) => setForm({
          ...form,
          groupUncategorised: v
        }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: save, children: "Save" })
    ] })
  ] });
}
export {
  AutomationPage as component
};
