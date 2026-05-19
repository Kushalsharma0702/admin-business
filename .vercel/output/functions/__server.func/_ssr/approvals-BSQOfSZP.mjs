import { V as reactExports, K as jsxRuntimeExports } from "./index.mjs";
import { C as Card } from "./card-CDOUGn8L.mjs";
import { I as Input } from "./input-CsecQHmO.mjs";
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
function ApprovalsPage() {
  const [enabled, setEnabled] = reactExports.useState(false);
  const [threshold, setThreshold] = reactExports.useState("500");
  const [approver, setApprover] = reactExports.useState("Angela Martin");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-2xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold mb-6", children: "Approvals" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-6 space-y-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-sm font-medium", children: "Enable approvals" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: enabled, onCheckedChange: setEnabled })
      ] }),
      enabled && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-muted-foreground uppercase mb-1 block", children: "Threshold amount ($)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", value: threshold, onChange: (e) => setThreshold(e.target.value), className: "max-w-[200px]" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-muted-foreground uppercase mb-1 block", children: "Approver" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "w-full border border-border rounded-md h-9 px-2 text-sm bg-background", value: approver, onChange: (e) => setApprover(e.target.value), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Angela Martin" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Oscar Martinez" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Kevin Malone" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => toast.success("Approvals settings saved"), children: "Save" })
    ] })
  ] });
}
export {
  ApprovalsPage as component
};
