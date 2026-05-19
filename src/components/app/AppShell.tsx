import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { Toaster } from "@/components/ui/sonner";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-[60px]">
        <TopBar />
        <main className="p-6">{children}</main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}