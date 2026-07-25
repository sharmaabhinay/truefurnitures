import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  author: string | null;
  reading_minutes: number | null;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

const postQuery = (slug: string) => queryOptions({
  queryKey: ["blog-post", slug],
  queryFn: async (): Promise<Post | null> => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw error;
    return data as Post | null;
  },
});

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData(postQuery(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] };
    const title = loaderData.seo_title ?? `${loaderData.title} — True Furniture's Journal`;
    const desc = loaderData.seo_description ?? loaderData.excerpt ?? "From the True Furniture's journal.";
    const path = `/blog/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: path },
        ...(loaderData.cover_image ? [
          { property: "og:image", content: loaderData.cover_image },
          { name: "twitter:image", content: loaderData.cover_image },
        ] : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: path }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: loaderData.title,
          description: desc,
          author: { "@type": "Organization", name: loaderData.author ?? "True Furniture's" },
          datePublished: loaderData.published_at,
          image: loaderData.cover_image ?? undefined,
        }),
      }],
    };
  },
  component: BlogPost,
});

function BlogPost() {
  const { slug } = Route.useParams();
  const { data: post } = useQuery(postQuery(slug));
  if (!post) return null;

  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)] flex flex-col">
      <SiteHeader />
      <article className="max-w-3xl w-full mx-auto px-6 md:px-10 py-12 sm:py-20">
        <Link to="/blog" className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/50 hover:text-[color:var(--brand-accent)]">← Back to Journal</Link>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl mt-6 mb-4 text-balance leading-[1.05]">{post.title}</h1>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/50 mb-10">
          {post.author} · {post.published_at && formatDate(post.published_at)} · {post.reading_minutes ?? 4} min read
        </p>
        {post.cover_image && (
          <img src={post.cover_image} alt={post.title} className="w-full aspect-[16/9] object-cover mb-10" />
        )}
        <div className="space-y-5 text-lg text-[color:var(--brand-dark)]/80 leading-[1.8]">
          {post.content.split("\n\n").map((para, i) => {
            if (para.startsWith("## ")) return <h2 key={i} className="font-display text-2xl sm:text-3xl mt-8 mb-2 text-[color:var(--brand-dark)]">{para.slice(3)}</h2>;
            return <p key={i} className="whitespace-pre-wrap">{para}</p>;
          })}
        </div>
      </article>
      <SiteFooter />
    </div>
  );
}