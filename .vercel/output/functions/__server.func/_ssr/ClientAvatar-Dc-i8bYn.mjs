import { K as jsxRuntimeExports } from "./index.mjs";
import { i as initials, c as colorFor } from "./utils-BjL8ABdx.mjs";
function ClientAvatar({ name, size = 32 }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: `${colorFor(name)} text-white font-semibold rounded-full inline-flex items-center justify-center shrink-0`,
      style: { width: size, height: size, fontSize: size * 0.4 },
      children: initials(name)
    }
  );
}
export {
  ClientAvatar as C
};
