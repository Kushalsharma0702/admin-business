import { K as jsxRuntimeExports } from "./index.mjs";
import { L as ListPage } from "./ListPage-DwCHn9Xa.mjs";
import { a as useAppStore, u as uid } from "./useAppStore-DqzUQQt1.mjs";
import { t as toast } from "./index-De8JtfrF.mjs";
import { U as Upload } from "./upload-Jt8yCBgQ.mjs";
import { F as FileText } from "./dialog-iHg5lQpM.mjs";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./AppShell-BCNUyQp7.mjs";
import "./router-CxdnWRBk.mjs";
import "./createLucideIcon-B0qOMXcq.mjs";
import "./index-BSEENsC1.mjs";
import "./index-H_3XM99b.mjs";
function FilesPage() {
  const {
    files,
    addFile,
    clients
  } = useAppStore();
  const onUpload = (e) => {
    const list = e.target.files;
    if (!list) return;
    Array.from(list).forEach((f) => addFile({
      id: uid(),
      clientId: clients[0]?.id ?? "",
      name: f.name,
      type: f.type || "file",
      size: f.size,
      uploadedAt: (/* @__PURE__ */ new Date()).toLocaleString(),
      uploadedBy: "Angela Martin"
    }));
    toast.success(`${list.length} file(s) uploaded`);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ListPage, { title: "Files", subtitle: `${files.length} files`, actions: /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "inline-flex", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "file", multiple: true, className: "hidden", onChange: onUpload }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "cursor-pointer inline-flex items-center px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "w-4 h-4 mr-1.5" }),
      "Upload"
    ] })
  ] }), children: files.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block border-2 border-dashed border-border rounded-lg p-16 text-center cursor-pointer hover:bg-muted/30", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "file", multiple: true, className: "hidden", onChange: onUpload }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "w-10 h-10 mx-auto text-muted-foreground mb-3" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium text-lg", children: "Add files" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground mt-1", children: "Drag and drop files here or click to upload" })
  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-card rounded-lg border border-border overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Name" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Client" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Type" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right px-4 py-2.5 font-semibold", children: "Size" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Uploaded" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "By" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: files.map((f) => {
      const client = clients.find((c) => c.id === f.clientId);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border last:border-0 hover:bg-muted/40", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-4 py-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "w-4 h-4 inline mr-2 text-muted-foreground" }),
          f.name
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: client?.name ?? "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: f.type }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-4 py-2.5 text-right", children: [
          (f.size / 1024).toFixed(1),
          " KB"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: f.uploadedAt }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: f.uploadedBy })
      ] }, f.id);
    }) })
  ] }) }) });
}
export {
  FilesPage as component
};
