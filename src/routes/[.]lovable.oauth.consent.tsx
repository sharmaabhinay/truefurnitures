import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};

type AuthorizationDetails = {
  client?: { name?: string | null } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // Browser-only: the Supabase session lives in localStorage, absent during SSR.
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <Shell>
      <h1 className="text-2xl font-display mb-3">Authorization request unavailable</h1>
      <p className="text-sm text-[color:var(--brand-dark)]/60">
        {String((error as Error)?.message ?? error)}
      </p>
      <p className="text-sm text-[color:var(--brand-dark)]/60 mt-3">
        This request may have expired. Start the connection again from the app you were using.
      </p>
    </Shell>
  ),
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
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const api = oauthApi();
    const { data, error } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
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