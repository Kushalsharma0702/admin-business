import { createFileRoute } from "@tanstack/react-router";
import { ListPage } from "@/components/app/ListPage";
import { useAppStore } from "@/store/useAppStore";
import { ClientAvatar } from "@/components/app/ClientAvatar";
import { fmtDate, fmtMoney } from "@/components/app/utils";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/time")({ component: TimePage });

function TimePage() {
  const { timeEntries, clients } = useAppStore();
  const total = timeEntries.reduce((a, b) => a + b.hours, 0);
  const totalAmount = timeEntries.reduce((a, b) => a + b.hours * b.rate, 0);

  return (
    <ListPage title="Time" subtitle={`${total.toFixed(1)} hours logged · ${fmtMoney(totalAmount)}`}
      actions={<Button size="sm" onClick={() => toast.success("Time logged")}><Clock className="w-4 h-4 mr-1" />Log time</Button>}>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">Date</th>
              <th className="text-left px-4 py-2.5 font-semibold">Client</th>
              <th className="text-left px-4 py-2.5 font-semibold">Description</th>
              <th className="text-right px-4 py-2.5 font-semibold">Hours</th>
              <th className="text-right px-4 py-2.5 font-semibold">Rate</th>
              <th className="text-right px-4 py-2.5 font-semibold">Amount</th>
              <th className="text-left px-4 py-2.5 pl-6 font-semibold">Logged by</th>
            </tr>
          </thead>
          <tbody>
            {timeEntries.map(t => {
              const client = clients.find(c => c.id === t.clientId);
              return (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-2.5">{fmtDate(t.date)}</td>
                  <td className="px-4 py-2.5">
                    {client && <span className="flex items-center gap-2"><ClientAvatar name={client.name} size={22} />{client.name}</span>}
                  </td>
                  <td className="px-4 py-2.5">{t.description}</td>
                  <td className="px-4 py-2.5 text-right">{t.hours}</td>
                  <td className="px-4 py-2.5 text-right">{fmtMoney(t.rate)}</td>
                  <td className="px-4 py-2.5 text-right font-medium">{fmtMoney(t.hours * t.rate)}</td>
                  <td className="px-4 py-2.5 pl-6">{t.loggedBy}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ListPage>
  );
}
