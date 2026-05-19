import { createFileRoute } from "@tanstack/react-router";
import { ListPage } from "@/components/app/ListPage";
import { useAppStore } from "@/store/useAppStore";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { fmtMoney } from "@/components/app/utils";

export const Route = createFileRoute("/insights")({ component: InsightsPage });

const COLORS = ["#4F46E5", "#0EA5E9", "#16A34A", "#D97706", "#DC2626", "#7C3AED"];

function InsightsPage() {
  const { clients, tasks, costs, sales, billing, timeEntries } = useAppStore();

  const totalRevenue = billing.reduce((a, b) => a + b.amount, 0);
  const totalCosts = costs.reduce((a, b) => a + b.total, 0);
  const totalHours = timeEntries.reduce((a, b) => a + b.hours, 0);
  const avgRevenuePerClient = clients.length > 0 ? totalRevenue / clients.length : 0;

  const tasksByStatus = ["With Client", "In Progress", "Review", "Completed"].map(s => ({
    status: s,
    count: tasks.filter(t => t.status === s).length,
  }));

  const costsByCategory = Object.entries(
    costs.reduce<Record<string, number>>((acc, c) => { acc[c.category] = (acc[c.category] || 0) + c.total; return acc; }, {})
  ).map(([name, value]) => ({ name, value: Math.round(value) }));

  return (
    <ListPage title="Insights" subtitle="Practice analytics overview">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total Revenue</div><div className="text-xl font-semibold">{fmtMoney(totalRevenue)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total Costs</div><div className="text-xl font-semibold">{fmtMoney(totalCosts)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Avg Revenue/Client</div><div className="text-xl font-semibold">{fmtMoney(avgRevenuePerClient)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Hours Logged</div><div className="text-xl font-semibold">{totalHours.toFixed(1)} hrs</div></Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Tasks by Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tasksByStatus} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis dataKey="status" type="category" stroke="#94a3b8" fontSize={12} width={90} />
                <Tooltip />
                <Bar dataKey="count" fill="#4F46E5" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Costs by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={costsByCategory} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${fmtMoney(value)}`} labelLine={false} fontSize={11}>
                  {costsByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmtMoney(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </ListPage>
  );
}
