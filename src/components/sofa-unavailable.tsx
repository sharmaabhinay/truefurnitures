import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/** Shown when a sofa can't be loaded or isn't published. */
export function SofaUnavailable() {
  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)] flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <h1 className="text-3xl font-display">This sofa isn't available right now</h1>
        <Link to="/collections" className="px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors">Browse Collections</Link>
      </main>
      <SiteFooter />
    </div>
  );
}
