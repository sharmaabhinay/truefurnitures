import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";
import { CollectionsGridSkeleton } from "@/components/skeleton";
import sofaMalwa from "@/assets/sofa-malwa.jpg";
import sofaUjjain from "@/assets/sofa-ujjain.jpg";
import sofaIndore from "@/assets/sofa-indore.jpg";
import sofaEmerald from "@/assets/sofa-emerald.jpg";
import sofaIvory from "@/assets/sofa-ivory.jpg";
import sofaTerracotta from "@/assets/sofa-terracotta.jpg";

const sofaImages: Record<string, string> = {
  "malwa-modular": sofaMalwa,
  "ujjain-arch": sofaUjjain,
  "indore-slimline": sofaIndore,
  "emerald-chesterfield": sofaEmerald,
  "ivory-curve": sofaIvory,
  "terracotta-sectional": sofaTerracotta,
};

type Sofa = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  base_price: number;
  hero_image: string | null;
};

const sofasQuery = queryOptions({
  queryKey: ["sofas", "published"],
  queryFn: async (): Promise<Sofa[]> => {
    const { data, error } = await supabase
      .from("sofas")
      .select("id, slug, name, tagline, base_price, hero_image")
      .eq("is_published", true)
      .order("sort_order");
    if (error) throw error;
    return data ?? [];
  },
});

export const Route = createFileRoute("/collections")({
  head: () => ({
    meta: [
      { title: "Collections — True Furniture's" },
      { name: "description", content: "Explore our full catalog of fully customizable, hand-tailored sofas. Every silhouette is available for material, colour and size customization." },
      { property: "og:title", content: "Collections — True Furniture's" },
      { property: "og:description", content: "Browse every silhouette in our fully customizable sofa collection." },
    ],
  }),
  component: Collections,
});

function Collections() {
  const { data: sofas, isLoading } = useQuery(sofasQuery);
  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)]">
      <SiteHeader />
      <section className="px-6 md:px-10 pt-16 pb-8 max-w-7xl mx-auto">
        <span className="text-[color:var(--brand-accent)] font-semibold tracking-[0.3em] uppercase text-xs animate-fade-up">Fully Customizable Furniture</span>
        <h1 className="text-5xl md:text-6xl font-display mt-4 max-w-3xl animate-fade-up delay-100">Every Silhouette, <span className="italic">Yours to Shape.</span></h1>
        <p className="text-[color:var(--brand-dark)]/60 mt-6 max-w-xl animate-fade-up delay-200">Every sofa is designed for full customization — fabric, colour, size, legs and add-ons. Click any piece to begin.</p>
      </section>
      <section className="px-6 md:px-10 pb-24 max-w-7xl mx-auto">
        {isLoading || !sofas ? (
          <CollectionsGridSkeleton />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12">
            {sofas.map((s, i) => {
              const img = sofaImages[s.slug] ?? s.hero_image ?? undefined;
              return (
                <Link key={s.id} to="/products/$slug" params={{ slug: s.slug }} className={`group cursor-pointer block hover-lift animate-fade-up`} style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="aspect-[4/5] bg-[color:var(--brand-muted)] mb-6 overflow-hidden">
                    {img ? (
                      <img src={img} alt={s.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-[10px] uppercase tracking-widest text-[color:var(--brand-dark)]/30">Image coming soon</div>
                    )}
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-display">{s.name}</h3>
                      <p className="text-[10px] uppercase tracking-widest text-[color:var(--brand-dark)]/40 mt-1">{s.tagline}</p>
                    </div>
                    <span className="text-sm font-medium whitespace-nowrap">{formatINR(Number(s.base_price))}</span>
                  </div>
                  <span className="mt-3 inline-block text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-accent)] opacity-0 group-hover:opacity-100 transition-opacity">View Piece →</span>
                </Link>
              );
            })}
          </div>
        )}
        <div className="mt-16 text-center text-sm text-[color:var(--brand-dark)]/50">
          The interactive 3D customizer opens in the next release — meanwhile, visit a showroom for a personal walkthrough.
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}