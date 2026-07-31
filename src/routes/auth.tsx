import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth/auth-context";
import { COL, fsSet } from "@/lib/db/firestore";
import { sendWelcomeEmail } from "@/lib/email.functions";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Avant-Garde Atelier" },
      { name: "description", content: "Sign in or create your Avant-Garde account to save designs, place reservations, and track your bespoke sofa order." },
      { property: "og:title", content: "Sign in — Avant-Garde Atelier" },
      { property: "og:description", content: "Access your account." },
    ],
  }),
  component: Auth,
});

// Only same-origin relative paths may be used as a post-login destination.
function safeNext(next?: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const { next } = Route.useSearch();
  const destination = safeNext(next);
  const goHome = () => {
    if (destination) window.location.href = destination;
    else navigate({ to: "/" });
  };
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      goHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setGoogleLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && user) {
      if (destination) window.location.href = destination;
      else navigate({ to: "/" });
    }
  }, [authLoading, user, navigate, destination]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "forgot") {
        await resetPassword(email).catch(() => undefined);
        setInfo("If an account exists for that email, a reset link is on its way. Check your inbox.");
        setLoading(false);
        return;
      }
      if (mode === "signup") {
        if (phone && !/^[6-9]\d{9}$/.test(phone)) {
          throw new Error("Enter a valid 10-digit Indian mobile number");
        }
        const newUser = await signUp(email, password, fullName);
        if (phone) {
          await fsSet(COL.profiles, newUser.uid, { phone: `+91${phone}` }).catch(() => undefined);
        }
        // Fire-and-forget welcome email
        sendWelcomeEmail({ data: { email, name: fullName } }).catch((e) =>
          console.error("welcome email failed", e),
        );
      } else {
        try {
          await signIn(email, password);
        } catch (err) {
          const code = (err as { code?: string })?.code ?? "";
          if (code.includes("invalid") || code.includes("wrong-password") || code.includes("user-not-found")) {
            throw new Error("Invalid email or password. If you just signed up, try again in a moment.");
          }
          throw err;
        }
      }
      goHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)] flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md bg-white border border-[color:var(--brand-dark)]/5 p-8 md:p-10">
          <span className="text-[color:var(--brand-accent)] font-semibold tracking-[0.3em] uppercase text-xs">
            {mode === "signin" ? "Welcome Back" : mode === "signup" ? "Create Account" : "Reset Password"}
          </span>
          <h1 className="text-3xl font-display mt-3 mb-8">
            {mode === "signin" ? "Sign in" : mode === "signup" ? "Join the Atelier" : "Forgot password"}
          </h1>

          {mode !== "forgot" && (
            <div className="mb-6">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 border border-[color:var(--brand-dark)]/20 text-xs font-bold uppercase tracking-widest hover:border-[color:var(--brand-accent)] hover:text-[color:var(--brand-accent)] transition-colors disabled:opacity-60"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
                  <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
                </svg>
                {googleLoading ? "Connecting…" : "Continue with Google"}
              </button>
              <div className="flex items-center gap-4 mt-6">
                <span className="h-px flex-1 bg-[color:var(--brand-dark)]/10" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/40">or</span>
                <span className="h-px flex-1 bg-[color:var(--brand-dark)]/10" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" && (
              <>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest block mb-2">Full Name</label>
                <input required value={fullName} onChange={(e) => setFullName(e.target.value)} type="text" className="w-full border-b border-[color:var(--brand-dark)]/20 pb-2 focus:outline-none focus:border-[color:var(--brand-accent)] bg-transparent" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest block mb-2">Mobile (optional)</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={10} type="tel" placeholder="10-digit" className="w-full border-b border-[color:var(--brand-dark)]/20 pb-2 focus:outline-none focus:border-[color:var(--brand-accent)] bg-transparent" />
              </div>
              </>
            )}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest block mb-2">Email</label>
              <input required value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full border-b border-[color:var(--brand-dark)]/20 pb-2 focus:outline-none focus:border-[color:var(--brand-accent)] bg-transparent" />
            </div>
            {mode !== "forgot" && <div>
              <label className="text-[10px] font-black uppercase tracking-widest block mb-2">Password</label>
              <div className="relative">
                <input
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  className="w-full border-b border-[color:var(--brand-dark)]/20 pb-2 pr-8 focus:outline-none focus:border-[color:var(--brand-accent)] bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-0 bottom-2 text-[color:var(--brand-dark)]/50 hover:text-[color:var(--brand-accent)] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {mode === "signin" && (
                <div className="text-right mt-2">
                  <button type="button" onClick={() => { setMode("forgot"); setError(null); setInfo(null); }} className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/60 hover:text-[color:var(--brand-accent)]">
                    Forgot password?
                  </button>
                </div>
              )}
            </div>}
            {error && <p className="text-xs text-red-600">{error}</p>}
            {info && <p className="text-xs text-green-700">{info}</p>}
            <button disabled={loading} type="submit" className="w-full mt-4 px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors disabled:opacity-60">
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create Account" : "Send Reset Link"}
            </button>
          </form>

          <p className="mt-6 text-xs text-center text-[color:var(--brand-dark)]/60">
            {mode === "forgot" ? (
              <>Remembered it?{" "}
                <button onClick={() => { setMode("signin"); setError(null); setInfo(null); }} className="font-bold uppercase tracking-widest text-[color:var(--brand-dark)] border-b border-[color:var(--brand-dark)]">Back to Sign in</button>
              </>
            ) : (
              <>{mode === "signin" ? "New here?" : "Already have an account?"}{" "}
                <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setInfo(null); }} className="font-bold uppercase tracking-widest text-[color:var(--brand-dark)] border-b border-[color:var(--brand-dark)]">
                  {mode === "signin" ? "Create Account" : "Sign in"}
                </button>
              </>
            )}
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
