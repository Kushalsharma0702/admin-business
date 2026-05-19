import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/settings/subscription")({ component: SubscriptionPage });

function SubscriptionPage() {
  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-6">Subscription</h2>
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Plan</div>
            <div className="text-xl font-semibold">Pro Plan</div>
          </div>
          <span className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">Active</span>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
          <div>
            <div className="text-xs text-muted-foreground">Renewal</div>
            <div className="text-sm font-medium">Jan 1, 2026</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Seats</div>
            <div className="text-sm font-medium">3 / 10</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Billing</div>
            <div className="text-sm font-medium">Annual</div>
          </div>
        </div>
        <Button onClick={() => toast.success("Redirecting to upgrade…")}>Upgrade plan</Button>
      </Card>
    </div>
  );
}
