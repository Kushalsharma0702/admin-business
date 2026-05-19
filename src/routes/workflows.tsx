import { createFileRoute } from "@tanstack/react-router";
import { ListPage } from "@/components/app/ListPage";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/workflows")({ component: WorkflowsPage });

function WorkflowsPage() {
  const { workflows, toggleWorkflow } = useAppStore();
  return (
    <ListPage title="Workflows" subtitle={`${workflows.length} workflows`}
      actions={<Button size="sm" className="bg-[#FF5800] hover:bg-[#FF5800]/90" onClick={() => toast.success("Workflow created")}><Plus className="w-4 h-4 mr-1" />Create workflow</Button>}>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">Name</th>
              <th className="text-left px-4 py-2.5 font-semibold">Trigger</th>
              <th className="text-left px-4 py-2.5 font-semibold">Actions</th>
              <th className="text-left px-4 py-2.5 font-semibold">Status</th>
              <th className="text-left px-4 py-2.5 font-semibold">Last run</th>
            </tr>
          </thead>
          <tbody>
            {workflows.map(w => (
              <tr key={w.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="px-4 py-2.5 font-medium">{w.name}</td>
                <td className="px-4 py-2.5">{w.trigger}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{w.actions.join(", ")}</td>
                <td className="px-4 py-2.5">
                  <Switch checked={w.enabled} onCheckedChange={() => { toggleWorkflow(w.id); toast.success(w.enabled ? "Disabled" : "Enabled"); }} />
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{w.lastRun}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ListPage>
  );
}
