import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("admin@taxease.ca");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Email and password are required"); return; }
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      if (res.data.user.role !== "admin") {
        toast.error("This portal is for admin users only.");
        setLoading(false);
        return;
      }
      login(res.data.token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Toaster position="top-right" richColors />
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Brand */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-4">
            <span className="text-primary-foreground font-bold text-lg">T</span>
          </div>
          <h1 className="text-2xl font-bold text-white">TaxEase Admin</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to your practice dashboard</p>
        </div>

        <Card className="p-6 bg-slate-800/60 border-slate-700 backdrop-blur">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-200">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@taxease.ca"
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-200">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Card>

        {/* Test credentials hint */}
        <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-3 text-xs text-slate-400 space-y-1">
          <div className="font-medium text-slate-300 mb-1.5">Test credentials</div>
          <div className="flex justify-between"><span>Admin:</span><span className="font-mono text-slate-300">admin@taxease.ca / admin123</span></div>
          <div className="text-slate-500 text-[11px] mt-1.5">Make sure the backend is running: <span className="font-mono text-slate-400">cd backend && node src/index.js</span></div>
        </div>
      </div>
    </div>
  );
}
