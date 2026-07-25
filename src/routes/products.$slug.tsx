import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, estimatedDelivery } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";
import sofaMalwa from "@/assets/sofa-malwa.jpg";
import sofaUjjain from "@/assets/sofa-ujjain.jpg";
import sofaIndore from "@/assets/sofa-indore.jpg";
import sofaEmerald from "@/assets/sofa-emerald.jpg";
import sofaIvory from "@/assets/sofa-ivory.jpg";
import sofaTerracotta from "@/assets/sofa-terracotta.jpg";
import fabricBoucle from "@/assets/fabric-boucle.jpg";
import fabricVelvet from "@/assets/fabric-velvet.jpg";
import fabricLinen from "@/assets/fabric-linen.jpg";
import fabricLeather from "@/assets/fabric-leather.jpg";
import showroomIndore from "@/assets/showroom-indore.jpg";

const heroImages: Record<string, string> = {
  "malwa-modular": sofaMalwa,
  "ujjain-arch": sofaUjjain,
  "indore-slimline": sofaIndore,
  "emerald-chesterfield": sofaEmerald,
  "ivory-curve": sofaIvory,
  "terracotta-sectional": sofaTerracotta,
};

const fabricSwatches: Record<string, string> = {
  boucle: fabricBoucle,
  velvet: fabricVelvet,
  linen: fabricLinen,
  leather: fabricLeather,
};

type Sofa = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  base_price: number;
  sale_price: number | null;
  hero_image: string | null;
  full_description: string | null;
  description: string | null;
  features: string[] | null;
  dimensions: string | null;
  materials: string | null;
  delivery_days: number | null;
  seo_title: string | null;
  seo_description: string | null;
};

const sofaQuery = (slug: string) =>
  queryOptions({
    queryKey: ["sofa", slug],
    queryFn: async (): Promise<Sofa | null> => {
      const { data, error } = await supabase
        .from("sofas")
        .select("id, slug, name, tagline, base_price, sale_price, hero_image, full_description, description, features, dimensions, materials, delivery_days, seo_title, seo_description")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return data as Sofa | null;
    },
  });

type RelatedSofa = { id: string; slug: string; name: string; tagline: string | null; base_price: number };

const relatedQuery = (slug: string) =>
  queryOptions({
    queryKey: ["sofa-related", slug],
    queryFn: async (): Promise<RelatedSofa[]> => {
      const { data, error } = await supabase
        .from("sofas")
        .select("id, slug, name, tagline, base_price")
        .eq("is_published", true)
        .neq("slug", slug)
        .order("sort_order")
        .limit(3);
      if (error) return [];
      return data ?? [];
    },
  });

