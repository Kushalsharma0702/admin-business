import { V as reactExports, K as jsxRuntimeExports } from "./index.mjs";
import { L as ListPage } from "./ListPage-DwCHn9Xa.mjs";
import { a as useAppStore } from "./useAppStore-DqzUQQt1.mjs";
import { C as Card } from "./card-CDOUGn8L.mjs";
import { f as fmtDate } from "./utils-BjL8ABdx.mjs";
import { B as Button } from "./button-A6qM_v8i.mjs";
import { t as toast } from "./index-De8JtfrF.mjs";
import { c as createLucideIcon } from "./createLucideIcon-B0qOMXcq.mjs";
import { C as CircleCheck } from "./circle-check-D0e1kOus.mjs";
import { F as FileText } from "./dialog-iHg5lQpM.mjs";
import { B as Bell } from "./AppShell-BCNUyQp7.mjs";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./router-CxdnWRBk.mjs";
import "./index-BSEENsC1.mjs";
import "./index-H_3XM99b.mjs";
const __iconNode = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["line", { x1: "12", x2: "12", y1: "8", y2: "12", key: "1pkeuh" }],
  ["line", { x1: "12", x2: "12.01", y1: "16", y2: "16", key: "4dfq90" }]
];
const CircleAlert = createLucideIcon("circle-alert", __iconNode);
function InboxPage() {
  const {
    activity,
    tasks
  } = useAppStore();
  const [filter, setFilter] = reactExports.useState("all");
  const notifications = [...tasks.filter((t) => t.status === "With Client").map((t) => ({
    id: `n-${t.id}`,
    icon: CircleAlert,
    iconCls: "bg-amber-50 text-amber-600",
    title: `Task "${t.name}" is waiting on client`,
    time: fmtDate(t.dueDate),
    read: false
  })), ...activity.map((a) => ({
    id: `n-${a.id}`,
    icon: a.type === "task_completed" ? CircleCheck : a.type === "doc_captured" ? FileText : Bell,
    iconCls: a.type === "task_completed" ? "bg-emerald-50 text-emerald-600" : a.type === "doc_captured" ? "bg-orange-50 text-orange-600" : "bg-indigo-50 text-indigo-600",
    title: a.title,
    time: a.timestamp,
    read: true
  }))];
  const filtered = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ListPage, { title: "Inbox", subtitle: `${notifications.filter((n) => !n.read).length} unread`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 mb-4", children: [
      ["all", "unread"].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setFilter(f), className: `px-3 py-1.5 text-sm rounded-md capitalize ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`, children: f }, f)),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", className: "ml-auto", onClick: () => toast.success("All marked as read"), children: "Mark all read" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: filtered.map((n) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: `p-4 flex items-center gap-3 ${!n.read ? "border-primary/30 bg-primary/[0.02]" : ""}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${n.iconCls}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(n.icon, { className: "w-4 h-4" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `text-sm ${!n.read ? "font-medium" : ""}`, children: n.title }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: n.time })
      ] }),
      !n.read && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-2 h-2 rounded-full bg-primary shrink-0" })
    ] }, n.id)) })
  ] });
}
export {
  InboxPage as component
};
