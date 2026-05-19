import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/settings/approvals")({ component: ApprovalsPage });

function ApprovalsPage() {
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState("500");
  const [approver, setApprover] = useState("Angela Martin");

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-6">Approvals</h2>
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Enable approvals</label>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        {enabled && (
          <>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Threshold amount ($)</label>
              <Input type="number" value={threshold} onChange={e => setThreshold(e.target.value)} className="max-w-[200px]" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Approver</label>
              <select className="w-full border border-border rounded-md h-9 px-2 text-sm bg-background" value={approver} onChange={e => setApprover(e.target.value)}>
                <option>Angela Martin</option><option>Oscar Martinez</option><option>Kevin Malone</option>
              </select>
            </div>
          </>
        )}
        <Button onClick={() => toast.success("Approvals settings saved")}>Save</Button>
      </Card>
    </div>
  );
}
