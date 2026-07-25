import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const roles = [
  { title: "Master Upholsterer", city: "Indore", type: "Full-time", desc: "Hand-cut, hand-stitch and hand-finish premium fabrics for our signature collections. 5+ years experience on high-end upholstery." },
  { title: "3D Design Consultant", city: "Indore & Ujjain", type: "Full-time", desc: "Walk clients through our 3D configurator in-showroom. Design background preferred; hospitality mindset essential." },
  { title: "Delivery & Installation Lead", city: "Ujjain", type: "Full-time", desc: "Own the last-mile white-glove experience for every Ujjain delivery. Team of 2, growing to 4." },
  { title: "Content & Community Lead", city: "Remote (India)", type: "Full-time", desc: "Own our journal, Instagram and email programme. Strong writer with a taste for interiors." },
];

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
            <article key={r.title} className="border border-[color:var(--brand-dark)]/10 p-6 sm:p-8 grid sm:grid-cols-[1fr_auto] gap-6 items-center hover-lift bg-white">
              <div className="min-w-0">
                <h2 className="font-display text-2xl mb-2">{r.title}</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-accent)] mb-3">{r.city} · {r.type}</p>
                <p className="text-sm text-[color:var(--brand-dark)]/70 leading-relaxed">{r.desc}</p>
              </div>
              <a href={`mailto:careers@truefurnitures.in?subject=${encodeURIComponent(r.title)}`} className="text-center px-6 py-3 border border-[color:var(--brand-dark)] text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-dark)] hover:text-white transition-colors whitespace-nowrap">
                Apply
              </a>
            </article>
          ))}
        </div>

        <div className="mt-16 border-t border-[color:var(--brand-dark)]/10 pt-10 text-center">
          <p className="text-[color:var(--brand-dark)]/60">Don't see a fit? We're always open to exceptional people.</p>
          <Link to="/contact" className="mt-4 inline-block text-xs font-bold uppercase tracking-widest border-b border-[color:var(--brand-dark)] pb-1">Say hello</Link>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}