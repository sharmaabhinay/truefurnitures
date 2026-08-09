import { useBrand } from "@/lib/brand";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/auth-context";
import { COL, fsList, sortRows, where } from "@/lib/db/firestore";
import { useCart } from "@/lib/cart";

type SearchItem = {
  slug: string;
  name: string;
  tagline: string | null;
  keywords: string[];
};

const searchQuery = queryOptions({
  queryKey: ["search-sofas"],
  queryFn: async (): Promise<SearchItem[]> => {
    const data = await fsList<{ slug: string; name: string; tagline: string | null }>(
      COL.sofas,
      where("is_published", "==", true),
    ).then((r) => sortRows(r, "sort_order")).catch(() => []);
    return (data ?? []).map((s) => ({
      slug: s.slug,
      name: s.name,
      tagline: s.tagline,
      keywords: [
        s.name,
        s.tagline ?? "",
        s.slug.replace(/-/g, " "),
        "sofa",
        "customizable",
        "3d design",
      ].map((k) => k.toLowerCase()),
    }));
  },
});

const STATIC_SUGGESTIONS = [
  { label: "Design in 3D", to: "/design" },
  { label: "L-Sectional Sofa", to: "/design" },
  { label: "Velvet Sofa", to: "/collections" },
  { label: "Leather Sofa", to: "/collections" },
  { label: "Bouclé Fabric", to: "/collections" },
  { label: "Visit Indore Showroom", to: "/showrooms" },
  { label: "Visit Ujjain Studio", to: "/showrooms" },
  { label: "WhatsApp / Contact", to: "/contact" },
] as const;

