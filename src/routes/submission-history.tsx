import { createFileRoute } from "@tanstack/react-router";
import { ListPage } from "@/components/app/ListPage";
import { useAppStore } from "@/store/useAppStore";
import { StatusBadge } from "@/components/app/StatusBadge";
import { fmtDate, downloadCSV } from "@/components/app/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/submission-history")({ component: SubmissionHistoryPage });

function SubmissionHistoryPage() {
  const { submissions } = useAppStore();
  const [tab, setTab] = useState<"costs" | "statements" | "vault">("costs");
  const [q, setQ] = useState("");
  const filtered = submissions.filter(s => s.itemId.toLowerCase().includes(q.toLowerCase()) || s.submittedBy.toLowerCase().includes(q.toLowerCase()));

  return (
    <ListPage title="Submission History" subtitle={`${submissions.length} records`}
      actions={<Button variant="outline" size="sm" onClick={() => downloadCSV("submissions.csv", submissions)}><Download className="w-4 h-4 mr-1" />Export history</Button>}>
      <div className="flex gap-1 mb-3">
        {([["costs", "Costs and sales"], ["statements", "Supplier statements"], ["vault", "Vault"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 text-sm rounded-md ${tab === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{l}</button>
        ))}
      </div>
      <Input placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} className="max-w-sm mb-4" />
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">Status</th>
              <th className="text-left px-4 py-2.5 font-semibold">Item ID</th>
              <th className="text-left px-4 py-2.5 font-semibold">Submitted at</th>
              <th className="text-left px-4 py-2.5 font-semibold">Submitted by</th>
              <th className="text-left px-4 py-2.5 font-semibold">Method</th>
              <th className="text-left px-4 py-2.5 font-semibold">Owned by</th>
              <th className="text-left px-4 py-2.5 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="px-4 py-2.5"><StatusBadge status={s.status} /></td>
                <td className="px-4 py-2.5 font-medium">{s.itemId}</td>
                <td className="px-4 py-2.5">{s.submittedAt}</td>
                <td className="px-4 py-2.5">{s.submittedBy}</td>
                <td className="px-4 py-2.5">{s.method}</td>
                <td className="px-4 py-2.5">{s.ownedBy}</td>
                <td className="px-4 py-2.5">{fmtDate(s.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ListPage>
  );
}
