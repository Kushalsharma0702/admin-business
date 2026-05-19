import { createFileRoute } from "@tanstack/react-router";
import { useAppStore } from "@/store/useAppStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/settings/exports")({ component: ExportsPage });

function ExportsPage() {
  const { exportSettings, updateExport } = useAppStore();
  const [form, setForm] = useState(exportSettings);
  const save = () => { updateExport(form); toast.success("Export settings saved"); };

  const allCols = ["Receipt ID", "Description", "Net amount", "Tax amount", "Total amount", "Supplier", "Date", "Category", "Payment method"];

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-6">Exports</h2>
      <Card className="p-6 space-y-6">
        <div>
          <h3 className="font-medium text-sm mb-3">CSV Exports</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Format</label>
              <select className="w-full border border-border rounded-md h-9 px-2 text-sm bg-background" value={form.csvFormat} onChange={e => setForm({ ...form, csvFormat: e.target.value })}>
                <option>Standard</option><option>Compact</option><option>Extended</option>
              </select>
            </div>
          </div>
        </div>
        <div>
          <h3 className="font-medium text-sm mb-3">CSV Custom Exports</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Decimal separator</label>
              <select className="w-full border border-border rounded-md h-9 px-2 text-sm bg-background" value={form.decimalSeparator} onChange={e => setForm({ ...form, decimalSeparator: e.target.value })}>
                <option>Dot</option><option>Comma</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Date format</label>
              <select className="w-full border border-border rounded-md h-9 px-2 text-sm bg-background" value={form.dateFormat} onChange={e => setForm({ ...form, dateFormat: e.target.value })}>
                <option>DD-Mon-YYYY</option><option>YYYY-MM-DD</option><option>MM/DD/YYYY</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Show item header</label>
              <Switch checked={form.showItemHeader} onCheckedChange={v => setForm({ ...form, showItemHeader: v })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase mb-2 block">Columns</label>
              <div className="grid grid-cols-2 gap-2">
                {allCols.map(col => (
                  <label key={col} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.columns[col] ?? false} onCheckedChange={v => setForm({ ...form, columns: { ...form.columns, [col]: !!v } })} />
                    {col}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        <Button onClick={save}>Save</Button>
      </Card>
    </div>
  );
}
