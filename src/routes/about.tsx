import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "The Atelier — Avant-Garde" },
      { name: "description", content: "The story behind Avant-Garde Atelier — a bespoke custom sofa house serving Indore, Ujjain and the discerning homes of Madhya Pradesh." },
      { property: "og:title", content: "The Atelier — Avant-Garde" },
      { property: "og:description", content: "Bespoke custom sofas, hand-tailored in Central India." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)]">
      <SiteHeader />
      <section className="px-6 md:px-10 py-20 md:py-28 max-w-4xl mx-auto">
        <span className="text-[color:var(--brand-accent)] font-semibold tracking-[0.3em] uppercase text-xs">The Atelier</span>
        <h1 className="text-5xl md:text-7xl font-display mt-6 leading-[0.95]">
          A house of <span className="italic">quiet craft.</span>
        </h1>
        <div className="mt-12 space-y-8 text-lg font-light leading-relaxed text-[color:var(--brand-dark)]/75 max-w-2xl">
          <p>Avant-Garde Atelier began in a small workshop on the edge of Indore in 2018 — a single carpenter, one leather cutter, and a stubborn refusal to make anything ordinary.</p>
          <p>Today, our sofas live in some of the most considered homes of Madhya Pradesh. Every piece is still hand-built to order. Nothing sits on a shelf; nothing is mass-produced. Only what you asked for, exactly as you asked for it.</p>
          <p>We work with a shortlist of Belgian linens, Italian leathers, and hand-loomed Indian cottons. Every frame is kiln-dried teak. Every stitch is checked twice.</p>
        </div>
        <div className="mt-16 grid sm:grid-cols-3 gap-8 border-t border-[color:var(--brand-dark)]/10 pt-12">
          <div><p className="text-4xl font-display">2018</p><p className="text-[10px] uppercase tracking-widest text-[color:var(--brand-dark)]/50 mt-2">Founded in Indore</p></div>
          <div><p className="text-4xl font-display">1200+</p><p className="text-[10px] uppercase tracking-widest text-[color:var(--brand-dark)]/50 mt-2">Bespoke pieces delivered</p></div>
          <div><p className="text-4xl font-display">14 days</p><p className="text-[10px] uppercase tracking-widest text-[color:var(--brand-dark)]/50 mt-2">Typical build time</p></div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}