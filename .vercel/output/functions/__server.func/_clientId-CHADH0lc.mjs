import { K as jsxRuntimeExports, O as Outlet } from "./_ssr/index.mjs";
import { b as useParams, L as Link } from "./_ssr/router-CxdnWRBk.mjs";
import { u as useRouterState, A as AppShell } from "./_ssr/AppShell-BCNUyQp7.mjs";
import { a as useAppStore } from "./_ssr/useAppStore-DqzUQQt1.mjs";
import { C as ClientAvatar } from "./_ssr/ClientAvatar-Dc-i8bYn.mjs";
import { f as fmtDate } from "./_ssr/utils-BjL8ABdx.mjs";
import { t as toast } from "./_ssr/index-De8JtfrF.mjs";
import { c as createLucideIcon } from "./_ssr/createLucideIcon-B0qOMXcq.mjs";
import { C as Copy } from "./_ssr/copy-BXXDiyO-.mjs";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./_ssr/dialog-iHg5lQpM.mjs";
import "./_ssr/index-BSEENsC1.mjs";
import "./_ssr/index-H_3XM99b.mjs";
const __iconNode$1 = [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      key: "1a8usu"
    }
  ],
  ["path", { d: "m15 5 4 4", key: "1mk7zo" }]
];
const Pencil = createLucideIcon("pencil", __iconNode$1);
const __iconNode = [
  [
    "path",
    {
      d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",
      key: "r04s7s"
    }
  ]
];
const Star = createLucideIcon("star", __iconNode);
const tabs = [["home", "Home"], ["communication", "Communication"], ["notes", "Notes"], ["files", "Files"], ["tasks", "Tasks"], ["resolution-cases", "Resolution Cases"], ["organizers", "Organizers"], ["transcripts", "Transcripts"], ["billing", "Billing"], ["time-entries", "Time Entries"]];
function ClientLayout() {
  const {
    clientId
  } = useParams({
    from: "/clients/$clientId"
  });
  const path = useRouterState({
    select: (s) => s.location.pathname
  });
  const client = useAppStore((s) => s.clients.find((c) => c.id === clientId));
  if (!client) return /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    "Client not found. ",
    /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/clients", className: "text-primary", children: "Back" })
  ] }) });
  const age = client.dob ? (/* @__PURE__ */ new Date()).getFullYear() - new Date(client.dob).getFullYear() : "";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AppShell, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ClientAvatar, { name: client.name, size: 40 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-semibold", children: client.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded", children: client.type })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-5 border-b border-border mb-6 text-sm overflow-x-auto", children: tabs.map(([slug, label]) => {
      const active = path.endsWith(`/${slug}`);
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { from: "/clients/$clientId", to: "/clients/$clientId/$tab", params: {
        clientId,
        tab: slug
      }, className: `pb-3 border-b-2 whitespace-nowrap ${active ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`, children: label }, slug);
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-lg border border-border p-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-sm", children: "Client Portal" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "text-xs text-primary", children: "Done" })
          ] }),
          client.portalStatus !== "none" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs space-y-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-foreground font-medium", children: client.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-muted-foreground truncate", children: client.portalEmail }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-muted-foreground", children: [
              "Invite sent ",
              fmtDate(client.portalInviteSent)
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between pt-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "text-destructive text-xs", children: "Remove access" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => toast.success("Invite resent"), className: "text-xs text-primary border border-border rounded px-2 py-1", children: "Resend invite" })
            ] })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "No portal access" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-lg border border-border p-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-sm", children: "Client Info" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "w-3.5 h-3.5 text-muted-foreground" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2.5 text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Full name", value: client.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-muted-foreground uppercase text-[10px] font-semibold mb-0.5", children: "Personal email" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Star, { className: "w-3 h-3 text-amber-500" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("a", { className: "text-primary truncate flex-1", href: `mailto:${client.email}`, children: client.email || "—" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "w-3 h-3 text-muted-foreground cursor-pointer", onClick: () => {
                  navigator.clipboard.writeText(client.email);
                  toast.success("Copied");
                } })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-muted-foreground uppercase text-[10px] font-semibold mb-0.5", children: "Mobile" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Star, { className: "w-3 h-3 text-amber-500" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: client.phone || "—" })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-lg border border-border p-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-sm", children: "About" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "w-3.5 h-3.5 text-muted-foreground" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2.5 text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "SSN/ITIN", value: client.ssn }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "DOB", value: `${fmtDate(client.dob)}${age ? ` (age ${age})` : ""}` }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Occupation", value: client.occupation }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Client since", value: fmtDate(client.clientSince) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Created on", value: fmtDate(client.createdOn) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {}) })
    ] })
  ] });
}
function Field({
  label,
  value
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-muted-foreground uppercase text-[10px] font-semibold mb-0.5", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-foreground", children: value || "—" })
  ] });
}
export {
  ClientLayout as component
};
