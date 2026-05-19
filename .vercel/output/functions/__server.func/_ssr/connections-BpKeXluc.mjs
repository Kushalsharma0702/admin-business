import { K as jsxRuntimeExports } from "./index.mjs";
import { C as Card } from "./card-CDOUGn8L.mjs";
import { B as Button } from "./button-A6qM_v8i.mjs";
import { t as toast } from "./index-De8JtfrF.mjs";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./router-CxdnWRBk.mjs";
const integrations = [{
  id: "qbo",
  name: "QuickBooks Online",
  logo: "QBO",
  color: "bg-green-500",
  connected: false
}, {
  id: "xero",
  name: "Xero",
  logo: "XRO",
  color: "bg-sky-500",
  connected: false
}, {
  id: "sage",
  name: "Sage",
  logo: "SGE",
  color: "bg-emerald-600",
  connected: false
}, {
  id: "freshbooks",
  name: "FreshBooks",
  logo: "FB",
  color: "bg-blue-500",
  connected: false
}];
function ConnectionsPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-2xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold mb-6", children: "Connections" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: integrations.map((i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-10 h-10 rounded-lg ${i.color} text-white font-bold text-xs flex items-center justify-center`, children: i.logo }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium", children: i.name })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground mb-3", children: i.connected ? "Connected" : "Not connected" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: i.connected ? "outline" : "default", size: "sm", onClick: () => toast.success(i.connected ? "Disconnected" : "Connected"), children: i.connected ? "Disconnect" : "Connect" })
    ] }, i.id)) })
  ] });
}
export {
  ConnectionsPage as component
};
