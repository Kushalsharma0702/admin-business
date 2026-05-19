import { K as jsxRuntimeExports } from "./index.mjs";
import { C as Card } from "./card-CDOUGn8L.mjs";
import { E as EmptyState } from "./EmptyState-BtcJ24RH.mjs";
import { t as toast } from "./index-De8JtfrF.mjs";
import { c as createLucideIcon } from "./createLucideIcon-B0qOMXcq.mjs";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./button-A6qM_v8i.mjs";
import "./router-CxdnWRBk.mjs";
const __iconNode = [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2", key: "1w4ew1" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4", key: "fwvmzm" }]
];
const Lock = createLucideIcon("lock", __iconNode);
function VaultPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-2xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold mb-6", children: "Vault" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "p-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { icon: Lock, title: "Vault is empty", description: "Securely store sensitive documents. Files stored here are encrypted at rest.", actionLabel: "Upload to vault", onAction: () => toast.success("Upload started") }) })
  ] });
}
export {
  VaultPage as component
};
