import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * Shown when the admin has switched a storefront section off in
 * Settings → Sections. Keeps the URL valid but removes the experience.
 */
export function SectionDisabled({ title = "Section unavailable" }: { title?: string }) {
  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)] flex flex-col">
      <SiteHeader />
      <main className="flex-1 grid place-items-center px-6 py-24 text-center">
        <div className="max-w-md">
          <span className="tf-chip mb-4">Temporarily Off</span>
          <h1 className="text-3xl sm:text-4xl font-display mt-4">{title}</h1>
          <p className="text-[color:var(--brand-dark)]/60 mt-4">
            This part of the studio is currently switched off. Explore our collections in the meantime.
          </p>
          <Link
            to="/collections"
            className="inline-block mt-8 px-8 py-4 bg-[color:var(--brand-dark)] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors"
          >
            Browse Collections →
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
