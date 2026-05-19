import { K as jsxRuntimeExports } from "./index.mjs";
import { B as Button } from "./button-A6qM_v8i.mjs";
function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center py-12 px-6 text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "w-6 h-6 text-muted-foreground" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base font-semibold text-foreground", children: title }),
    description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-1 max-w-sm", children: description }),
    actionLabel && onAction && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: onAction, className: "mt-4", children: actionLabel })
  ] });
}
export {
  EmptyState as E
};
