import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  const [priceMax, setPriceMax] = useState(200000);
  const [sort, setSort] = useState<"featured" | "price-asc" | "price-desc" | "name">("featured");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!sofas) return [];
    let list = sofas.filter((s) => Number(s.base_price) <= priceMax);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((s) =>
        s.name.toLowerCase().includes(needle) ||
        (s.tagline ?? "").toLowerCase().includes(needle) ||
        s.slug.includes(needle),
      );
    }
    if (sort === "price-asc") list = [...list].sort((a, b) => Number(a.base_price) - Number(b.base_price));
    if (sort === "price-desc") list = [...list].sort((a, b) => Number(b.base_price) - Number(a.base_price));
    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [sofas, priceMax, sort, q]);

  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)]">
      <SiteHeader />
      <section className="px-6 md:px-10 pt-16 pb-8 max-w-7xl mx-auto">
        <span className="text-[color:var(--brand-accent)] font-semibold tracking-[0.3em] uppercase text-xs animate-fade-up">Fully Customizable Furniture</span>
        <h1 className="text-5xl md:text-6xl font-display mt-4 max-w-3xl animate-fade-up delay-100">Every Silhouette, <span className="italic">Yours to Shape.</span></h1>
        <p className="text-[color:var(--brand-dark)]/60 mt-6 max-w-xl animate-fade-up delay-200">Every sofa is designed for full customization — fabric, colour, size, legs and add-ons. Click any piece to begin.</p>
      </section>

      {/* Filters */}
      <section className="px-6 md:px-10 max-w-7xl mx-auto">
        <div className="border border-[color:var(--brand-dark)]/10 bg-white p-4 sm:p-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] items-end">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[color:var(--brand-dark)]/50 block mb-2">Search</label>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, style…"
              className="w-full border-b border-[color:var(--brand-dark)]/20 pb-2 text-sm focus:outline-none focus:border-[color:var(--brand-dark)] bg-transparent"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[color:var(--brand-dark)]/50 block mb-2">
              Max Price · {formatINR(priceMax)}
            </label>
            <input
              type="range"
              min={30000}
              max={200000}
              step={5000}
              value={priceMax}
              onChange={(e) => setPriceMax(Number(e.target.value))}
              className="w-full accent-[color:var(--brand-dark)]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              { k: "featured", l: "Featured" },
              { k: "price-asc", l: "Price ↑" },
              { k: "price-desc", l: "Price ↓" },
              { k: "name", l: "A–Z" },
            ] as const).map((o) => (
              <button
                key={o.k}
                onClick={() => setSort(o.k)}
                className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest border transition ${sort === o.k ? "border-[color:var(--brand-dark)] bg-[color:var(--brand-dark)] text-white" : "border-[color:var(--brand-dark)]/15 hover:border-[color:var(--brand-dark)]/40"}`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/50">
          Showing {filtered.length} of {sofas?.length ?? 0} pieces
        </div>
      </section>

      <section className="px-6 md:px-10 pb-24 max-w-7xl mx-auto">
        {isLoading || !sofas ? (
          <CollectionsGridSkeleton />
        ) : filtered.length === 0 ? (
          <div className="mt-10 border border-[color:var(--brand-dark)]/10 bg-white p-10 text-center">
            <p className="text-sm text-[color:var(--brand-dark)]/60 mb-4">No pieces match your filters.</p>
            <button
              onClick={() => { setQ(""); setPriceMax(200000); setSort("featured"); }}
              className="text-[10px] font-bold uppercase tracking-widest border-b border-[color:var(--brand-dark)] pb-1"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12">
            {filtered.map((s, i) => {
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
        <div className="mt-16 text-center">
          <Link to="/design" className="inline-block px-8 py-4 bg-[color:var(--brand-dark)] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors">
            Open 3D Designer →
          </Link>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}