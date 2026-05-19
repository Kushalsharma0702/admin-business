import { V as reactExports, K as jsxRuntimeExports } from "./index.mjs";
import { a as useAppStore } from "./useAppStore-DqzUQQt1.mjs";
import { C as Card } from "./card-CDOUGn8L.mjs";
import { I as Input } from "./input-CsecQHmO.mjs";
import { B as Button } from "./button-A6qM_v8i.mjs";
import { S as Switch } from "./switch-CbF4ACRr.mjs";
import { t as toast } from "./index-De8JtfrF.mjs";
import { U as Upload } from "./upload-Jt8yCBgQ.mjs";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-BSEENsC1.mjs";
import "./router-CxdnWRBk.mjs";
import "./index-CjC7qu5-.mjs";
import "./createLucideIcon-B0qOMXcq.mjs";
function BusinessProfilePage() {
  const {
    businessProfile,
    updateBusiness
  } = useAppStore();
  const [form, setForm] = reactExports.useState(businessProfile);
  const save = () => {
    updateBusiness(form);
    toast.success("Business profile saved");
  };
  const set = (k, v) => setForm((prev) => ({
    ...prev,
    [k]: v
  }));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-2xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold mb-6", children: "Business Profile" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-6 space-y-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-muted-foreground uppercase mb-1 block", children: "Logo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "file", className: "hidden", onChange: () => toast.success("Logo uploaded"), accept: "image/*" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "w-6 h-6 mx-auto text-muted-foreground mb-1" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: "Click to upload logo" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Business name", value: form.name, onChange: (v) => set("name", v) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "CRN", value: form.crn, onChange: (v) => set("crn", v) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Country", value: form.country, onChange: (v) => set("country", v) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Base currency", value: form.currency, onChange: (v) => set("currency", v) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Language", value: form.language, onChange: (v) => set("language", v) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Industry", value: form.industry, onChange: (v) => set("industry", v) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-sm font-medium", children: "Self employed" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: form.selfEmployed, onCheckedChange: (v) => set("selfEmployed", v) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Year end month", value: form.yearEndMonth, onChange: (v) => set("yearEndMonth", v) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Year end day", value: form.yearEndDay, onChange: (v) => set("yearEndDay", v) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Tax number", value: form.taxNumber, onChange: (v) => set("taxNumber", v) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Reporting cycle", value: form.reportingCycle, onChange: (v) => set("reportingCycle", v) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: save, children: "Save" })
    ] })
  ] });
}
function Field({
  label,
  value,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-muted-foreground uppercase mb-1 block", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value, onChange: (e) => onChange(e.target.value) })
  ] });
}
export {
  BusinessProfilePage as component
};
