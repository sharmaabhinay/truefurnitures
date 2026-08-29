import { useFeatures } from "@/lib/brand";
import { SectionDisabled } from "@/components/section-disabled";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { COL, fsList, where, limit, sortRows } from "@/lib/db/firestore";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Customer Gallery — True Furniture's" },
      { name: "description", content: "Real bespoke sofas in real homes across Indore and Ujjain. Photos and reviews from our customers." },
      { property: "og:title", content: "Customer Gallery — True Furniture's" },
      { property: "og:description", content: "See how our sofas live in real Indore & Ujjain homes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Gallery,
});

type RawReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  images: string[] | null;
  city: string | null;
  created_at: string;
  sofa_id: string | null;
};

type Review = RawReview & { sofa: { name: string; slug: string } | null };

type SofaLite = { id: string; name: string; slug: string };

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5 text-[color:var(--brand-accent)]">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < n ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>
      ))}
    </div>
  );
}

function Gallery() {
  const _features = useFeatures();
  if (!_features.gallery) return <SectionDisabled title="Gallery" />;
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["public-reviews"],
    queryFn: async (): Promise<Review[]> => {
      const rows = sortRows(
        await fsList<RawReview>(COL.reviews, where("approved", "==", true), limit(60)),
        "created_at",
        "desc",
      );
      const sofas = await fsList<SofaLite>(COL.sofas, where("is_published", "==", true));
      const sofaMap = new Map(sofas.map((s) => [s.id, { name: s.name, slug: s.slug }]));
      return rows.map((r) => ({ ...r, sofa: r.sofa_id ? sofaMap.get(r.sofa_id) ?? null : null }));
    },
  });

  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)] flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 md:px-10 py-12 md:py-16">
        <span className="tf-chip mb-4">Real Homes</span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-display mt-4 mb-3 text-balance">Our sofas in your home.</h1>
        <p className="text-[color:var(--brand-dark)]/60 mb-10 max-w-2xl">Every review is from a verified customer in Indore or Ujjain. Photos are theirs.</p>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0,1,2,3,4,5].map((i) => <div key={i} className="tf-skeleton h-72" />)}
          </div>
        ) : !reviews || reviews.length === 0 ? (
          <div className="border border-[color:var(--brand-dark)]/10 p-16 text-center bg-white">
            <p className="text-[color:var(--brand-dark)]/60 mb-6">Our first customer stories are coming soon.</p>
            <Link to="/collections" className="inline-block px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)]">Browse Collections</Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <article key={r.id} className="bg-white border border-[color:var(--brand-dark)]/10 p-5 animate-fade-up flex flex-col">
                {r.images && r.images.length > 0 && (
                  <div className="aspect-[4/3] mb-4 bg-[color:var(--brand-muted)] overflow-hidden -m-5 mb-4">
                    <img src={r.images[0]} alt={r.title ?? ""} className="w-full h-full object-cover" />
                  </div>
                )}
                <Stars n={r.rating} />
                {r.title && <h3 className="font-display text-lg mt-2">{r.title}</h3>}
                <p className="text-sm text-[color:var(--brand-dark)]/70 mt-2 flex-1">{r.body}</p>
                <div className="text-[10px] uppercase tracking-widest text-[color:var(--brand-dark)]/50 mt-4 pt-4 border-t border-[color:var(--brand-dark)]/10 flex justify-between">
                  <span>{r.sofa?.name ?? "Custom"} {r.city && `· ${r.city}`}</span>
                  <span>{formatDate(r.created_at)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
