import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { sendWelcomeEmail } from "@/lib/email.functions";

export const Route = createFileRoute("/auth")({
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

function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setInfo("If an account exists for that email, a reset link is on its way. Check your inbox.");
        setLoading(false);
        return;
      }
      if (mode === "signup") {
        if (phone && !/^[6-9]\d{9}$/.test(phone)) {
          throw new Error("Enter a valid 10-digit Indian mobile number");
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, phone: phone || null },
          },
        });
        if (error) throw error;
        // Fire-and-forget welcome email
        sendWelcomeEmail({ data: { email, name: fullName } }).catch((e) =>
          console.error("welcome email failed", e),
        );
        if (!data.session) {
          setInfo("Account created. Please sign in.");
          setMode("signin");
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.toLowerCase().includes("invalid")) {
            throw new Error("Invalid email or password. If you just signed up, try again in a moment.");
          }
          throw error;
        }
      }
      navigate({ to: "/" });
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