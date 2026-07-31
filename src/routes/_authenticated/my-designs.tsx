import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth/auth-context";
import { COL, fsList, fsGet, fsDelete, where } from "@/lib/db/firestore";
import { formatDate, formatINR } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/my-designs")({
  ssr: false,
  head: () => ({ meta: [
    { title: "My Saved Designs — True Furniture's" },
    { name: "description", content: "Every sofa configuration you have saved. Share, edit or add to cart." },
    { name: "robots", content: "noindex" },
  ] }),
  component: MyDesigns,
});

type SavedDesignDoc = {
  id: string;
  name: string;
  share_token: string;
  created_at: string;
  sofa_id: string | null;
  config: { price?: number; sizeLabel?: string; colorLabel?: string; fabricLabel?: string };
};

type SavedDesign = SavedDesignDoc & {
  sofa: { slug: string; name: string; hero_image: string | null } | null;
};

function MyDesigns() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-designs", user?.uid],
    enabled: !!user,
    queryFn: async (): Promise<SavedDesign[]> => {
      const rows = await fsList<SavedDesignDoc>(COL.savedDesigns, where("user_id", "==", user!.uid));
      rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      const sofas = await Promise.all(
        rows.map((r) => (r.sofa_id ? fsGet<{ slug: string; name: string; hero_image: string | null }>(COL.sofas, r.sofa_id) : Promise.resolve(null))),
      );
      return rows.map((r, i) => ({ ...r, sofa: sofas[i] }));
    },
  });

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/shared-design/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Share link copied!");
  };

  const del = async (id: string) => {
    if (!confirm("Delete this design?")) return;
    try {
      await fsDelete(COL.savedDesigns, id);
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["my-designs"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete design");
    }
  };

  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)] flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 md:px-10 py-12">
        <span className="tf-chip mb-4">Your Studio</span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-display mt-4 mb-3 text-balance">Saved designs.</h1>
        <p className="text-[color:var(--brand-dark)]/60 mb-8">Pick up where you left off, or share a design with family before ordering.</p>
        {authLoading || isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">{[0,1,2].map((i) => <div key={i} className="tf-skeleton h-40" />)}</div>
        ) : !data || data.length === 0 ? (
          <div className="border border-[color:var(--brand-dark)]/10 p-10 text-center bg-white">
            <p className="text-[color:var(--brand-dark)]/60 mb-6">You haven't saved any designs yet.</p>
            <Link to="/design" className="inline-block px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)]">Start Designing</Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {data.map((d) => (
              <article key={d.id} className="bg-white border border-[color:var(--brand-dark)]/10 p-5 flex gap-4 animate-fade-up">
                {d.sofa?.hero_image && <img src={d.sofa.hero_image} alt="" className="size-24 object-cover shrink-0" />}
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg truncate">{d.name}</h3>
                  <p className="text-[10px] uppercase tracking-widest text-[color:var(--brand-dark)]/50 mt-1">{d.sofa?.name ?? "Custom"} · Saved {formatDate(d.created_at)}</p>
                  <p className="text-xs text-[color:var(--brand-dark)]/60 mt-2">{d.config.sizeLabel} · {d.config.fabricLabel} · {d.config.colorLabel}</p>
                  {d.config.price && <p className="font-display text-lg mt-1">{formatINR(d.config.price)}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {d.sofa && (
                      <Link to="/configure/$slug" params={{ slug: d.sofa.slug }} className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 border border-[color:var(--brand-dark)] hover:bg-[color:var(--brand-dark)] hover:text-white transition">Edit</Link>
                    )}
                    <button onClick={() => copyLink(d.share_token)} className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 border border-[color:var(--brand-dark)]/30 hover:border-[color:var(--brand-dark)]">Share</button>
                    <button onClick={() => del(d.id)} className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 text-[color:var(--brand-dark)]/50 hover:text-red-600">Delete</button>
                  </div>
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
