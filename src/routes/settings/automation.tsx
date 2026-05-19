import { createFileRoute } from "@tanstack/react-router";
import { useAppStore } from "@/store/useAppStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/settings/automation")({ component: AutomationPage });

function AutomationPage() {
  const { automationSettings, updateAutomation } = useAppStore();
  const [form, setForm] = useState(automationSettings);
  const save = () => { updateAutomation(form); toast.success("Automation settings saved"); };

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-6">Automation</h2>
      <Card className="p-6 space-y-5">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Auto-categorisation</label>
          <select className="w-full border border-border rounded-md h-9 px-2 text-sm bg-background" value={form.autoCategorisation} onChange={e => setForm({ ...form, autoCategorisation: e.target.value })}>
            <option>Always</option><option>Sometimes</option><option>Never</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Default category</label>
          <select className="w-full border border-border rounded-md h-9 px-2 text-sm bg-background" value={form.defaultCategory} onChange={e => setForm({ ...form, defaultCategory: e.target.value })}>
            <option>Office Expenses</option><option>Travel</option><option>Meals</option><option>Supplies</option><option>Utilities</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Smart Suggestions</label>
          <Switch checked={form.smartSuggestions} onCheckedChange={v => setForm({ ...form, smartSuggestions: v })} />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Auto-apply</label>
          <Switch checked={form.autoApply} onCheckedChange={v => setForm({ ...form, autoApply: v })} />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Group uncategorised</label>
          <Switch checked={form.groupUncategorised} onCheckedChange={v => setForm({ ...form, groupUncategorised: v })} />
        </div>
        <Button onClick={save}>Save</Button>
      </Card>
    </div>
  );
}
