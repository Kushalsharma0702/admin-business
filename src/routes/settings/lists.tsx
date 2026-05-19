import { createFileRoute } from "@tanstack/react-router";
import { useAppStore } from "@/store/useAppStore";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { downloadCSV } from "@/components/app/utils";
import { useState } from "react";

export const Route = createFileRoute("/settings/lists")({ component: ListsPage });

function ListsPage() {
  const { categories, toggleCategoryVisible, paymentMethods } = useAppStore();
  const [tab, setTab] = useState<string>("categories");
  const tabs = [
    { k: "categories", l: "Categories" },
    { k: "tax-rates", l: "Tax rates" },
    { k: "payment-methods", l: "Payment methods" },
    { k: "flags", l: "Flags" },
  ];

  const taxRates = [
    { name: "GST", rate: "5%" },
    { name: "HST", rate: "13%" },
    { name: "PST", rate: "7%" },
    { name: "Zero Rated", rate: "0%" },
  ];

  const flags = [
    { color: "bg-orange-500", name: "Orange" },
    { color: "bg-yellow-500", name: "Yellow" },
    { color: "bg-green-500", name: "Green" },
    { color: "bg-blue-500", name: "Blue" },
    { color: "bg-purple-500", name: "Purple" },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold mb-6">Lists</h2>
      <div className="flex gap-1 mb-4">
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`px-3 py-1.5 text-sm rounded-md ${tab === t.k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{t.l}</button>
        ))}
      </div>

      {tab === "categories" && (
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex justify-between items-center">
            <span className="text-sm font-medium">{categories.length} categories</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => toast.success("Category added")}><Plus className="w-4 h-4 mr-1" />Add</Button>
              <Button variant="outline" size="sm" onClick={() => downloadCSV("categories.csv", categories)}><Download className="w-4 h-4 mr-1" />Export</Button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground sticky top-0">
                <tr><th className="text-left px-4 py-2">Name</th><th className="text-left px-4 py-2">Code</th><th className="text-center px-4 py-2">Visible</th></tr>
              </thead>
              <tbody>
                {categories.map(c => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">{c.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{c.code}</td>
                    <td className="px-4 py-2 text-center"><Switch checked={c.visible} onCheckedChange={() => toggleCategoryVisible(c.id)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "tax-rates" && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
              <tr><th className="text-left px-4 py-2">Name</th><th className="text-left px-4 py-2">Rate</th></tr>
            </thead>
            <tbody>
              {taxRates.map(t => <tr key={t.name} className="border-b border-border last:border-0"><td className="px-4 py-2">{t.name}</td><td className="px-4 py-2">{t.rate}</td></tr>)}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "payment-methods" && (
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex justify-between items-center">
            <span className="text-sm font-medium">{paymentMethods.length} methods</span>
            <Button variant="outline" size="sm" onClick={() => toast.success("Method added")}><Plus className="w-4 h-4 mr-1" />Add</Button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground sticky top-0">
                <tr><th className="text-left px-4 py-2">Name</th><th className="text-left px-4 py-2">Reference</th></tr>
              </thead>
              <tbody>
                {paymentMethods.map(p => <tr key={p.id} className="border-b border-border last:border-0"><td className="px-4 py-2">{p.name}</td><td className="px-4 py-2 text-muted-foreground">{p.reference}</td></tr>)}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "flags" && (
        <Card className="p-5 space-y-3">
          {flags.map(f => (
            <div key={f.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3"><div className={`w-4 h-4 rounded-full ${f.color}`} /><span className="text-sm">{f.name}</span></div>
              <Switch defaultChecked />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
