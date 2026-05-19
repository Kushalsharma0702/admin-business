import { createFileRoute } from "@tanstack/react-router";
import { ListPage } from "@/components/app/ListPage";
import { useAppStore } from "@/store/useAppStore";
import { DataTable } from "@/components/app/DataTable";
import { StatusBadge } from "@/components/app/StatusBadge";
import { fmtDate, fmtMoney } from "@/components/app/utils";

export const Route = createFileRoute("/sales/")({ component: () => {
  const sales = useAppStore((s) => s.sales);
  return <ListPage title="Sales"><DataTable selectable selected={[]} onSelectedChange={() => {}} data={sales} columns={[
    { key: "date", header: "Date", render: (r) => fmtDate(r.date) },
    { key: "customer", header: "Customer" },
    { key: "description", header: "Description" },
    { key: "total", header: "Total", align: "right", render: (r) => fmtMoney(r.total) },
    { key: "tax", header: "Tax", align: "right", render: (r) => fmtMoney(r.tax) },
    { key: "category", header: "Category" },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ]} /></ListPage>;
}});