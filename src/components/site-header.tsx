import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-10 py-5 bg-[color:var(--brand-cream)]/85 backdrop-blur-md border-b border-[color:var(--brand-dark)]/5">
      <Link to="/" className="font-display text-2xl font-bold tracking-tight text-[color:var(--brand-dark)] hover:text-[color:var(--brand-accent)] transition-colors">
        True Furniture&apos;s
      </Link>
      <div className="hidden md:flex gap-10 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--brand-dark)]">
        <Link to="/collections" className="hover:text-[color:var(--brand-accent)] transition-colors">Collections</Link>
        <Link to="/about" className="hover:text-[color:var(--brand-accent)] transition-colors">The Atelier</Link>
        <Link to="/showrooms" className="hover:text-[color:var(--brand-accent)] transition-colors">Showrooms</Link>
        <Link to="/contact" className="hover:text-[color:var(--brand-accent)] transition-colors">Contact</Link>
      </div>
      <div className="flex items-center gap-3">
        {signedIn ? (
          <button
            onClick={async () => { await supabase.auth.signOut(); }}
            className="hidden sm:inline-block px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)] hover:text-[color:var(--brand-accent)] transition-colors"
          >
            Sign out
          </button>
        ) : (
          <Link to="/auth" className="hidden sm:inline-block px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)] hover:text-[color:var(--brand-accent)] transition-colors">
            Sign in
          </Link>
        )}
        <Link
          to="/collections"
          className="px-6 py-2.5 bg-[color:var(--brand-dark)] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors"
        >
          Design Yours
        </Link>
      </div>
    </nav>
  );
}