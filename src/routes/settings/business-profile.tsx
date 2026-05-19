import { createFileRoute } from "@tanstack/react-router";
import { useAppStore } from "@/store/useAppStore";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/settings/business-profile")({ component: BusinessProfilePage });

function BusinessProfilePage() {
  const { businessProfile, updateBusiness } = useAppStore();
  const [form, setForm] = useState(businessProfile);

  const save = () => { updateBusiness(form); toast.success("Business profile saved"); };
  const set = (k: keyof typeof form, v: string | boolean) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-6">Business Profile</h2>
      <Card className="p-6 space-y-5">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Logo</label>
          <label className="block border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30">
            <input type="file" className="hidden" onChange={() => toast.success("Logo uploaded")} accept="image/*" />
            <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
            <div className="text-sm text-muted-foreground">Click to upload logo</div>
          </label>
        </div>
        <Field label="Business name" value={form.name} onChange={v => set("name", v)} />
        <Field label="CRN" value={form.crn} onChange={v => set("crn", v)} />
        <Field label="Country" value={form.country} onChange={v => set("country", v)} />
        <Field label="Base currency" value={form.currency} onChange={v => set("currency", v)} />
        <Field label="Language" value={form.language} onChange={v => set("language", v)} />
        <Field label="Industry" value={form.industry} onChange={v => set("industry", v)} />
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Self employed</label>
          <Switch checked={form.selfEmployed} onCheckedChange={v => set("selfEmployed", v)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Year end month" value={form.yearEndMonth} onChange={v => set("yearEndMonth", v)} />
          <Field label="Year end day" value={form.yearEndDay} onChange={v => set("yearEndDay", v)} />
        </div>
        <Field label="Tax number" value={form.taxNumber} onChange={v => set("taxNumber", v)} />
        <Field label="Reporting cycle" value={form.reportingCycle} onChange={v => set("reportingCycle", v)} />
        <Button onClick={save}>Save</Button>
      </Card>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">{label}</label>
      <Input value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
