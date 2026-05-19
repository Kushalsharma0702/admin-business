import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Bell, Users, Folder, CheckSquare, Clock, CreditCard, Layout, BarChart2, Receipt, Landmark, GitBranch, Settings, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const canopyItems = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/inbox", label: "Inbox", icon: Bell },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/files", label: "Files", icon: Folder },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/time", label: "Time", icon: Clock },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/templates", label: "Templates", icon: Layout },
  { to: "/insights", label: "Insights", icon: BarChart2 },
];

const dextItems = [
  { to: "/costs", label: "Costs", icon: Receipt },
  { to: "/ocr", label: "Costs inbox", icon: Receipt },
  { to: "/sales", label: "Sales", icon: Receipt },
  { to: "/bank", label: "Bank", icon: Landmark },
  { to: "/workflows", label: "Workflows", icon: GitBranch },
  { to: "/submission-history", label: "Submissions", icon: FileText },
];

export function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  const Item = (it: { to: string; label: string; icon: typeof Home }) => {
    const active = path === it.to || path.startsWith(it.to + "/");
    const Icon = it.icon;
    return (
      <Link
        key={it.to}
        to={it.to}
        className={cn(
          "relative flex items-center gap-3 mx-2 px-3 h-10 rounded-md text-[13px] font-medium transition-colors",
          active
            ? "bg-sidebar-active-bg text-sidebar-active-fg"
            : "text-sidebar-fg hover:bg-white/5 hover:text-white",
        )}
      >
        {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />}
        <Icon className="w-[18px] h-[18px] shrink-0" />
        <span className="opacity-0 group-hover/sb:opacity-100 transition-opacity whitespace-nowrap">{it.label}</span>
      </Link>
    );
  };

  return (
    <aside className="group/sb fixed left-0 top-0 bottom-0 w-[60px] hover:w-[220px] bg-sidebar-bg z-30 transition-all duration-200 flex flex-col overflow-hidden shadow-xl">
      <div className="h-14 flex items-center gap-2 px-4 border-b border-white/5">
        <div className="w-7 h-7 rounded bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">C</div>
        <span className="text-white font-semibold text-sm whitespace-nowrap opacity-0 group-hover/sb:opacity-100 transition-opacity">Canopy + Dext</span>
      </div>
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
        {canopyItems.map(Item)}
        <div className="my-3 mx-4 border-t border-white/5" />
        <div className="px-5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-fg/60 opacity-0 group-hover/sb:opacity-100 transition-opacity">Financial</div>
        {dextItems.map(Item)}
      </nav>
      <div className="border-t border-white/5 py-2">
        <Link
          to="/settings"
          className="flex items-center gap-3 mx-2 px-3 h-10 rounded-md text-sidebar-fg hover:bg-white/5 hover:text-white text-[13px] font-medium"
        >
          <Settings className="w-[18px] h-[18px] shrink-0" />
          <span className="opacity-0 group-hover/sb:opacity-100 transition-opacity whitespace-nowrap">Settings</span>
        </Link>
      </div>
    </aside>
  );
}