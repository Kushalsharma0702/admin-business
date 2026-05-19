import { Bell, Search } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GlobalSearch } from "./GlobalSearch";
import { useAppStore } from "@/store/useAppStore";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard", "/inbox": "Inbox", "/clients": "Client Portals", "/files": "Files",
  "/tasks": "Tasks", "/time": "Time", "/billing": "Billing", "/templates": "Templates",
  "/insights": "Insights", "/costs": "Costs", "/sales": "Sales", "/bank": "Bank",
  "/workflows": "Workflows", "/submission-history": "Submission History", "/settings": "Settings",
};

export function TopBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const clients = useAppStore((s) => s.clients);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  let title = "Dashboard";
  const m = path.match(/^\/clients\/([^/]+)\/?(\w+)?/);
  if (m && m[1] !== "") {
    const c = clients.find((x) => x.id === m[1]);
    const tab = m[2] ? m[2].charAt(0).toUpperCase() + m[2].slice(1) : "Home";
    title = c ? `${c.name} — ${tab}` : "Clients";
  } else {
    const key = Object.keys(titles).filter((k) => path === k || path.startsWith(k + "/")).sort((a, b) => b.length - a.length)[0];
    title = titles[key] || "Dashboard";
  }

  return (
    <>
      <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-20">
        <h2 className="text-[15px] font-semibold text-foreground truncate">{title}</h2>
        <div className="flex items-center gap-3">
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-muted/40 text-muted-foreground hover:bg-muted text-sm w-64">
            <Search className="w-4 h-4" /><span>Search…</span>
            <kbd className="ml-auto text-[10px] font-mono bg-background border border-border rounded px-1.5 py-0.5">⌘K</kbd>
          </button>
          <button className="relative w-9 h-9 rounded-md hover:bg-muted flex items-center justify-center">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
          </button>
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-xs flex items-center justify-center">AM</div>
            <div className="text-sm hidden md:block">
              <div className="font-medium text-foreground leading-tight">Angela Martin</div>
              <div className="text-muted-foreground text-xs leading-tight">Tax Advisor</div>
            </div>
          </div>
        </div>
      </header>
      <GlobalSearch open={open} onOpenChange={setOpen} />
    </>
  );
}