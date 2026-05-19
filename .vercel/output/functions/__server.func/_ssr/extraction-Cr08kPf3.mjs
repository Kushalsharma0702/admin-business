import { V as reactExports, K as jsxRuntimeExports } from "./index.mjs";
import { a as useAppStore } from "./useAppStore-DqzUQQt1.mjs";
import { C as Card } from "./card-CDOUGn8L.mjs";
import { I as Input } from "./input-CsecQHmO.mjs";
import { B as Button } from "./button-A6qM_v8i.mjs";
import { S as Switch } from "./switch-CbF4ACRr.mjs";
import { t as toast } from "./index-De8JtfrF.mjs";
import { C as Copy } from "./copy-BXXDiyO-.mjs";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-BSEENsC1.mjs";
import "./router-CxdnWRBk.mjs";
import "./index-CjC7qu5-.mjs";
import "./createLucideIcon-B0qOMXcq.mjs";
function ExtractionPage() {
  const {
    extractionSettings,
    updateExtraction
  } = useAppStore();
  const [form, setForm] = reactExports.useState(extractionSettings);
  const save = () => {
    updateExtraction(form);
    toast.success("Extraction settings saved");
  };
  const email = `${form.emailPrefix}@costs.dext.com`;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-2xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold mb-6", children: "Extraction" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-6 space-y-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-muted-foreground uppercase mb-1 block", children: "Extract by Email" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: form.emailPrefix, onChange: (e) => setForm({
            ...form,
            emailPrefix: e.target.value
          }), className: "max-w-[200px]" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-muted-foreground", children: "@costs.dext.com" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
            navigator.clipboard.writeText(email);
            toast.success("Copied");
          }, className: "text-muted-foreground hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "w-4 h-4" }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-sm font-medium", children: "Inbox tabs" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: form.showInboxTabs, onCheckedChange: (v) => setForm({
          ...form,
          showInboxTabs: v
        }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-muted-foreground uppercase mb-1 block", children: "Duplicate items" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "w-full border border-border rounded-md h-9 px-2 text-sm bg-background", value: form.duplicateMode, onChange: (e) => setForm({
          ...form,
          duplicateMode: e.target.value
        }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Automatic" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Manual" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Disabled" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-sm font-medium", children: "Tax extraction" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: form.extractTax, onCheckedChange: (v) => setForm({
          ...form,
          extractTax: v
        }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-muted-foreground uppercase mb-1 block", children: "Default tax rate (%)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", value: form.defaultTaxRate, onChange: (e) => setForm({
          ...form,
          defaultTaxRate: Number(e.target.value)
        }), className: "max-w-[120px]" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: save, children: "Save" })
    ] })
  ] });
}
export {
  ExtractionPage as component
};
