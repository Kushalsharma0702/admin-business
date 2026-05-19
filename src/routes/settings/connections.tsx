import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/settings/connections")({ component: ConnectionsPage });

const integrations = [
  { id: "qbo", name: "QuickBooks Online", logo: "QBO", color: "bg-green-500", connected: false },
  { id: "xero", name: "Xero", logo: "XRO", color: "bg-sky-500", connected: false },
  { id: "sage", name: "Sage", logo: "SGE", color: "bg-emerald-600", connected: false },
  { id: "freshbooks", name: "FreshBooks", logo: "FB", color: "bg-blue-500", connected: false },
];

function ConnectionsPage() {
  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-6">Connections</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map(i => (
          <Card key={i.id} className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg ${i.color} text-white font-bold text-xs flex items-center justify-center`}>{i.logo}</div>
              <div className="font-medium">{i.name}</div>
            </div>
            <div className="text-xs text-muted-foreground mb-3">
              {i.connected ? "Connected" : "Not connected"}
            </div>
            <Button variant={i.connected ? "outline" : "default"} size="sm" onClick={() => toast.success(i.connected ? "Disconnected" : "Connected")}>
              {i.connected ? "Disconnect" : "Connect"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
