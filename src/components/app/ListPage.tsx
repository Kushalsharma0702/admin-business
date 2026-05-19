import { ReactNode } from "react";
import { AppShell } from "./AppShell";
import { PageHeader } from "./PageHeader";

export function ListPage({ title, subtitle, actions, children }: { title: string; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <AppShell>
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      {children}
    </AppShell>
  );
}