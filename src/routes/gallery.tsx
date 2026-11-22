import { useFeatures } from "@/lib/brand";
import { SectionDisabled } from "@/components/section-disabled";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listRealHomes } from "@/lib/real-homes.functions";
import { RealHomesGallery } from "@/components/real-homes-gallery";
import { RealHomeSubmission } from "@/components/real-home-submission";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { COL, fsList, where, limit, sortRows } from "@/lib/db/firestore";
import { formatDate } from "@/lib/format";

const homesQuery = queryOptions({ queryKey: ["real-homes"], queryFn: () => listRealHomes(), staleTime: 30_000 });
export const Route = createFileRoute("/gallery")({
  loader: ({ context }) => context.queryClient.ensureQueryData(homesQuery),
  head: () => ({
    meta: [
      { title: "Real Homes of Indore — True Furniture's" },
      { name: "description", content: "Customer living rooms and purchased sofas, shared by locality. Discover real homes around Indore and submit your own." },
      { property: "og:title", content: "Real Homes of Indore — True Furniture's" },
      { property: "og:description", content: "Customer living rooms, local stories and sofas made for home." },
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
  return <GalleryContent />;
}
function GalleryContent() {
  const { data: homes } = useSuspenseQuery(homesQuery);
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
        <span className="tf-chip mb-4">Made here. Loved here.</span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-display mt-4 mb-3 text-balance">Real Homes of Indore</h1>
        <p className="text-muted-foreground mb-10 max-w-2xl">Personal spaces, favourite corners, sofas made for everyday life. Shared by customers with delivered orders.</p>
        <RealHomesGallery homes={homes} />
        <RealHomeSubmission />
        <h2 className="font-display text-2xl mb-6">Customer reviews</h2>

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
