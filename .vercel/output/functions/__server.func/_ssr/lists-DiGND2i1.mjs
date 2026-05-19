import { V as reactExports, K as jsxRuntimeExports } from "./index.mjs";
import { a as useAppStore } from "./useAppStore-DqzUQQt1.mjs";
import { C as Card } from "./card-CDOUGn8L.mjs";
import { S as Switch } from "./switch-CbF4ACRr.mjs";
import { B as Button } from "./button-A6qM_v8i.mjs";
import { t as toast } from "./index-De8JtfrF.mjs";
import { d as downloadCSV } from "./utils-BjL8ABdx.mjs";
import { P as Plus } from "./plus-DgNPYq10.mjs";
import { D as Download } from "./download-BJ5LkEki.mjs";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-BSEENsC1.mjs";
import "./router-CxdnWRBk.mjs";
import "./index-CjC7qu5-.mjs";
import "./createLucideIcon-B0qOMXcq.mjs";
function ListsPage() {
  const {
    categories,
    toggleCategoryVisible,
    paymentMethods
  } = useAppStore();
  const [tab, setTab] = reactExports.useState("categories");
  const tabs = [{
    k: "categories",
    l: "Categories"
  }, {
    k: "tax-rates",
    l: "Tax rates"
  }, {
    k: "payment-methods",
    l: "Payment methods"
  }, {
    k: "flags",
    l: "Flags"
  }];
  const taxRates = [{
    name: "GST",
    rate: "5%"
  }, {
    name: "HST",
    rate: "13%"
  }, {
    name: "PST",
    rate: "7%"
  }, {
    name: "Zero Rated",
    rate: "0%"
  }];
  const flags = [{
    color: "bg-orange-500",
    name: "Orange"
  }, {
    color: "bg-yellow-500",
    name: "Yellow"
  }, {
    color: "bg-green-500",
    name: "Green"
  }, {
    color: "bg-blue-500",
    name: "Blue"
  }, {
    color: "bg-purple-500",
    name: "Purple"
  }];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold mb-6", children: "Lists" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-1 mb-4", children: tabs.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setTab(t.k), className: `px-3 py-1.5 text-sm rounded-md ${tab === t.k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`, children: t.l }, t.k)) }),
    tab === "categories" && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-0 overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-3 border-b border-border flex justify-between items-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm font-medium", children: [
          categories.length,
          " categories"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: () => toast.success("Category added"), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-4 h-4 mr-1" }),
            "Add"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: () => downloadCSV("categories.csv", categories), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-4 h-4 mr-1" }),
            "Export"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-96 overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground sticky top-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2", children: "Name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2", children: "Code" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-center px-4 py-2", children: "Visible" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: categories.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border last:border-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2", children: c.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2 text-muted-foreground", children: c.code }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: c.visible, onCheckedChange: () => toggleCategoryVisible(c.id) }) })
        ] }, c.id)) })
      ] }) })
    ] }),
    tab === "tax-rates" && /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "p-0 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2", children: "Name" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2", children: "Rate" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: taxRates.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border last:border-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2", children: t.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2", children: t.rate })
      ] }, t.name)) })
    ] }) }),
    tab === "payment-methods" && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-0 overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-3 border-b border-border flex justify-between items-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm font-medium", children: [
          paymentMethods.length,
          " methods"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: () => toast.success("Method added"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-4 h-4 mr-1" }),
          "Add"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-96 overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground sticky top-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2", children: "Name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2", children: "Reference" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: paymentMethods.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border last:border-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2", children: p.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2 text-muted-foreground", children: p.reference })
        ] }, p.id)) })
      ] }) })
    ] }),
    tab === "flags" && /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "p-5 space-y-3", children: flags.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-4 h-4 rounded-full ${f.color}` }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm", children: f.name })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { defaultChecked: true })
    ] }, f.name)) })
  ] });
}
export {
  ListsPage as component
};
