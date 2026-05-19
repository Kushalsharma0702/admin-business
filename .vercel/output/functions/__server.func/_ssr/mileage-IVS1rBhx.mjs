import { V as reactExports, K as jsxRuntimeExports } from "./index.mjs";
import { C as Card } from "./card-CDOUGn8L.mjs";
import { I as Input } from "./input-CsecQHmO.mjs";
import { B as Button } from "./button-A6qM_v8i.mjs";
import { t as toast } from "./index-De8JtfrF.mjs";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./router-CxdnWRBk.mjs";
function MileagePage() {
  const [rate, setRate] = reactExports.useState("0.67");
  const [defaultVehicle, setDefaultVehicle] = reactExports.useState("Car");
  const vehicles = ["Car", "Motorcycle", "Van"];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-2xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold mb-6", children: "Mileage" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-6 space-y-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-muted-foreground uppercase mb-1 block", children: "Rate per km ($)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", step: "0.01", value: rate, onChange: (e) => setRate(e.target.value), className: "max-w-[200px]" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-muted-foreground uppercase mb-1 block", children: "Vehicle types" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1.5", children: vehicles.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-3 py-2 border border-border rounded-md text-sm", children: v }, v)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-muted-foreground uppercase mb-1 block", children: "Default vehicle" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("select", { className: "w-full border border-border rounded-md h-9 px-2 text-sm bg-background", value: defaultVehicle, onChange: (e) => setDefaultVehicle(e.target.value), children: vehicles.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: v }, v)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => toast.success("Mileage settings saved"), children: "Save" })
    ] })
  ] });
}
export {
  MileagePage as component
};
