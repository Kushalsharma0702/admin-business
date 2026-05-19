import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ListPage } from "@/components/app/ListPage";
import { useAppStore } from "@/store/useAppStore";
import { StatusBadge } from "@/components/app/StatusBadge";
import { ClientAvatar } from "@/components/app/ClientAvatar";
import { fmtDate, fmtMoney } from "@/components/app/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/billing")({ component: BillingPage });

function BillingPage() {
  const navigate = useNavigate();
  const { billing, clients } = useAppStore();
  const totalBilled = billing.reduce((a, b) => a + b.amount, 0);
  const totalPaid = billing.filter(b => b.status === "Paid").reduce((a, b) => a + b.amount, 0);

  return (
    <ListPage title="Billing" subtitle={`${billing.length} invoices`}
      actions={<Button size="sm" onClick={() => toast.success("Invoice draft created")}><Receipt className="w-4 h-4 mr-1" />Create invoice</Button>}>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total billed</div><div className="text-xl font-semibold">{fmtMoney(totalBilled)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total paid</div><div className="text-xl font-semibold text-emerald-600">{fmtMoney(totalPaid)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Outstanding</div><div className="text-xl font-semibold text-rose-600">{fmtMoney(totalBilled - totalPaid)}</div></Card>
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">Invoice #</th>
              <th className="text-left px-4 py-2.5 font-semibold">Client</th>
              <th className="text-left px-4 py-2.5 font-semibold">Date</th>
              <th className="text-left px-4 py-2.5 font-semibold">Description</th>
              <th className="text-right px-4 py-2.5 font-semibold">Amount</th>
              <th className="text-left px-4 py-2.5 pl-6 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {billing.map(b => {
              const client = clients.find(c => c.id === b.clientId);
              return (
                <tr key={b.id} onClick={() => client && navigate({ to: "/clients/$clientId/$tab", params: { clientId: client.id, tab: "billing" } })} className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer">
                  <td className="px-4 py-2.5 font-medium">{b.invoiceNumber}</td>
                  <td className="px-4 py-2.5">
                    {client && <span className="flex items-center gap-2"><ClientAvatar name={client.name} size={22} />{client.name}</span>}
                  </td>
                  <td className="px-4 py-2.5">{fmtDate(b.date)}</td>
                  <td className="px-4 py-2.5">{b.description}</td>
                  <td className="px-4 py-2.5 text-right">{fmtMoney(b.amount)}</td>
                  <td className="px-4 py-2.5 pl-6"><StatusBadge status={b.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ListPage>
  );
}
