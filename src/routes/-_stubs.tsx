// Generic stub utilities — used by simple routes to avoid 404s
import { ListPage } from "@/components/app/ListPage";
import { EmptyState } from "@/components/app/EmptyState";
import type { LucideIcon } from "lucide-react";

export function StubPage({ title, icon, description }: { title: string; icon: LucideIcon; description: string }) {
  return <ListPage title={title}><EmptyState icon={icon} title={title} description={description} /></ListPage>;
}