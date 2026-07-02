import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Loader2, CheckCircle2, AlertCircle, KeyRound, Smartphone } from "lucide-react";
import { API_BASE } from "@/lib/api";

export const Route = createFileRoute("/invite/$token")({ component: InvitePage });

type InviteState = "loading" | "valid" | "used" | "expired" | "invalid" | "success";

// Actual Android package name from android/app/build.gradle.kts: applicationId = "com.aurocode.tax_ease"
const PACKAGE_NAME = "com.aurocode.tax_ease";
const APP_STORE_URL = `https://play.google.com/store/apps/details?id=${PACKAGE_NAME}`;
// Android Intent URL — correct package name, falls back to Play Store if app not installed
const INTENT_URL = `intent://tax-forms/business#Intent;scheme=diamondaccounts;package=${PACKAGE_NAME};S.browser_fallback_url=${encodeURIComponent(APP_STORE_URL)};end`;

function SuccessCard({ clientEmail, clientName }: { clientEmail: string; clientName: string }) {
  // Android Chrome BLOCKS window.location.href deep links from JS (security policy).
  // The ONLY way to reliably open an app from a browser is a direct user tap on an <a> tag.
  // We show a pulsing button and instructions instead of an auto-redirect.
  const handleOpenApp = () => {
    // intent:// URL — Android handles this natively:
    //   • If app is installed → opens it at diamondaccounts://tax-forms/business
    //   • If not installed   → opens Play Store via S.browser_fallback_url
    window.location.href = INTENT_URL;
  };

  return (
    <Card className="p-8 bg-slate-800/60 border-slate-700 text-center space-y-5">
      {/* Header */}
      <div className="space-y-2">
        <CheckCircle2 className="h-14 w-14 mx-auto text-emerald-400" />
        <h2 className="text-xl font-bold text-white">Account activated!</h2>
        <p className="text-slate-400 text-sm">Welcome aboard, {clientName || clientEmail}</p>
      </div>

      {/* Credentials summary */}
      <div className="bg-slate-700/40 rounded-xl p-4 text-left space-y-1.5 border border-slate-600/50">
        <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-2">Login details</p>
        <p className="text-sm text-white break-all"><span className="text-slate-400">Email: </span>{clientEmail}</p>
        <p className="text-sm"><span className="text-slate-400">Password: </span><span className="text-white">the one you just set</span></p>
        <div className="flex items-center gap-1.5 pt-1">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-emerald-400 text-sm font-medium">Business Tax (T2) — auto-selected</span>
        </div>
      </div>

      {/* Primary CTA — MUST be a user tap, not auto-redirect */}
      <div className="space-y-3">
        <p className="text-slate-300 text-sm font-medium">Tap the button below to open the app:</p>
        <button
          onClick={handleOpenApp}
          className="flex items-center justify-center gap-2.5 w-full px-4 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-base hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/30 animate-pulse"
        >
          <Smartphone className="h-5 w-5" />
          Open Diamond Accounts App
        </button>
        <p className="text-slate-500 text-xs">
          The app will open on the Business Tax (T2) form.{" "}
          <a href={APP_STORE_URL} className="text-primary underline">
            Don't have the app? Download it here.
          </a>
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-slate-900/40 rounded-lg p-3 text-left border border-slate-700/50">
        <p className="text-xs text-slate-400 font-semibold mb-2 uppercase tracking-wide">Once in the app</p>
        <ol className="space-y-1.5 text-xs text-slate-300">
          <li className="flex gap-2"><span className="text-primary font-bold">1.</span>Log in with your email and password</li>
          <li className="flex gap-2"><span className="text-primary font-bold">2.</span>The T2 Business Tax form opens automatically</li>
          <li className="flex gap-2"><span className="text-primary font-bold">3.</span>Fill in your business details</li>
        </ol>
      </div>
    </Card>
  );
}

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();

  const [inviteState, setInviteState] = useState<InviteState>("loading");
  const [clientEmail, setClientEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/invite-info/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setClientEmail(data.data.email);
          setClientName(data.data.name);
          setInviteState("valid");
        } else if (data.message?.includes("already been used")) {
          setInviteState("used");
        } else if (data.message?.includes("expired")) {
          setInviteState("expired");
        } else {
          setInviteState("invalid");
        }
      })
      .catch(() => setInviteState("invalid"));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/accept-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to set password");
      setInviteState("success");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Toaster position="top-right" richColors />
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-4">
            <span className="text-primary-foreground font-bold text-lg">T</span>
          </div>
          <h1 className="text-2xl font-bold text-white">TaxEase</h1>
          <p className="text-slate-400 text-sm mt-1">Client Portal</p>
        </div>

        {/* Loading */}
        {inviteState === "loading" && (
          <Card className="p-8 bg-slate-800/60 border-slate-700 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
            <p className="text-slate-300 text-sm">Validating your invite…</p>
          </Card>
        )}

        {/* Already used — show Open App button, NOT web login */}
        {inviteState === "used" && (
          <Card className="p-8 bg-slate-800/60 border-slate-700 text-center space-y-5">
            <div className="space-y-2">
              <CheckCircle2 className="h-14 w-14 mx-auto text-emerald-400" />
              <h2 className="text-xl font-bold text-white">Account already activated</h2>
              <p className="text-slate-400 text-sm">Your account is set up. Open the Diamond Accounts app and log in with your email and password.</p>
            </div>
            <div className="space-y-3">
              <p className="text-slate-300 text-sm font-medium">Tap below to open the app:</p>
              <button
                onClick={() => { window.location.href = INTENT_URL; }}
                className="flex items-center justify-center gap-2.5 w-full px-4 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-base hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/30 animate-pulse"
              >
                <Smartphone className="h-5 w-5" />
                Open Diamond Accounts App
              </button>
              <p className="text-slate-500 text-xs">
                <a href={APP_STORE_URL} className="text-primary underline">Don't have the app? Download it here.</a>
              </p>
            </div>
          </Card>
        )}

        {/* Expired */}
        {inviteState === "expired" && (
          <Card className="p-8 bg-slate-800/60 border-slate-700 text-center space-y-3">
            <AlertCircle className="h-10 w-10 mx-auto text-rose-400" />
            <h2 className="text-lg font-semibold text-white">Invite expired</h2>
            <p className="text-slate-400 text-sm">This invite link has expired. Please contact your accountant to resend a new invitation.</p>
          </Card>
        )}

        {/* Invalid */}
        {inviteState === "invalid" && (
          <Card className="p-8 bg-slate-800/60 border-slate-700 text-center space-y-3">
            <AlertCircle className="h-10 w-10 mx-auto text-rose-400" />
            <h2 className="text-lg font-semibold text-white">Invalid invite</h2>
            <p className="text-slate-400 text-sm">This invite link is not valid. Please check your email or contact your accountant.</p>
          </Card>
        )}

        {/* Success — auto-redirect to T2 form via deep link */}
        {inviteState === "success" && (
          <SuccessCard
            clientEmail={clientEmail}
            clientName={clientName}
          />
        )}

        {/* Valid — show set password form */}
        {inviteState === "valid" && (
          <Card className="p-6 bg-slate-800/60 border-slate-700 backdrop-blur">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-700">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                <KeyRound className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Welcome, {clientName}</p>
                <p className="text-xs text-slate-400">{clientEmail}</p>
              </div>
            </div>

            <p className="text-slate-300 text-sm mb-4">
              Set a secure password to activate your account and access your tax documents.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-200">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-200">Confirm password</label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                  required
                />
              </div>

              {/* Password strength hint */}
              {password && (
                <div className="flex gap-1">
                  {[8, 12, 16].map((len) => (
                    <div
                      key={len}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= len ? "bg-primary" : "bg-slate-700"
                      }`}
                    />
                  ))}
                  <span className="text-[10px] text-slate-400 ml-1">
                    {password.length < 8 ? "Too short" : password.length < 12 ? "OK" : "Strong"}
                  </span>
                </div>
              )}

              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Setting password…</> : "Activate account"}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
