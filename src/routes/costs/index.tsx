import { createFileRoute } from "@tanstack/react-router";
import { ListPage } from "@/components/app/ListPage";
import { useAppStore } from "@/store/useAppStore";
import { DataTable } from "@/components/app/DataTable";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtDate, fmtMoney, downloadCSV } from "@/components/app/utils";
import { Plus, Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/costs/")({ component: CostsPage });

function CostsPage() {
  const { costs, deleteCosts, clients } = useAppStore();
  const [tab, setTab] = useState<"Processing" | "To review" | "Ready" | "All">("All");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const filtered = costs.filter((c) => (tab === "All" || c.status === tab) && (c.supplier.toLowerCase().includes(q.toLowerCase()) || c.description.toLowerCase().includes(q.toLowerCase())));

  return (
    <ListPage title="Costs" actions={
      <>
        {sel.length > 0 && <Button variant="outline" size="sm" onClick={() => { deleteCosts(sel); setSel([]); toast.success(`${sel.length} deleted`); }}><Trash2 className="w-4 h-4 mr-1" />Delete ({sel.length})</Button>}
        <Button variant="outline" size="sm" onClick={() => downloadCSV("costs.csv", filtered)}><Download className="w-4 h-4 mr-1" />Export</Button>
        <Button size="sm" className="bg-[#FF5800] hover:bg-[#FF5800]/90" onClick={() => toast.success("Add documents flow")}><Plus className="w-4 h-4 mr-1" />Add documents</Button>
      </>
    }>
      <div className="flex gap-1 mb-3">{(["All","Processing","To review","Ready"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-sm rounded-md ${tab===t?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground"}`}>{t}</button>)}</div>
      <Input placeholder="Search costs…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm mb-4" />
      <DataTable selectable selected={sel} onSelectedChange={setSel} data={filtered} columns={[
        { key: "date", header: "Date", render: (r) => fmtDate(r.date) },
        { key: "supplier", header: "Supplier", render: (r) => <span className="font-medium">{r.supplier}</span>, sortable: true },
        { key: "description", header: "Description" },
        { key: "total", header: "Total", align: "right", render: (r) => fmtMoney(r.total) },
        { key: "tax", header: "Tax", align: "right", render: (r) => fmtMoney(r.tax) },
        { key: "category", header: "Category" },
        { key: "paymentMethod", header: "Payment" },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
        { key: "client", header: "Client", render: (r) => clients.find((c) => c.id === r.clientId)?.name ?? "—" },
      ]} />
    </ListPage>
  );
}