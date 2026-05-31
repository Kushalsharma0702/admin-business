import { ReactNode, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { Toaster } from "@/components/ui/sonner";
import { useAuthStore } from "@/store/useAuthStore";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated()) return null;

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