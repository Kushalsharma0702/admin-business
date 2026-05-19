import { V as reactExports, K as jsxRuntimeExports } from "./index.mjs";
import { a as useAppStore } from "./useAppStore-DqzUQQt1.mjs";
import { C as Card } from "./card-CDOUGn8L.mjs";
import { B as Button } from "./button-A6qM_v8i.mjs";
import { S as Switch } from "./switch-CbF4ACRr.mjs";
import { C as Checkbox } from "./checkbox-B8Yax9Aq.mjs";
import { t as toast } from "./index-De8JtfrF.mjs";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-BSEENsC1.mjs";
import "./router-CxdnWRBk.mjs";
import "./index-CjC7qu5-.mjs";
import "./index-H_3XM99b.mjs";
import "./check-DbjqB_8n.mjs";
import "./createLucideIcon-B0qOMXcq.mjs";
function ExportsPage() {
  const {
    exportSettings,
    updateExport
  } = useAppStore();
  const [form, setForm] = reactExports.useState(exportSettings);
  const save = () => {
    updateExport(form);
    toast.success("Export settings saved");
  };
  const allCols = ["Receipt ID", "Description", "Net amount", "Tax amount", "Total amount", "Supplier", "Date", "Category", "Payment method"];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-2xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold mb-6", children: "Exports" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-6 space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-medium text-sm mb-3", children: "CSV Exports" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-muted-foreground uppercase mb-1 block", children: "Format" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "w-full border border-border rounded-md h-9 px-2 text-sm bg-background", value: form.csvFormat, onChange: (e) => setForm({
            ...form,
            csvFormat: e.target.value
          }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Standard" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Compact" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Extended" })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-medium text-sm mb-3", children: "CSV Custom Exports" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-muted-foreground uppercase mb-1 block", children: "Decimal separator" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "w-full border border-border rounded-md h-9 px-2 text-sm bg-background", value: form.decimalSeparator, onChange: (e) => setForm({
              ...form,
              decimalSeparator: e.target.value
            }), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Dot" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Comma" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-muted-foreground uppercase mb-1 block", children: "Date format" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "w-full border border-border rounded-md h-9 px-2 text-sm bg-background", value: form.dateFormat, onChange: (e) => setForm({
              ...form,
              dateFormat: e.target.value
            }), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "DD-Mon-YYYY" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "YYYY-MM-DD" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "MM/DD/YYYY" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-sm font-medium", children: "Show item header" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: form.showItemHeader, onCheckedChange: (v) => setForm({
              ...form,
              showItemHeader: v
            }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-muted-foreground uppercase mb-2 block", children: "Columns" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-2", children: allCols.map((col) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-sm", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Checkbox, { checked: form.columns[col] ?? false, onCheckedChange: (v) => setForm({
                ...form,
                columns: {
                  ...form.columns,
                  [col]: !!v
                }
              }) }),
              col
            ] }, col)) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: save, children: "Save" })
    ] })
  ] });
}
export {
  ExportsPage as component
};