export function SiteHeader() {
  const brand = useBrand();
  const { user, isStaff, signOut } = useAuth();
  const signedIn = !!user;
  const isAdmin = isStaff;
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { count } = useCart();
  const { data: searchItems } = useQuery(searchQuery);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Minimal top nav — only the essentials are shown on desktop.
  const primaryNav = [
    { to: "/collections", label: "Collections" },
    { to: "/design", label: "Design 3D" },
    { to: "/hire-carpenter", label: "Hire a Carpenter" },
    { to: "/showrooms", label: "Showrooms" },
    { to: "/contact", label: "Contact" },
  ] as const;
  // Everything else lives in the mobile drawer + footer.
  const secondaryNav = [
    { to: "/about", label: "The Atelier" },
    { to: "/gallery", label: "Gallery" },
    { to: "/book-visit", label: "Book Visit" },
    { to: "/blog", label: "Journal" },
    { to: "/faq", label: "FAQ" },
    { to: "/careers", label: "Careers" },
  ] as const;
  const drawerNav = [...primaryNav, ...secondaryNav];

  const suggestions = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const productMatches = (searchItems ?? [])
      .filter((s) => s.keywords.some((k) => k.includes(query)))
      .slice(0, 5)
      .map((s) => ({ label: s.name, sub: s.tagline ?? "Sofa", to: `/products/${s.slug}` }));
    const staticMatches = STATIC_SUGGESTIONS
      .filter((s) => s.label.toLowerCase().includes(query))
      .slice(0, 4)
      .map((s) => ({ label: s.label, sub: "Suggestion", to: s.to }));
    return [...productMatches, ...staticMatches];
  }, [q, searchItems]);

  const runSearch = () => {
    if (suggestions[0]) {
      navigate({ to: suggestions[0].to as string });
      setSearchOpen(false);
      setQ("");
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 flex items-center justify-between gap-3 px-4 sm:px-6 md:px-10 py-4 md:py-5 bg-[color:var(--brand-cream)]/85 backdrop-blur-md border-b border-[color:var(--brand-dark)]/5">
        <Link to="/" className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[color:var(--brand-dark)] hover:text-[color:var(--brand-accent)] transition-colors shrink-0">
          {brand.brand_name}
        </Link>
        <div className="hidden lg:flex gap-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--brand-dark)]">
          {primaryNav.map((n) => (
            <Link key={n.to} to={n.to} className="hover:text-[color:var(--brand-accent)] transition-colors">{n.label}</Link>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div ref={searchRef} className="relative hidden md:block">
            <div className="flex items-center border border-[color:var(--brand-dark)]/15 bg-white/70 focus-within:border-[color:var(--brand-dark)] transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="ml-2.5 text-[color:var(--brand-dark)]/50 shrink-0"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
              <input
                type="text"
                value={q}
                onChange={(e) => { setQ(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(e) => { if (e.key === "Enter") runSearch(); if (e.key === "Escape") setSearchOpen(false); }}
                placeholder="Search sofas, fabrics…"
                className="w-40 lg:w-56 px-2 py-2 text-xs bg-transparent focus:outline-none placeholder:text-[color:var(--brand-dark)]/40"
              />
            </div>
            {searchOpen && (q || true) && (
              <div className="absolute top-full right-0 mt-2 w-72 sm:w-80 bg-white border border-[color:var(--brand-dark)]/10 shadow-xl z-50 animate-fade-up">
                {q.trim() === "" ? (
                  <div className="p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[color:var(--brand-dark)]/40 mb-2">Try</p>
                    <div className="flex flex-wrap gap-1.5">
                      {STATIC_SUGGESTIONS.slice(0, 6).map((s) => (
                        <button
                          key={s.label}
                          onClick={() => { navigate({ to: s.to }); setSearchOpen(false); }}
                          className="px-2.5 py-1 text-[10px] uppercase tracking-widest border border-[color:var(--brand-dark)]/15 hover:border-[color:var(--brand-dark)] transition-colors"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="p-4 text-xs text-[color:var(--brand-dark)]/50">No matches. Try &ldquo;velvet&rdquo;, &ldquo;leather&rdquo;, or &ldquo;sectional&rdquo;.</div>
                ) : (
                  <ul className="max-h-80 overflow-y-auto">
                    {suggestions.map((s, i) => (
                      <li key={`${s.label}-${i}`}>
                        <button
                          onClick={() => { navigate({ to: s.to as string }); setSearchOpen(false); setQ(""); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-[color:var(--brand-muted)]/50 flex justify-between items-center gap-3 border-b border-[color:var(--brand-dark)]/5 last:border-b-0"
                        >
                          <span className="text-sm truncate">{s.label}</span>
                          <span className="text-[9px] uppercase tracking-widest text-[color:var(--brand-dark)]/40 shrink-0">{s.sub}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
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
              {isAdmin && (
                <Link to="/admin" className="hidden sm:inline-block px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-accent)] hover:text-[color:var(--brand-dark)] transition-colors">
                  Admin
                </Link>
              )}
              {!isAdmin && (
                <Link to="/dashboard" className="hidden sm:inline-block px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)] hover:text-[color:var(--brand-accent)] transition-colors">
                  My Orders
                </Link>
              )}
              {!isAdmin && (
                <Link to="/profile" className="hidden sm:inline-block px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)] hover:text-[color:var(--brand-accent)] transition-colors">
                  Profile
                </Link>
              )}
              <button
                onClick={async () => { await signOut(); }}
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
            to="/design"
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
              <span className="font-display text-xl">{brand.brand_name}</span>
              <button aria-label="Close menu" onClick={() => setOpen(false)} className="p-2 -mr-2">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 6l12 12M18 6L6 18"/></svg>
              </button>
            </div>
            <div className="flex items-center border border-[color:var(--brand-dark)]/15 bg-white mb-5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="ml-3 text-[color:var(--brand-dark)]/50 shrink-0"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search sofas, fabrics…"
                className="w-full px-3 py-3 text-sm bg-transparent focus:outline-none placeholder:text-[color:var(--brand-dark)]/40"
              />
            </div>
            {q.trim() !== "" && suggestions.length > 0 && (
              <ul className="mb-4 border border-[color:var(--brand-dark)]/10 divide-y divide-[color:var(--brand-dark)]/5">
                {suggestions.map((s, i) => (
                  <li key={`${s.label}-${i}`}>
                    <button
                      onClick={() => { navigate({ to: s.to as string }); setOpen(false); setQ(""); }}
                      className="w-full text-left px-3 py-2.5 hover:bg-[color:var(--brand-muted)]/50 flex justify-between items-center gap-3"
                    >
                      <span className="text-sm truncate">{s.label}</span>
                      <span className="text-[9px] uppercase tracking-widest text-[color:var(--brand-dark)]/40 shrink-0">{s.sub}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-col gap-1">
              {drawerNav.map((n) => (
                <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="py-3 border-b border-[color:var(--brand-dark)]/10 text-sm font-semibold uppercase tracking-widest">
                  {n.label}
                </Link>
              ))}
              {signedIn ? (
                <>
                  {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className="py-3 border-b border-[color:var(--brand-dark)]/10 text-sm font-semibold uppercase tracking-widest text-[color:var(--brand-accent)]">Admin</Link>}
                  {!isAdmin && <Link to="/dashboard" onClick={() => setOpen(false)} className="py-3 border-b border-[color:var(--brand-dark)]/10 text-sm font-semibold uppercase tracking-widest">My Orders</Link>}
                  {!isAdmin && <Link to="/profile" onClick={() => setOpen(false)} className="py-3 border-b border-[color:var(--brand-dark)]/10 text-sm font-semibold uppercase tracking-widest">Profile</Link>}
                  <Link to="/my-designs" onClick={() => setOpen(false)} className="py-3 border-b border-[color:var(--brand-dark)]/10 text-sm font-semibold uppercase tracking-widest">Saved Designs</Link>
                  <button onClick={async () => { await signOut(); setOpen(false); }} className="py-3 border-b border-[color:var(--brand-dark)]/10 text-left text-sm font-semibold uppercase tracking-widest text-[color:var(--brand-dark)]/60">Sign out</button>
                </>
              ) : (
                <Link to="/auth" onClick={() => setOpen(false)} className="py-3 border-b border-[color:var(--brand-dark)]/10 text-sm font-semibold uppercase tracking-widest">Sign in</Link>
              )}
            </div>
            <Link to="/design" onClick={() => setOpen(false)} className="mt-auto text-center px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest">
              Design Yours
            </Link>
          </div>
        </div>
      )}
    </>
  );
}