import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FiArrowRight } from "react-icons/fi";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CareersApplyModal } from "@/components/careers-apply-modal";
import { logVisitor } from "@/lib/visitor-tracker";
import { fetchPublishedOpenings, FALLBACK_OPENINGS } from "@/lib/openings";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Careers — Build with True Furniture's" },
      { name: "description", content: "Join True Furniture's — hand-tailored bespoke sofas in Indore & Ujjain. Open roles across craft, design, and delivery." },
      { property: "og:title", content: "Careers — True Furniture's" },
      { property: "og:description", content: "Open roles at True Furniture's in Indore & Ujjain." },
      { property: "og:url", content: "/careers" },
    ],
    links: [{ rel: "canonical", href: "/careers" }],
  }),
  component: Careers,
});

function Careers() {
  const [applying, setApplying] = useState<{ title: string; city: string } | null>(null);
  const { data: roles = FALLBACK_OPENINGS } = useQuery({
    queryKey: ["job-openings"],
    queryFn: fetchPublishedOpenings,
  });
  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)] flex flex-col">
      <SiteHeader />
      <section className="max-w-5xl w-full mx-auto px-6 md:px-10 py-16 sm:py-24">
        <span className="tf-chip">Careers</span>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-display mt-4 mb-6 text-balance">Craft, without compromise.</h1>
        <p className="text-[color:var(--brand-dark)]/70 max-w-2xl leading-relaxed mb-14">
          True Furniture's is a 40-person atelier building the future of bespoke Indian furniture. If you care about material honesty, precise craft, and treating clients as friends — we should talk.
        </p>

        <div className="grid gap-4">
          {roles.map((r) => (
            <article key={r.id} className="border border-[color:var(--brand-dark)]/10 p-6 sm:p-8 grid sm:grid-cols-[1fr_auto] gap-6 items-center hover-lift bg-white">
              <div className="min-w-0">
                <h2 className="font-display text-2xl mb-2">{r.title}</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-accent)] mb-3">{r.city} · {r.type}</p>
                <p className="text-sm text-[color:var(--brand-dark)]/70 leading-relaxed">{r.description}</p>
              </div>
              <button
                onClick={() => {
                  logVisitor({ type: "visit", page: `/careers/apply/${r.title}` });
                  setApplying({ title: r.title, city: r.city });
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-[color:var(--brand-dark)] text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-dark)] hover:text-white transition-colors whitespace-nowrap active:scale-95"
              >
                Apply <FiArrowRight />
              </button>
            </article>
          ))}
        </div>

        <div className="mt-16 border-t border-[color:var(--brand-dark)]/10 pt-10 text-center">
          <p className="text-[color:var(--brand-dark)]/60">Don't see a fit? We're always open to exceptional people.</p>
          <Link to="/contact" className="mt-4 inline-block text-xs font-bold uppercase tracking-widest border-b border-[color:var(--brand-dark)] pb-1">Say hello</Link>
        </div>
      </section>
      {applying && (
        <CareersApplyModal role={applying.title} city={applying.city} onClose={() => setApplying(null)} />
      )}
      <SiteFooter />
    </div>
  );
}