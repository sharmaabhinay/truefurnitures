import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { COL, fsFindOne, fsGet, where } from "@/lib/db/firestore";
import { formatINR } from "@/lib/format";

const Sofa3D = lazy(() => import("@/components/sofa-3d"));

type SavedDesignConfig = {
  colorHex?: string;
  fabric?: string;
  seats?: number;
  isSectional?: boolean;
  addons?: Record<string, boolean>;
  price?: number;
  sizeLabel?: string;
  colorLabel?: string;
  fabricLabel?: string;
};

type SavedDesignDoc = {
  id: string;
  name: string;
  config: SavedDesignConfig;
  sofa_id: string;
  share_token: string;
};

type SharedDesign = {
  id: string;
  name: string;
  config: SavedDesignConfig;
  sofa: { slug: string; name: string } | null;
};

export const Route = createFileRoute("/shared-design/$token")({
  // Firestore rules are evaluated with the visitor's (often anonymous) identity,
  // so the lookup must run in the browser rather than during SSR.
  ssr: false,
  loader: async ({ params }) => {
    const design = await fsFindOne<SavedDesignDoc>(COL.savedDesigns, where("share_token", "==", params.token));
    if (!design) throw notFound();
    const sofa = design.sofa_id ? await fsGet<{ slug: string; name: string }>(COL.sofas, design.sofa_id) : null;
    return {
      id: design.id,
      name: design.name,
      config: design.config,
      sofa: sofa ? { slug: sofa.slug, name: sofa.name } : null,
    } as SharedDesign;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Design"} — Shared on True Furniture's` },
      { name: "description", content: "A bespoke sofa design shared with you. See it in 3D and make it yours." },
      { property: "og:title", content: `${loaderData?.name ?? "Design"} — True Furniture's` },
      { property: "og:description", content: "A shared sofa design — view in 3D." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SharedDesignView,
});

function SharedDesignView() {
  const design = Route.useLoaderData();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const cfg = design.config ?? {};

  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)] flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 md:px-10 py-10 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-[color:var(--brand-muted)] overflow-hidden border border-[color:var(--brand-dark)]/10">
            {mounted && (
              <Suspense fallback={<div className="w-full h-full grid place-items-center text-xs uppercase tracking-widest text-[color:var(--brand-dark)]/50">Loading 3D…</div>}>
                <Sofa3D
                  colorHex={cfg.colorHex ?? "#d9c9a8"}
                  seats={cfg.seats ?? 3}
                  isSectional={cfg.isSectional ?? false}
                  fabric={cfg.fabric ?? "boucle"}
                  addons={{ cupHolder: false, footrest: false, usb: false, storage: false, ...cfg.addons }}
                />
              </Suspense>
            )}
          </div>
        </div>
        <div>
          <span className="tf-chip mb-4">Shared Design</span>
          <h1 className="text-3xl md:text-4xl font-display mt-3 text-balance">{design.name}</h1>
          {design.sofa && <p className="text-[color:var(--brand-dark)]/60 mt-1">Based on the {design.sofa.name}</p>}
          <dl className="mt-6 grid grid-cols-2 gap-3 text-[10px] uppercase tracking-widest text-[color:var(--brand-dark)]/60">
            <div className="bg-white border border-[color:var(--brand-dark)]/10 p-3"><dt className="text-[color:var(--brand-dark)]/40">Size</dt><dd className="mt-1 font-bold text-[color:var(--brand-dark)]">{cfg.sizeLabel ?? "—"}</dd></div>
            <div className="bg-white border border-[color:var(--brand-dark)]/10 p-3"><dt className="text-[color:var(--brand-dark)]/40">Fabric</dt><dd className="mt-1 font-bold text-[color:var(--brand-dark)]">{cfg.fabricLabel ?? "—"}</dd></div>
            <div className="bg-white border border-[color:var(--brand-dark)]/10 p-3"><dt className="text-[color:var(--brand-dark)]/40">Color</dt><dd className="mt-1 font-bold text-[color:var(--brand-dark)]">{cfg.colorLabel ?? "—"}</dd></div>
            <div className="bg-white border border-[color:var(--brand-dark)]/10 p-3"><dt className="text-[color:var(--brand-dark)]/40">Estimated Price</dt><dd className="mt-1 font-bold text-[color:var(--brand-dark)]">{cfg.price ? formatINR(cfg.price) : "—"}</dd></div>
          </dl>
          {design.sofa && (
            <Link to="/configure/$slug" params={{ slug: design.sofa.slug }} className="mt-8 inline-block px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)]">
              Customize This Design
            </Link>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