export const Route = createFileRoute("/products/$slug")({
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData(sofaQuery(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Not found — True Furniture's" }, { name: "robots", content: "noindex" }] };
    }
    const title = loaderData.seo_title ?? `${loaderData.name} — True Furniture's`;
    const desc = loaderData.seo_description ?? loaderData.tagline ?? "Fully customizable sofa hand-tailored in Indore & Ujjain.";
    const path = `/products/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:url", content: path },
        { property: "product:price:amount", content: String(loaderData.base_price) },
        { property: "product:price:currency", content: "INR" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: path }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: loaderData.name,
            description: desc,
            brand: { "@type": "Brand", name: "True Furniture's" },
            category: "Sofa",
            offers: {
              "@type": "Offer",
              priceCurrency: "INR",
              price: loaderData.base_price,
              availability: "https://schema.org/InStock",
              areaServed: "Indore, Ujjain, Madhya Pradesh",
            },
          }),
        },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { data: sofa } = useQuery(sofaQuery(slug));
  const { data: related } = useQuery(relatedQuery(slug));
  const cart = useCart();
  const [activeImage, setActiveImage] = useState(0);
  const [fabric, setFabric] = useState<keyof typeof fabricSwatches>("boucle");

  if (!sofa) return null;

  const hero = heroImages[sofa.slug] ?? sofa.hero_image ?? sofaMalwa;
  const gallery = [hero, fabricSwatches[fabric], showroomIndore, hero];
  const price = Number(sofa.base_price);
  const sale = sofa.sale_price ? Number(sofa.sale_price) : null;
  const deposit = Math.round((sale ?? price) * 0.2);
  const eta = estimatedDelivery(sofa.delivery_days ?? 30);

  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)]">
      <SiteHeader />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pt-6 text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/50">
        <Link to="/">Home</Link> <span className="mx-2">/</span>
        <Link to="/collections">Collections</Link> <span className="mx-2">/</span>
        <span className="text-[color:var(--brand-dark)]">{sofa.name}</span>
      </div>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-8 md:py-12 grid gap-8 md:gap-12 lg:grid-cols-2">
        {/* Gallery */}
        <div className="animate-fade-up">
          <div className="aspect-[4/5] bg-[color:var(--brand-muted)] overflow-hidden mb-3">
            <img src={gallery[activeImage]} alt={sofa.name} className="w-full h-full object-cover" />
          </div>
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {gallery.map((g, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                aria-label={`View image ${i + 1}`}
                className={`aspect-square bg-[color:var(--brand-muted)] overflow-hidden border-2 transition-colors ${activeImage === i ? "border-[color:var(--brand-dark)]" : "border-transparent"}`}
              >
                <img src={g} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="animate-fade-up delay-100">
          <span className="tf-chip mb-4">{sofa.tagline ?? "Signature Piece"}</span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display mt-4 mb-4 text-balance">{sofa.name}</h1>

          <div className="flex items-baseline gap-3 mb-6">
            {sale ? (
              <>
                <span className="text-3xl font-display">{formatINR(sale)}</span>
                <span className="text-lg text-[color:var(--brand-dark)]/40 line-through">{formatINR(price)}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-accent)]">Save {formatINR(price - sale)}</span>
              </>
            ) : (
              <span className="text-3xl font-display">{formatINR(price)}</span>
            )}
            <span className="text-xs text-[color:var(--brand-dark)]/50">· incl. GST</span>
          </div>

          <p className="text-[color:var(--brand-dark)]/70 leading-relaxed mb-8">
            {sofa.full_description ?? sofa.description ?? sofa.tagline}
          </p>

          {/* Fabric picker */}
          <div className="mb-8">
            <p className="text-[10px] font-black uppercase tracking-widest mb-3">Choose Fabric</p>
            <div className="flex gap-3">
              {(Object.keys(fabricSwatches) as Array<keyof typeof fabricSwatches>).map((f) => (
                <button
                  key={f}
                  onClick={() => setFabric(f)}
                  aria-label={f}
                  className={`size-12 sm:size-14 overflow-hidden border-2 transition-transform hover:scale-105 ${fabric === f ? "border-[color:var(--brand-dark)]" : "border-transparent"}`}
                >
                  <img src={fabricSwatches[f]} alt={f} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <p className="text-xs text-[color:var(--brand-dark)]/50 mt-2 capitalize">{fabric} · included in base price</p>
          </div>

          {/* Delivery card */}
          <div className="border border-[color:var(--brand-dark)]/10 p-5 mb-6 flex items-start gap-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="shrink-0 mt-1"><path d="M3 7h13v10H3zM16 10h4l1 3v4h-5"/><circle cx="6.5" cy="17.5" r="1.5"/><circle cx="17.5" cy="17.5" r="1.5"/></svg>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest">Expected Delivery</p>
              <p className="font-display text-lg mt-1">By {eta}</p>
              <p className="text-xs text-[color:var(--brand-dark)]/50 mt-1">Free white-glove delivery in Indore &amp; Ujjain · {sofa.delivery_days} days build time</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <button
              onClick={() => {
                cart.add({
                  sofaId: sofa.id,
                  slug: sofa.slug,
                  name: sofa.name,
                  image: hero,
                  unitPrice: sale ?? price,
                  fabric,
                });
                toast.success(`${sofa.name} added to cart`);
                navigate({ to: "/cart" });
              }}
              className="flex-1 px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors"
            >
              Add to Cart · Deposit {formatINR(deposit)}
            </button>
            <Link to="/showrooms" className="flex-1 text-center px-6 py-4 border border-[color:var(--brand-dark)]/20 text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-dark)] hover:text-white transition-colors">
              Book Showroom Visit
            </Link>
          </div>

          <Link
            to="/configure/$slug"
            params={{ slug: sofa.slug }}
            className="mb-8 -mt-2 group flex items-center justify-between gap-4 px-5 py-4 border border-[color:var(--brand-dark)] hover:bg-[color:var(--brand-dark)] hover:text-white transition-colors"
          >
            <span className="flex items-center gap-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 22V12"/><path d="M21 7l-9 5-9-5"/></svg>
              <span>
                <span className="block text-xs font-bold uppercase tracking-widest">Customize in 3D</span>
                <span className="block text-[10px] opacity-70">Fabric · Color · Size · Add-ons — price updates live</span>
              </span>
            </span>
            <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
          </Link>

          {/* Specs */}
          <div className="border-t border-[color:var(--brand-dark)]/10 pt-6 space-y-4 text-sm">
            {sofa.dimensions && (
              <div className="grid grid-cols-3 gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-[color:var(--brand-dark)]/50">Dimensions</span>
                <span className="col-span-2">{sofa.dimensions}</span>
              </div>
            )}
            {sofa.materials && (
              <div className="grid grid-cols-3 gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-[color:var(--brand-dark)]/50">Materials</span>
                <span className="col-span-2">{sofa.materials}</span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-[color:var(--brand-dark)]/50">Warranty</span>
              <span className="col-span-2">5-year frame warranty · 1-year upholstery</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      {sofa.features && sofa.features.length > 0 && (
        <section className="bg-[color:var(--brand-muted)]/40 py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display mb-10 text-balance">Why this piece is worth it.</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {sofa.features.map((f) => (
                <div key={f} className="bg-white p-6 border border-[color:var(--brand-dark)]/5">
                  <div className="text-[color:var(--brand-accent)] text-2xl font-display mb-3">✦</div>
                  <p className="text-sm leading-relaxed">{f}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related products */}
      {related && related.length > 0 && (
        <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <span className="tf-chip mb-2">You May Also Like</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-display mt-3 text-balance">More silhouettes to customize.</h2>
            </div>
            <Link to="/collections" className="text-[10px] font-bold uppercase tracking-widest border-b border-[color:var(--brand-dark)] pb-1">View all →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {related.map((r) => {
              const img = heroImages[r.slug] ?? sofaMalwa;
              return (
                <Link key={r.id} to="/products/$slug" params={{ slug: r.slug }} className="group hover-lift block">
                  <div className="aspect-[4/5] bg-[color:var(--brand-muted)] mb-4 overflow-hidden">
                    <img src={img} alt={r.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-display text-lg">{r.name}</h3>
                      <p className="text-[10px] uppercase tracking-widest text-[color:var(--brand-dark)]/40 mt-1">{r.tagline}</p>
                    </div>
                    <span className="text-sm font-medium whitespace-nowrap">{formatINR(Number(r.base_price))}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <SiteFooter />
    </div>
  );
}