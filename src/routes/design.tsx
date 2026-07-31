import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { COL, fsList, where, orderBy } from "@/lib/db/firestore";
import { formatINR } from "@/lib/format";
import { CollectionsGridSkeleton } from "@/components/skeleton";
import sofaMalwa from "@/assets/sofa-malwa.jpg";
import sofaUjjain from "@/assets/sofa-ujjain.jpg";
import sofaIndore from "@/assets/sofa-indore.jpg";
import sofaEmerald from "@/assets/sofa-emerald.jpg";
import sofaIvory from "@/assets/sofa-ivory.jpg";
import sofaTerracotta from "@/assets/sofa-terracotta.jpg";

const images: Record<string, string> = {
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
  queryKey: ["design-sofas"],
  queryFn: async (): Promise<Sofa[]> => {
    return fsList<Sofa>(COL.sofas, where("is_published", "==", true), orderBy("sort_order"));
  },
});

export const Route = createFileRoute("/design")({
  head: () => ({
    meta: [
      { title: "Design Your Sofa in 3D — True Furniture's" },
      { name: "description", content: "Pick a silhouette and design it live in 3D — fabric, colour, size, add-ons. Price updates in real time." },
      { property: "og:title", content: "Design Your Sofa in 3D — True Furniture's" },
      { property: "og:description", content: "Open the 3D atelier — customize every inch of your sofa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DesignPicker,
});

function DesignPicker() {
  const { data: sofas, isLoading } = useQuery(sofasQuery);
  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)]">
      <SiteHeader />
      <section className="px-6 md:px-10 pt-16 pb-8 max-w-7xl mx-auto text-center">
        <span className="tf-chip mb-4 animate-fade-up">The Digital Atelier</span>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-display mt-4 max-w-3xl mx-auto animate-fade-up delay-100 text-balance">
          Start With A Silhouette. <span className="italic">Make It Yours.</span>
        </h1>
        <p className="text-[color:var(--brand-dark)]/60 mt-6 max-w-xl mx-auto animate-fade-up delay-200">
          Pick any base below to open the live 3D designer — fabric, colour, size and add-ons update instantly with price.
        </p>
      </section>
      <section className="px-6 md:px-10 pb-24 max-w-7xl mx-auto">
        {isLoading || !sofas ? (
          <CollectionsGridSkeleton />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {sofas.map((s, i) => {
              const img = images[s.slug] ?? s.hero_image ?? undefined;
              return (
                <div key={s.id} className="group animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
                  <div className="aspect-[4/5] bg-[color:var(--brand-muted)] mb-5 overflow-hidden relative">
                    {img && <img src={img} alt={s.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />}
                    <div className="absolute top-3 left-3 tf-chip bg-white/85 backdrop-blur">3D Ready</div>
                  </div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-display">{s.name}</h3>
                      <p className="text-[10px] uppercase tracking-widest text-[color:var(--brand-dark)]/40 mt-1">{s.tagline}</p>
                    </div>
                    <span className="text-sm font-medium whitespace-nowrap">from {formatINR(Number(s.base_price))}</span>
                  </div>
                  <Link
                    to="/configure/$slug"
                    params={{ slug: s.slug }}
                    className="block text-center px-6 py-3 bg-[color:var(--brand-dark)] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors"
                  >
                    Design in 3D →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
