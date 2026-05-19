import { V as reactExports, K as jsxRuntimeExports } from "./index.mjs";
import { u as useNavigate } from "./router-CxdnWRBk.mjs";
import { L as ListPage } from "./ListPage-DwCHn9Xa.mjs";
import { a as useAppStore } from "./useAppStore-DqzUQQt1.mjs";
import { S as StatusBadge } from "./StatusBadge-uIqVQAhZ.mjs";
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
function TasksPage() {
  const navigate = useNavigate();
  const {
    tasks,
    clients
  } = useAppStore();
  const [tab, setTab] = reactExports.useState("All");
  const [q, setQ] = reactExports.useState("");
  const statuses = ["All", "With Client", "In Progress", "Review", "Completed"];
  const filtered = tasks.filter((t) => (tab === "All" || t.status === tab) && (t.name.toLowerCase().includes(q.toLowerCase()) || t.assignee.toLowerCase().includes(q.toLowerCase())));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ListPage, { title: "Tasks", subtitle: `${tasks.length} total tasks`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-1 mb-3", children: statuses.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setTab(s), className: `px-3 py-1.5 text-sm rounded-md ${tab === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`, children: s }, s)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { placeholder: "Search tasks…", value: q, onChange: (e) => setQ(e.target.value), className: "max-w-sm mb-4" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-card rounded-lg border border-border overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Task name" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Client" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Type" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Assignee" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Due" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Priority" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: filtered.map((t) => {
        const client = clients.find((c) => c.id === t.clientId);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { onClick: () => navigate({
          to: "/clients/$clientId/$tab",
          params: {
            clientId: t.clientId,
            tab: "tasks"
          }
        }), className: "border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: t.status }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 font-medium", children: t.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: client && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ClientAvatar, { name: client.name, size: 22 }),
            client.name
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: t.type }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: t.assignee }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: fmtDate(t.dueDate) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: t.priority }) })
        ] }, t.id);
      }) })
    ] }) })
  ] });
}
export {
  TasksPage as component
};
