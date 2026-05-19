import { V as reactExports, K as jsxRuntimeExports } from "./_ssr/index.mjs";
import { b as useParams } from "./_ssr/router-CxdnWRBk.mjs";
import { a as useAppStore, u as uid } from "./_ssr/useAppStore-DqzUQQt1.mjs";
import { C as Card } from "./_ssr/card-CDOUGn8L.mjs";
import { B as Button } from "./_ssr/button-A6qM_v8i.mjs";
import { I as Input } from "./_ssr/input-CsecQHmO.mjs";
import { T as Textarea } from "./_ssr/textarea-Dyd8-Pa9.mjs";
import { E as EmptyState } from "./_ssr/EmptyState-BtcJ24RH.mjs";
import { S as StatusBadge } from "./_ssr/StatusBadge-uIqVQAhZ.mjs";
import { f as fmtDate, a as fmtMoney } from "./_ssr/utils-BjL8ABdx.mjs";
import { t as toast } from "./_ssr/index-De8JtfrF.mjs";
import { C as Clock, i as Receipt, F as FileText, D as Dialog, b as DialogContent, d as DialogHeader, e as DialogTitle, c as DialogFooter } from "./_ssr/dialog-iHg5lQpM.mjs";
import { c as createLucideIcon } from "./_ssr/createLucideIcon-B0qOMXcq.mjs";
import { U as Upload } from "./_ssr/upload-Jt8yCBgQ.mjs";
import { P as Plus } from "./_ssr/plus-DgNPYq10.mjs";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./_ssr/index-BSEENsC1.mjs";
import "./_ssr/index-H_3XM99b.mjs";
const __iconNode$4 = [
  [
    "path",
    {
      d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      key: "1oefj6"
    }
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "wfsgrz" }],
  ["path", { d: "M9 15h6", key: "cctwl0" }],
  ["path", { d: "M12 18v-6", key: "17g6i2" }]
];
const FilePlus = createLucideIcon("file-plus", __iconNode$4);
const __iconNode$3 = [
  [
    "path",
    {
      d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      key: "1oefj6"
    }
  ],
  ["path", { d: "M12 17h.01", key: "p32p05" }],
  ["path", { d: "M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3", key: "mhlwft" }]
];
const FileQuestionMark = createLucideIcon("file-question-mark", __iconNode$3);
const __iconNode$2 = [
  ["path", { d: "M12 3v18", key: "108xh3" }],
  ["path", { d: "m19 8 3 8a5 5 0 0 1-6 0zV7", key: "zcdpyk" }],
  ["path", { d: "M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1", key: "1yorad" }],
  ["path", { d: "m5 8 3 8a5 5 0 0 1-6 0zV7", key: "eua70x" }],
  ["path", { d: "M7 21h10", key: "1b0cd5" }]
];
const Scale = createLucideIcon("scale", __iconNode$2);
const __iconNode$1 = [
  [
    "path",
    {
      d: "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",
      key: "1ffxy3"
    }
  ],
  ["path", { d: "m21.854 2.147-10.94 10.939", key: "12cjpa" }]
];
const Send = createLucideIcon("send", __iconNode$1);
const __iconNode = [
  [
    "path",
    {
      d: "M21 9a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z",
      key: "1dfntj"
    }
  ],
  ["path", { d: "M15 3v5a1 1 0 0 0 1 1h5", key: "6s6qgf" }]
];
const StickyNote = createLucideIcon("sticky-note", __iconNode);
function ClientTab() {
  const {
    clientId,
    tab
  } = useParams({
    from: "/clients/$clientId/$tab"
  });
  const clients = useAppStore((s) => s.clients);
  const client = reactExports.useMemo(() => clients.find((c) => c.id === clientId), [clients, clientId]);
  if (!client) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Not found" });
  switch (tab) {
    case "home":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Home, { clientId });
    case "communication":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Communication, { clientId });
    case "notes":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Notes, { clientId });
    case "files":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Files, { clientId });
    case "tasks":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Tasks, { clientId });
    case "resolution-cases":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Resolution, { clientId });
    case "organizers":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Organizers, { clientId });
    case "transcripts":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Transcripts, { clientId });
    case "billing":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Billing, { clientId });
    case "time-entries":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(TimeEntries, { clientId });
    default:
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Home, { clientId });
  }
}
function Home({
  clientId
}) {
  const allTasks = useAppStore((s) => s.tasks);
  const tasks = reactExports.useMemo(() => allTasks.filter((t) => t.clientId === clientId && t.status !== "Completed"), [allTasks, clientId]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold", children: "Tasks" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: `/clients/${clientId}/tasks`, className: "text-primary text-sm", children: "View all tasks" })
      ] }),
      tasks.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { icon: FilePlus, title: "No open tasks" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2", children: tasks.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex justify-between text-sm py-2 border-b border-border last:border-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: fmtDate(t.dueDate) })
      ] }, t.id)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold", children: "Recent Files" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: `/clients/${clientId}/files`, className: "text-primary text-sm", children: "View all files" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { icon: Upload, title: "Add files", description: "Drag and drop files here", actionLabel: "Upload file", onAction: () => toast.info("Open Files tab to upload") })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold", children: "Notes" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: `/clients/${clientId}/notes`, className: "text-primary text-sm", children: "Add a note" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { icon: StickyNote, title: "No notes", description: "There are no notes for this client.", actionLabel: "Add note", onAction: () => toast.info("Open Notes tab") })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold", children: "Resolution Cases" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: `/clients/${clientId}/resolution-cases`, className: "text-primary text-sm", children: "Create resolution case" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { icon: Scale, title: "No active resolution cases", description: "Track IRS issues for this client.", actionLabel: "Create resolution case", onAction: () => toast.info("Open Resolution Cases tab") })
    ] })
  ] });
}
function Communication({
  clientId
}) {
  const allMessages = useAppStore((s) => s.messages);
  const addMessage = useAppStore((s) => s.addMessage);
  const msgs = reactExports.useMemo(() => allMessages.filter((m) => m.clientId === clientId), [allMessages, clientId]);
  const [text, setText] = reactExports.useState("");
  const send = () => {
    if (!text.trim()) return;
    addMessage({
      id: uid(),
      clientId,
      from: "Angela Martin",
      to: "Client",
      channel: "Portal",
      body: text,
      sentAt: (/* @__PURE__ */ new Date()).toLocaleString()
    });
    setText("");
    toast.success("Message sent");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-2 text-xs mb-4", children: ["All", "Email", "SMS", "Portal messages"].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "px-2 py-1 rounded bg-muted", children: f }, f)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3 mb-4 max-h-96 overflow-y-auto", children: msgs.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `p-3 rounded-lg ${m.from === "Angela Martin" ? "bg-primary/10 ml-12" : "bg-muted mr-12"}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground mb-1", children: [
        m.from,
        " • ",
        m.channel,
        " • ",
        m.sentAt
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm", children: m.body })
    ] }, m.id)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Textarea, { value: text, onChange: (e) => setText(e.target.value), placeholder: "Type a message…", rows: 2 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: send, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "w-4 h-4" }) })
    ] })
  ] });
}
function Notes({
  clientId
}) {
  const allNotes = useAppStore((s) => s.notes);
  const addNote = useAppStore((s) => s.addNote);
  const notes = reactExports.useMemo(() => allNotes.filter((n) => n.clientId === clientId), [allNotes, clientId]);
  const [open, setOpen] = reactExports.useState(false);
  const [text, setText] = reactExports.useState("");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold", children: "Notes" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", onClick: () => setOpen(true), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-4 h-4 mr-1" }),
        "Add note"
      ] })
    ] }),
    notes.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { icon: StickyNote, title: "No notes", description: "There are no notes for this client.", actionLabel: "Add note", onAction: () => setOpen(true) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: notes.map((n) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 border border-border rounded", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground mb-1", children: [
        n.author,
        " • ",
        n.createdAt
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm", children: n.text })
    ] }, n.id)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: setOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Add note" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Textarea, { value: text, onChange: (e) => setText(e.target.value), rows: 5, placeholder: "Note text…" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setOpen(false), children: "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => {
          if (!text.trim()) return;
          addNote({
            id: uid(),
            clientId,
            text,
            author: "Angela Martin",
            createdAt: (/* @__PURE__ */ new Date()).toLocaleString()
          });
          setText("");
          setOpen(false);
          toast.success("Note added");
        }, children: "Save" })
      ] })
    ] }) })
  ] });
}
function Files({
  clientId
}) {
  const allFiles = useAppStore((s) => s.files);
  const addFile = useAppStore((s) => s.addFile);
  const files = reactExports.useMemo(() => allFiles.filter((f) => f.clientId === clientId), [allFiles, clientId]);
  const onUpload = (e) => {
    const list = e.target.files;
    if (!list) return;
    Array.from(list).forEach((f) => addFile({
      id: uid(),
      clientId,
      name: f.name,
      type: f.type || "file",
      size: f.size,
      uploadedAt: (/* @__PURE__ */ new Date()).toLocaleString(),
      uploadedBy: "Angela Martin"
    }));
    toast.success(`${list.length} file(s) uploaded`);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold", children: "Files" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "inline-flex", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "file", multiple: true, className: "hidden", onChange: onUpload }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "cursor-pointer inline-flex items-center px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "w-4 h-4 mr-1.5" }),
          "Upload"
        ] })
      ] })
    ] }),
    files.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:bg-muted/30", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "file", multiple: true, className: "hidden", onChange: onUpload }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "w-8 h-8 mx-auto text-muted-foreground mb-2" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium", children: "Add files" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: "Drag and drop files here" })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs uppercase text-muted-foreground border-b border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left py-2", children: "Name" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left py-2", children: "Type" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right py-2", children: "Size" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left py-2 pl-4", children: "Uploaded" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left py-2", children: "By" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: files.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border last:border-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "py-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "w-4 h-4 inline mr-2 text-muted-foreground" }),
          f.name
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: f.type }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "text-right", children: [
          (f.size / 1024).toFixed(1),
          " KB"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "pl-4", children: f.uploadedAt }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: f.uploadedBy })
      ] }, f.id)) })
    ] })
  ] });
}
function Tasks({
  clientId
}) {
  const allTasks = useAppStore((s) => s.tasks);
  const addTask = useAppStore((s) => s.addTask);
  const tasks = reactExports.useMemo(() => allTasks.filter((t) => t.clientId === clientId), [allTasks, clientId]);
  const [open, setOpen] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({
    name: "",
    type: "Review",
    assignee: "Angela Martin (me)",
    startDate: "",
    dueDate: "",
    priority: "No priority"
  });
  const active = reactExports.useMemo(() => tasks.filter((t) => t.status !== "Completed"), [tasks]);
  const done = reactExports.useMemo(() => tasks.filter((t) => t.status === "Completed"), [tasks]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => setOpen(true), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-4 h-4 mr-1" }),
      "Create task"
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-0 overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-3 border-b border-border font-semibold text-sm", children: [
        "Active tasks (",
        active.length,
        ")"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs uppercase text-muted-foreground bg-muted/40", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2", children: "Status" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2", children: "Task name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2", children: "Type" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2", children: "Assignee" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2", children: "Due" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2", children: "Priority" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: active.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border last:border-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: t.status }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 font-medium", children: t.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: t.type }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: t.assignee }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: fmtDate(t.dueDate) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: t.priority }) })
        ] }, t.id)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-0 overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-3 border-b border-border font-semibold text-sm", children: [
        "Completed tasks (",
        done.length,
        ")"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs uppercase text-muted-foreground bg-muted/40", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2", children: "Task name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2", children: "Type" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2", children: "Assignee" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2", children: "Due" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2", children: "Completed" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2", children: "Priority" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: done.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border last:border-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: t.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: t.type }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: t.assignee }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: fmtDate(t.dueDate) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: fmtDate(t.completedDate) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: t.priority }) })
        ] }, t.id)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: setOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Create task" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { placeholder: "Task name", value: form.name, onChange: (e) => setForm({
          ...form,
          name: e.target.value
        }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "w-full border border-border rounded-md h-9 px-2 text-sm bg-background", value: form.type, onChange: (e) => setForm({
          ...form,
          type: e.target.value
        }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Review" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "eSign Request" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Organizer" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Other" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { placeholder: "Assignee", value: form.assignee, onChange: (e) => setForm({
          ...form,
          assignee: e.target.value
        }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "date", value: form.startDate, onChange: (e) => setForm({
            ...form,
            startDate: e.target.value
          }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "date", value: form.dueDate, onChange: (e) => setForm({
            ...form,
            dueDate: e.target.value
          }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setOpen(false), children: "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => {
          if (!form.name) return;
          addTask({
            id: uid(),
            clientId,
            name: form.name,
            type: form.type,
            assignee: form.assignee,
            startDate: form.startDate,
            dueDate: form.dueDate,
            status: "With Client",
            priority: "No priority"
          });
          setOpen(false);
          setForm({
            ...form,
            name: ""
          });
          toast.success("Task created");
        }, children: "Create" })
      ] })
    ] }) })
  ] });
}
function Resolution({
  clientId
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "p-5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { icon: Scale, title: "No active resolution cases", description: "Track tax resolution work for this client.", actionLabel: "Create resolution case", onAction: () => toast.success("Resolution case created") }) });
}
function Organizers({
  clientId
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "p-5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { icon: FileQuestionMark, title: "No organizers sent", description: "Send a tax organizer to gather client info.", actionLabel: "Send organizer", onAction: () => toast.success("Organizer sent") }) });
}
function Transcripts({
  clientId
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "p-5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { icon: FileText, title: "No transcripts", description: "Request IRS transcripts for this client.", actionLabel: "Request transcript", onAction: () => toast.success("Transcript requested") }) });
}
function Billing({
  clientId
}) {
  const allBilling = useAppStore((s) => s.billing);
  const items = reactExports.useMemo(() => allBilling.filter((b) => b.clientId === clientId), [allBilling, clientId]);
  const totalBilled = reactExports.useMemo(() => items.reduce((a, b) => a + b.amount, 0), [items]);
  const totalPaid = reactExports.useMemo(() => items.filter((b) => b.status === "Paid").reduce((a, b) => a + b.amount, 0), [items]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Total billed" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xl font-semibold", children: fmtMoney(totalBilled) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Total paid" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xl font-semibold text-emerald-600", children: fmtMoney(totalPaid) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Outstanding" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xl font-semibold text-rose-600", children: fmtMoney(totalBilled - totalPaid) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-0 overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-3 border-b border-border flex justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-sm", children: "Invoices" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", onClick: () => toast.success("Invoice draft created"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Receipt, { className: "w-4 h-4 mr-1" }),
          "Create invoice"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs uppercase text-muted-foreground bg-muted/40", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2", children: "Invoice #" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2", children: "Date" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2", children: "Description" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right px-4 py-2", children: "Amount" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2 pl-6", children: "Status" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: items.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border last:border-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 font-medium", children: b.invoiceNumber }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: fmtDate(b.date) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: b.description }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-right", children: fmtMoney(b.amount) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 pl-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: b.status }) })
        ] }, b.id)) })
      ] })
    ] })
  ] });
}
function TimeEntries({
  clientId
}) {
  const allTimeEntries = useAppStore((s) => s.timeEntries);
  const items = reactExports.useMemo(() => allTimeEntries.filter((t) => t.clientId === clientId), [allTimeEntries, clientId]);
  const total = reactExports.useMemo(() => items.reduce((a, b) => a + b.hours, 0), [items]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-0 overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-3 border-b border-border flex justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold text-sm", children: [
        "Time entries — ",
        total.toFixed(1),
        " hrs total"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", onClick: () => toast.success("Time logged"), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "w-4 h-4 mr-1" }),
        "Log time"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs uppercase text-muted-foreground bg-muted/40", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2", children: "Date" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2", children: "Description" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right px-4 py-2", children: "Hours" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right px-4 py-2", children: "Rate" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right px-4 py-2", children: "Amount" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2 pl-6", children: "Logged by" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: items.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border last:border-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: fmtDate(t.date) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: t.description }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-right", children: t.hours }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-right", children: fmtMoney(t.rate) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-right font-medium", children: fmtMoney(t.hours * t.rate) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 pl-6", children: t.loggedBy })
      ] }, t.id)) })
    ] })
  ] });
}
export {
  ClientTab as component
};
