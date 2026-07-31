import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getFirebaseAuth } from "@/lib/firebase";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    oobCode: typeof s.oobCode === "string" ? s.oobCode : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Reset Password — True Furniture's" },
      { name: "description", content: "Set a new password for your True Furniture's account." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Reset Password — True Furniture's" },
      { property: "og:description", content: "Set a new password for your account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const { oobCode } = Route.useSearch();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setInvalid(true);
      return;
    }
    verifyPasswordResetCode(getFirebaseAuth(), oobCode)
      .then(() => setReady(true))
      .catch(() => setInvalid(true));
  }, [oobCode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    if (!oobCode) return setError("Invalid or expired reset link.");
    setLoading(true);
    try {
      await confirmPasswordReset(getFirebaseAuth(), oobCode, password);
      setInfo("Password updated. Redirecting…");
      setTimeout(() => navigate({ to: "/auth" }), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)] flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md bg-white border border-[color:var(--brand-dark)]/5 p-8 md:p-10">
          <span className="text-[color:var(--brand-accent)] font-semibold tracking-[0.3em] uppercase text-xs">Secure</span>
          <h1 className="text-3xl font-display mt-3 mb-2">Set a new password</h1>
          <p className="text-sm text-[color:var(--brand-dark)]/60 mb-8">Choose a strong password you don't use elsewhere.</p>
          {invalid ? (
            <p className="text-sm text-red-600">This reset link is invalid or has expired. Please request a new one.</p>
          ) : !ready ? (
            <p className="text-sm text-[color:var(--brand-dark)]/70">Verifying your reset link…</p>
          ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest block mb-2">New Password</label>
              <div className="relative">
                <input required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} type={show ? "text" : "password"} className="w-full border-b border-[color:var(--brand-dark)]/20 pb-2 pr-8 focus:outline-none focus:border-[color:var(--brand-accent)] bg-transparent" />
                <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-0 bottom-2 text-[color:var(--brand-dark)]/50 hover:text-[color:var(--brand-accent)]">
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest block mb-2">Confirm Password</label>
              <input required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} type={show ? "text" : "password"} className="w-full border-b border-[color:var(--brand-dark)]/20 pb-2 focus:outline-none focus:border-[color:var(--brand-accent)] bg-transparent" />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            {info && <p className="text-xs text-green-700">{info}</p>}
            <button disabled={loading} type="submit" className="w-full mt-2 px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors disabled:opacity-60">
              {loading ? "Updating…" : "Update Password"}
            </button>
          </form>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
