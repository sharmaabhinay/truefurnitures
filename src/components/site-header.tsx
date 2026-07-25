import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";

export function SiteHeader() {
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const { count } = useCart();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const nav = [
    { to: "/collections", label: "Collections" },
    { to: "/about", label: "The Atelier" },
    { to: "/showrooms", label: "Showrooms" },
    { to: "/blog", label: "Journal" },
    { to: "/contact", label: "Contact" },
  ] as const;

  return (
    <>
      <nav className="sticky top-0 z-50 flex items-center justify-between gap-4 px-4 sm:px-6 md:px-10 py-4 md:py-5 bg-[color:var(--brand-cream)]/85 backdrop-blur-md border-b border-[color:var(--brand-dark)]/5">
        <Link to="/" className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[color:var(--brand-dark)] hover:text-[color:var(--brand-accent)] transition-colors shrink-0">
          True Furniture&apos;s
        </Link>
        <div className="hidden lg:flex gap-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--brand-dark)]">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="hover:text-[color:var(--brand-accent)] transition-colors">{n.label}</Link>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/cart"
            aria-label="Cart"
            className="relative p-2 text-[color:var(--brand-dark)] hover:text-[color:var(--brand-accent)] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 4h2l2.2 11.3a2 2 0 0 0 2 1.7h8.2a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg>
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[color:var(--brand-accent)] text-white text-[10px] font-bold flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>
          {signedIn ? (
            <>
              <Link to="/dashboard" className="hidden sm:inline-block px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)] hover:text-[color:var(--brand-accent)] transition-colors">
                My Orders
              </Link>
              <button
                onClick={async () => { await supabase.auth.signOut(); }}
                className="hidden sm:inline-block px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/60 hover:text-[color:var(--brand-accent)] transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link to="/auth" className="hidden sm:inline-block px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)] hover:text-[color:var(--brand-accent)] transition-colors">
              Sign in
            </Link>
          )}
          <Link
            to="/collections"
            className="hidden sm:inline-block px-4 sm:px-6 py-2.5 bg-[color:var(--brand-dark)] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors whitespace-nowrap"
          >
            Design Yours
          </Link>
          <button
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="lg:hidden p-2 -mr-2 text-[color:var(--brand-dark)]"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
        </div>
      </nav>
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-[color:var(--brand-dark)]/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[86%] max-w-sm bg-[color:var(--brand-cream)] p-6 flex flex-col animate-slide-in">
            <div className="flex items-center justify-between mb-8">
              <span className="font-display text-xl">True Furniture&apos;s</span>
              <button aria-label="Close menu" onClick={() => setOpen(false)} className="p-2 -mr-2">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 6l12 12M18 6L6 18"/></svg>
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {nav.map((n) => (
                <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="py-3 border-b border-[color:var(--brand-dark)]/10 text-sm font-semibold uppercase tracking-widest">
                  {n.label}
                </Link>
              ))}
              {signedIn ? (
                <>
                  <Link to="/dashboard" onClick={() => setOpen(false)} className="py-3 border-b border-[color:var(--brand-dark)]/10 text-sm font-semibold uppercase tracking-widest">My Orders</Link>
                  <button onClick={async () => { await supabase.auth.signOut(); setOpen(false); }} className="py-3 border-b border-[color:var(--brand-dark)]/10 text-left text-sm font-semibold uppercase tracking-widest text-[color:var(--brand-dark)]/60">Sign out</button>
                </>
              ) : (
                <Link to="/auth" onClick={() => setOpen(false)} className="py-3 border-b border-[color:var(--brand-dark)]/10 text-sm font-semibold uppercase tracking-widest">Sign in</Link>
              )}
            </div>
            <Link to="/collections" onClick={() => setOpen(false)} className="mt-auto text-center px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest">
              Design Yours
            </Link>
          </div>
        </div>
      )}
    </>
  );
}