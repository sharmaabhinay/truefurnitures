import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";

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
      { title: "Collections — Avant-Garde Atelier" },
      { name: "description", content: "Explore our full catalog of hand-tailored custom sofas. Each design is available for full 3D customization." },
      { property: "og:title", content: "Collections — Avant-Garde Atelier" },
      { property: "og:description", content: "Browse every silhouette in our custom sofa collection." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(sofasQuery),
  component: Collections,
});

function Collections() {
  const { data: sofas } = useSuspenseQuery(sofasQuery);
  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)]">
      <SiteHeader />
      <section className="px-6 md:px-10 pt-16 pb-8 max-w-7xl mx-auto">
        <span className="text-[color:var(--brand-accent)] font-semibold tracking-[0.3em] uppercase text-xs">The Full Catalog</span>
        <h1 className="text-5xl md:text-6xl font-display mt-4 max-w-3xl">Every Silhouette, <span className="italic">Yours to Shape.</span></h1>
        <p className="text-[color:var(--brand-dark)]/60 mt-6 max-w-xl">Every sofa is designed for full customization — fabric, colour, size, legs and add-ons. Click any piece to begin.</p>
      </section>
      <section className="px-6 md:px-10 pb-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12">
          {sofas.map((s) => (
            <Link key={s.id} to="/collections" className="group cursor-pointer block">
              <div className="aspect-[4/5] bg-[color:var(--brand-muted)] mb-6 overflow-hidden">
                {s.hero_image ? (
                  <img src={s.hero_image} alt={s.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-[10px] uppercase tracking-widest text-[color:var(--brand-dark)]/30">Image coming soon</div>
                )}
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-display">{s.name}</h3>
                  <p className="text-[10px] uppercase tracking-widest text-[color:var(--brand-dark)]/40 mt-1">{s.tagline}</p>
                </div>
                <span className="text-sm font-medium">{formatINR(Number(s.base_price))}</span>
              </div>
              <span className="mt-3 inline-block text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-accent)]">Customize →</span>
            </Link>
          ))}
        </div>
        <div className="mt-16 text-center text-sm text-[color:var(--brand-dark)]/50">
          The interactive 3D customizer opens in the next release — meanwhile, visit a showroom for a personal walkthrough.
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}