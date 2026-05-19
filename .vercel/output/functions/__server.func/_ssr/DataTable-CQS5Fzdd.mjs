import { V as reactExports, K as jsxRuntimeExports } from "./index.mjs";
import { a as cn$1 } from "./index-De8JtfrF.mjs";
import { C as Checkbox } from "./checkbox-B8Yax9Aq.mjs";
import { a as ChevronUp, C as ChevronDown } from "./chevron-up-DC1ELb_B.mjs";
function DataTable({
  columns,
  data,
  selectable,
  onRowClick,
  selected,
  onSelectedChange,
  empty
}) {
  const [sortKey, setSortKey] = reactExports.useState(null);
  const [sortDir, setSortDir] = reactExports.useState("asc");
  const sorted = sortKey ? [...data].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const ord = (av ?? "") < (bv ?? "") ? -1 : (av ?? "") > (bv ?? "") ? 1 : 0;
    return sortDir === "asc" ? ord : -ord;
  }) : data;
  const toggleAll = () => {
    if (!onSelectedChange) return;
    if (selected && selected.length === data.length) onSelectedChange([]);
    else onSelectedChange(data.map((d) => d.id));
  };
  const toggle = (id) => {
    if (!onSelectedChange || !selected) return;
    onSelectedChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };
  if (data.length === 0 && empty) return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: empty });
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto bg-card rounded-lg border border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/50 border-b border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
      selectable && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "w-10 px-3 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Checkbox, { checked: selected ? selected.length === data.length && data.length > 0 : false, onCheckedChange: toggleAll }) }),
      columns.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "th",
        {
          style: { width: c.width },
          className: cn$1(
            "px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide",
            c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
            c.sortable && "cursor-pointer select-none hover:text-foreground"
          ),
          onClick: () => {
            if (!c.sortable) return;
            if (sortKey === c.key) setSortDir(sortDir === "asc" ? "desc" : "asc");
            else {
              setSortKey(c.key);
              setSortDir("asc");
            }
          },
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1", children: [
            c.header,
            c.sortable && sortKey === c.key && (sortDir === "asc" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { className: "w-3 h-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "w-3 h-3" }))
          ] })
        },
        c.key
      ))
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: sorted.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "tr",
      {
        className: cn$1("border-b border-border last:border-0 hover:bg-muted/40 transition-colors", onRowClick && "cursor-pointer"),
        onClick: (e) => {
          if (e.target.closest("[data-stop-row]")) return;
          onRowClick?.(row);
        },
        children: [
          selectable && /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2.5", "data-stop-row": true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Checkbox, { checked: selected?.includes(row.id) ?? false, onCheckedChange: () => toggle(row.id) }) }),
          columns.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "td",
            {
              className: cn$1(
                "px-3 py-2.5 text-foreground",
                c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
              ),
              children: c.render ? c.render(row) : String(row[c.key] ?? "")
            },
            c.key
          ))
        ]
      },
      row.id
    )) })
  ] }) });
}
export {
  DataTable as D
};
