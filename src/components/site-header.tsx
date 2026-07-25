import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-10 py-5 bg-[color:var(--brand-cream)]/85 backdrop-blur-md border-b border-[color:var(--brand-dark)]/5">
      <Link to="/" className="font-display text-2xl font-bold tracking-tight text-[color:var(--brand-dark)]">
        AVANT-GARDE
      </Link>
      <div className="hidden md:flex gap-10 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--brand-dark)]">
        <Link to="/collections" className="hover:text-[color:var(--brand-accent)] transition-colors">Collections</Link>
        <Link to="/about" className="hover:text-[color:var(--brand-accent)] transition-colors">The Atelier</Link>
        <Link to="/showrooms" className="hover:text-[color:var(--brand-accent)] transition-colors">Showrooms</Link>
        <Link to="/contact" className="hover:text-[color:var(--brand-accent)] transition-colors">Contact</Link>
      </div>
      <Link
        to="/collections"
        className="px-6 py-2.5 bg-[color:var(--brand-dark)] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors"
      >
        Design Yours
      </Link>
    </nav>
  );
}