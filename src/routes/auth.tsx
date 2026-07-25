import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      setError(result.error.message ?? "Google sign-in failed");
    }
  }

  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)] flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md bg-white border border-[color:var(--brand-dark)]/5 p-8 md:p-10">
          <span className="text-[color:var(--brand-accent)] font-semibold tracking-[0.3em] uppercase text-xs">
            {mode === "signin" ? "Welcome Back" : "Create Account"}
          </span>
          <h1 className="text-3xl font-display mt-3 mb-8">
            {mode === "signin" ? "Sign in" : "Join the Atelier"}
          </h1>

          <button
            type="button"
            onClick={handleGoogle}
            className="w-full py-3 border border-[color:var(--brand-dark)]/15 text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-dark)] hover:text-white transition-colors"
          >
            Continue with Google
          </button>

          <div className="flex items-center gap-4 my-6 text-[10px] uppercase tracking-widest text-[color:var(--brand-dark)]/40">
            <div className="flex-1 h-px bg-[color:var(--brand-dark)]/10" />
            or
            <div className="flex-1 h-px bg-[color:var(--brand-dark)]/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" && (
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest block mb-2">Full Name</label>
                <input required value={fullName} onChange={(e) => setFullName(e.target.value)} type="text" className="w-full border-b border-[color:var(--brand-dark)]/20 pb-2 focus:outline-none focus:border-[color:var(--brand-accent)] bg-transparent" />
              </div>
            )}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest block mb-2">Email</label>
              <input required value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full border-b border-[color:var(--brand-dark)]/20 pb-2 focus:outline-none focus:border-[color:var(--brand-accent)] bg-transparent" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest block mb-2">Password</label>
              <input required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full border-b border-[color:var(--brand-dark)]/20 pb-2 focus:outline-none focus:border-[color:var(--brand-accent)] bg-transparent" />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button disabled={loading} type="submit" className="w-full mt-4 px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors disabled:opacity-60">
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-xs text-center text-[color:var(--brand-dark)]/60">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="font-bold uppercase tracking-widest text-[color:var(--brand-dark)] border-b border-[color:var(--brand-dark)]">
              {mode === "signin" ? "Create Account" : "Sign in"}
            </button>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}