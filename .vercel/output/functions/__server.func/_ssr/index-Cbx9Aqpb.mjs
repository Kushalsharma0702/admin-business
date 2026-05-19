import { V as reactExports, K as jsxRuntimeExports } from "./index.mjs";
import { L as Link } from "./router-CxdnWRBk.mjs";
import { L as ListPage } from "./ListPage-DwCHn9Xa.mjs";
import { a as useAppStore } from "./useAppStore-DqzUQQt1.mjs";
import { C as ClientAvatar } from "./ClientAvatar-Dc-i8bYn.mjs";
import { f as fmtDate } from "./utils-BjL8ABdx.mjs";
import { I as Input } from "./input-CsecQHmO.mjs";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./AppShell-BCNUyQp7.mjs";
import "./index-De8JtfrF.mjs";
import "./createLucideIcon-B0qOMXcq.mjs";
import "./dialog-iHg5lQpM.mjs";
import "./index-BSEENsC1.mjs";
import "./index-H_3XM99b.mjs";
function ClientsList() {
  const clients = useAppStore((s) => s.clients);
  const [q, setQ] = reactExports.useState("");
  const [tab, setTab] = reactExports.useState("all");
  const filtered = clients.filter((c) => {
    if (tab === "without" && c.portalStatus !== "none") return false;
    if (tab === "with" && c.portalStatus === "none") return false;
    return c.name.toLowerCase().includes(q.toLowerCase()) || c.email.toLowerCase().includes(q.toLowerCase());
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ListPage, { title: "Client Portals", subtitle: `${clients.length} clients`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-6 border-b border-border mb-4 text-sm", children: [{
      k: "all",
      l: "All client portal users"
    }, {
      k: "without",
      l: "Without client portals"
    }, {
      k: "with",
      l: "With portal users"
    }].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setTab(t.k), className: `pb-3 border-b-2 ${tab === t.k ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground"}`, children: t.l }, t.k)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { placeholder: "Search clients…", value: q, onChange: (e) => setQ(e.target.value), className: "max-w-sm mb-4" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-card rounded-lg border border-border overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Client name" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Email" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Client type" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Created on" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: filtered.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border last:border-0 hover:bg-muted/40", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/clients/$clientId/$tab", params: {
          clientId: c.id,
          tab: "home"
        }, className: "flex items-center gap-2.5 text-primary font-medium hover:underline", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ClientAvatar, { name: c.name, size: 28 }),
          c.name
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-muted-foreground", children: c.email || "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded", children: c.type }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-muted-foreground", children: fmtDate(c.createdOn) })
      ] }, c.id)) })
    ] }) })
  ] });
}
export {
  ClientsList as component
};
