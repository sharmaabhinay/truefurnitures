import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const faqs = [
  { q: "How long does a bespoke sofa take to build?", a: "Typically 28–42 days depending on the model, upholstery, and any custom sizing. You'll see a specific estimated delivery date on each product page and in your order dashboard." },
  { q: "Can I really customize every dimension?", a: "Yes — width, depth, height, arm style, leg style, seat firmness, and fabric are all fully customizable. Some structural changes are subject to our quality team's approval, but 95% of requests are accepted." },
  { q: "Do you deliver outside Indore and Ujjain?", a: "White-glove delivery is complimentary within Indore and Ujjain. We do ship pan-India via trusted furniture logistics partners; delivery charges are quoted per order." },
  { q: "What's the deposit for reserving an order?", a: "A 20% booking deposit confirms your order and locks in materials. The balance is due one week before delivery. You can pay online or at either showroom." },
  { q: "Can I see and feel the fabric before ordering?", a: "Absolutely. Fabric swatch kits are available at both showrooms, or we'll courier a swatch box to your home free of charge within Central India." },
  { q: "What happens if I don't like it when it arrives?", a: "We'll come inspect, adjust, or in rare cases, remake at our cost. Our internal target is a 99%+ acceptance rate on delivery — bespoke shouldn't mean risky." },
  { q: "Do you offer EMI or financing?", a: "Yes — 0% EMI for 6 months is available via Razorpay on all orders above ₹50,000." },
  { q: "How do I care for my new sofa?", a: "Every piece ships with a fabric-specific care card. Bouclé and linen: vacuum monthly with an upholstery brush. Leather: condition every 6 months. Velvet: brush gently in the direction of the pile." },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — True Furniture's" },
      { name: "description", content: "Common questions about ordering, customization, delivery, warranty, and care for True Furniture's bespoke sofas." },
      { property: "og:title", content: "FAQ — True Furniture's" },
      { property: "og:description", content: "Everything you need to know before ordering a bespoke sofa." },
      { property: "og:url", content: "/faq" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }),
    }],
  }),
  component: FAQ,
});

function FAQ() {
  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)] flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 md:px-10 py-16 sm:py-24">
        <span className="tf-chip">Answers</span>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-display mt-4 mb-12 text-balance">Frequently asked, honestly answered.</h1>
        <div className="divide-y divide-[color:var(--brand-dark)]/10 border-t border-b border-[color:var(--brand-dark)]/10">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex justify-between items-start gap-4 cursor-pointer list-none">
                <span className="font-display text-lg sm:text-xl pr-4 flex-1 min-w-0">{f.q}</span>
                <span className="shrink-0 mt-1 size-6 grid place-items-center rounded-full border border-[color:var(--brand-dark)]/20 text-[color:var(--brand-dark)]/60 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-[color:var(--brand-dark)]/70 mt-3 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}