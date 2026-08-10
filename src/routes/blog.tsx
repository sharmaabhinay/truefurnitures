import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { COL, fsList, where, sortRows } from "@/lib/db/firestore";
import { formatDate } from "@/lib/format";

type Post = { id: string; external_url?: string | null; slug: string; title: string; excerpt: string | null; cover_image: string | null; reading_minutes: number | null; published_at: string | null };

const postsQuery = queryOptions({
  queryKey: ["blog-posts"],
  queryFn: async (): Promise<Post[]> => {
    return sortRows(await fsList<Post>(COL.blogPosts, where("is_published", "==", true)), "published_at", "desc");
  },
});

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Journal — True Furniture's" },
      { name: "description", content: "Interior style, material guides, and craft stories from the True Furniture's atelier in Indore & Ujjain." },
      { property: "og:title", content: "Journal — True Furniture's" },
      { property: "og:description", content: "Style, material, and craft — from our atelier." },
      { property: "og:url", content: "/blog" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  component: Blog,
});

function Blog() {
  const { data: posts, isLoading } = useQuery(postsQuery);
  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)] flex flex-col">
      <SiteHeader />
      <section className="max-w-6xl w-full mx-auto px-6 md:px-10 py-16 sm:py-24 flex-1">
        <span className="tf-chip">The Journal</span>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-display mt-4 mb-4 text-balance">Style, material, craft.</h1>
        <p className="text-[color:var(--brand-dark)]/60 max-w-xl mb-14">Long reads from our workshop and design consultants.</p>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[0, 1, 2].map((i) => <div key={i} className="tf-skeleton aspect-[4/5]" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            {posts?.map((p, i) => (
              <CardShell key={p.id} post={p} delay={i * 80}>
                <div className="aspect-[4/5] bg-[color:var(--brand-muted)] overflow-hidden mb-5">
                  {p.cover_image && (
                    <img src={p.cover_image} alt={p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                  )}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/40 mb-2">
                  {p.published_at ? formatDate(p.published_at) : ""} · {p.reading_minutes ?? 4} min read
                </p>
                <h2 className="font-display text-xl leading-tight mb-2">{p.title}</h2>
                <p className="text-sm text-[color:var(--brand-dark)]/60">{p.excerpt}</p>
              </CardShell>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}

function CardShell({ post, delay, children }: { post: Post; delay: number; children: React.ReactNode }) {
  const cls = "group hover-lift block animate-fade-up";
  const style = { animationDelay: `${delay}ms` };
  if (post.external_url) {
    return (
      <a href={post.external_url} target="_blank" rel="noreferrer" className={cls} style={style}>
        {children}
      </a>
    );
  }
  return (
    <Link to="/blog/$slug" params={{ slug: post.slug }} className={cls} style={style}>
      {children}
    </Link>
  );
}
