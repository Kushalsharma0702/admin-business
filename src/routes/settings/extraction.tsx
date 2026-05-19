import { createFileRoute } from "@tanstack/react-router";
import { useAppStore } from "@/store/useAppStore";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/settings/extraction")({ component: ExtractionPage });

function ExtractionPage() {
  const { extractionSettings, updateExtraction } = useAppStore();
  const [form, setForm] = useState(extractionSettings);
  const save = () => { updateExtraction(form); toast.success("Extraction settings saved"); };
  const email = `${form.emailPrefix}@costs.dext.com`;

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-6">Extraction</h2>
      <Card className="p-6 space-y-5">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Extract by Email</label>
          <div className="flex gap-2 items-center">
            <Input value={form.emailPrefix} onChange={e => setForm({ ...form, emailPrefix: e.target.value })} className="max-w-[200px]" />
            <span className="text-sm text-muted-foreground">@costs.dext.com</span>
            <button onClick={() => { navigator.clipboard.writeText(email); toast.success("Copied"); }} className="text-muted-foreground hover:text-foreground"><Copy className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Inbox tabs</label>
          <Switch checked={form.showInboxTabs} onCheckedChange={v => setForm({ ...form, showInboxTabs: v })} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Duplicate items</label>
          <select className="w-full border border-border rounded-md h-9 px-2 text-sm bg-background" value={form.duplicateMode} onChange={e => setForm({ ...form, duplicateMode: e.target.value })}>
            <option>Automatic</option><option>Manual</option><option>Disabled</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Tax extraction</label>
          <Switch checked={form.extractTax} onCheckedChange={v => setForm({ ...form, extractTax: v })} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Default tax rate (%)</label>
          <Input type="number" value={form.defaultTaxRate} onChange={e => setForm({ ...form, defaultTaxRate: Number(e.target.value) })} className="max-w-[120px]" />
        </div>
        <Button onClick={save}>Save</Button>
      </Card>
    </div>
  );
}
