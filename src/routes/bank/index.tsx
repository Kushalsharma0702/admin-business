import { createFileRoute } from "@tanstack/react-router";
import { ListPage } from "@/components/app/ListPage";
import { useAppStore } from "@/store/useAppStore";
import { DataTable } from "@/components/app/DataTable";
import { fmtDate, fmtMoney, downloadCSV } from "@/components/app/utils";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/bank/")({ component: () => {
  const { transactions, toggleTransactionMatch } = useAppStore();
  return <ListPage title="Bank" actions={<>
    <Button variant="outline" size="sm" onClick={() => downloadCSV("transactions.csv", transactions)}><Download className="w-4 h-4 mr-1" />Export all</Button>
    <Button size="sm" onClick={() => toast.success("Paperwork requested")}>Request paperwork</Button>
  </>}>
    <DataTable selectable selected={[]} onSelectedChange={() => {}} data={transactions} columns={[
      { key: "date", header: "Date", render: (r) => fmtDate(r.date) },
      { key: "description", header: "Description", render: (r) => <span className="font-medium">{r.description}</span> },
      { key: "paidOut", header: "Paid out", align: "right", render: (r) => r.paidOut > 0 ? fmtMoney(r.paidOut) : "—" },
      { key: "paidIn", header: "Paid in", align: "right", render: (r) => r.paidIn > 0 ? <span className="text-emerald-600">{fmtMoney(r.paidIn)}</span> : "—" },
      { key: "match", header: "Match", render: (r) => <button onClick={() => toggleTransactionMatch(r.id)} className={`text-xs px-2 py-0.5 rounded ${r.matched ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{r.matched ? "Matched" : "Unmatched"}</button> },
      { key: "account", header: "Account" },
    ]} />
  </ListPage>;
}});