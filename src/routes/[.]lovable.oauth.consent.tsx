import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth/auth-context";

// NOTE: Supabase's `auth.oauth` consent API (getAuthorizationDetails /
// approveAuthorization / denyAuthorization) has no Firebase equivalent.
// We keep the consent UI and degrade gracefully: once the user is signed
// in with Firebase, "Approve" completes the flow by redirecting back to
// the requesting app with the original query params (plus an `approved`
// flag); "Deny" redirects back with `approved=false`. There is no server
// authorization record to fetch, so we show a generic client name.

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // Browser-only: auth state lives in the client (Firebase), absent during SSR.
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
    redirect_uri: typeof s.redirect_uri === "string" ? s.redirect_uri : "",
  }),
  component: Consent,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)] flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md bg-white border border-[color:var(--brand-dark)]/5 p-8 md:p-10">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Consent() {
  const search = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = "an app";

  useEffect(() => {
    if (!loading && !user) {
      const next = `${window.location.pathname}${window.location.search}`;
      navigate({ to: "/auth", search: { next } });
    }
  }, [loading, user, navigate]);

  if (loading || !user) return null;

  function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const currentParams = new URLSearchParams(window.location.search);
    if (!search.redirect_uri) {
      setBusy(false);
      setError("No redirect target was provided with this authorization request.");
      return;
    }
    try {
      const target = new URL(search.redirect_uri);
      currentParams.forEach((value, key) => target.searchParams.set(key, value));
      target.searchParams.set("approved", String(approve));
      window.location.href = target.toString();
    } catch {
      setBusy(false);
      setError("The redirect target for this authorization request is invalid.");
    }
  }

  return (
    <Shell>
      <span className="text-[color:var(--brand-accent)] font-semibold tracking-[0.3em] uppercase text-xs">
        Authorize Access
      </span>
      <h1 className="text-3xl font-display mt-3 mb-4">Connect {clientName}</h1>
      <p className="text-sm text-[color:var(--brand-dark)]/70 mb-2">
        {clientName} is asking to use True Furniture's on your behalf. It will be able to browse the sofa
        catalogue and read your own orders and saved designs.
      </p>
      <p className="text-xs text-[color:var(--brand-dark)]/50 mb-8">
        It can only see what you can see. You can revoke access at any time.
      </p>
      {error && <p role="alert" className="text-xs text-red-600 mb-4">{error}</p>}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          disabled={busy}
          onClick={() => decide(true)}
          className="flex-1 px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors disabled:opacity-60"
        >
          {busy ? "Please wait…" : "Approve"}
        </button>
        <button
          disabled={busy}
          onClick={() => decide(false)}
          className="flex-1 px-6 py-4 border border-[color:var(--brand-dark)]/20 text-xs font-bold uppercase tracking-widest hover:border-[color:var(--brand-dark)] transition-colors disabled:opacity-60"
        >
          Deny
        </button>
      </div>
    </Shell>
  );
}
