import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({ component: SettingsLayout });

const sections = [
  {
    heading: "Business Settings",
    items: [
      { to: "/settings/business-profile", label: "Business profile" },
      { to: "/settings/connections", label: "Connections" },
      { to: "/settings/extraction", label: "Extraction" },
      { to: "/settings/automation", label: "Automation" },
      { to: "/settings/approvals", label: "Approvals" },
      { to: "/settings/mileage", label: "Mileage" },
      { to: "/settings/exports", label: "Exports" },
      { to: "/settings/lists", label: "Lists" },
      { to: "/settings/vault", label: "Vault" },
    ],
  },
  {
    heading: "Manage",
    items: [
      { to: "/settings/subscription", label: "Subscription" },
    ],
  },
  {
    heading: "Quick Links",
    items: [
      { to: "/clients", label: "Client list" },
    ],
  },
];

function SettingsLayout() {
  const path = useRouterState({ select: s => s.location.pathname });
  return (
    <AppShell>
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <div className="grid grid-cols-[220px_1fr] gap-8">
        <nav className="space-y-5">
          {sections.map(s => (
            <div key={s.heading}>
              <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-2">{s.heading}</div>
              <div className="space-y-0.5">
                {s.items.map(item => (
                  <Link key={item.to} to={item.to} className={cn(
                    "block px-3 py-2 text-sm rounded-md",
                    path.startsWith(item.to) ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}>{item.label}</Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div><Outlet /></div>
      </div>
    </AppShell>
  );
}
