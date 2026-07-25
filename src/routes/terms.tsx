import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — True Furniture's" },
      { name: "description", content: "Terms governing purchases, deposits, delivery, and warranty for orders placed with True Furniture's." },
      { property: "og:title", content: "Terms of Service — True Furniture's" },
      { property: "og:description", content: "Our terms for orders, deposits, and delivery." },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: Terms,
});

function Terms() {
  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)] flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 md:px-10 py-16 sm:py-24">
        <span className="tf-chip">Terms of Service</span>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-display mt-4 mb-4">Plain-English terms.</h1>
        <p className="text-[color:var(--brand-dark)]/50 text-sm mb-12">Last updated: January 2026</p>
        <div className="space-y-8 text-[color:var(--brand-dark)]/80 leading-relaxed">
          <section><h2 className="font-display text-2xl mb-3">1. Orders &amp; Deposits</h2><p>All bespoke orders require a 20% booking deposit. The balance is due before delivery. Deposits are non-refundable once production begins (typically 5 business days after order confirmation), because your piece is being built to your exact specifications.</p></section>
          <section><h2 className="font-display text-2xl mb-3">2. Delivery</h2><p>We offer free white-glove delivery within Indore &amp; Ujjain municipal limits. Outside these areas, delivery is quoted separately. Estimated delivery windows are shared at the time of order and honoured to within 5 business days barring unforeseen delays.</p></section>
          <section><h2 className="font-display text-2xl mb-3">3. Warranty</h2><p>We warrant the frame of every sofa for 5–10 years depending on the model, and the upholstery for 12 months against manufacturing defects. Normal wear, misuse, and accidental damage are not covered. Warranty claims are honoured at either showroom.</p></section>
          <section><h2 className="font-display text-2xl mb-3">4. Customisation limits</h2><p>Every sofa is customisable in fabric, colour, size and add-ons. Some structural changes may be declined on quality grounds — we will always explain why and offer an alternative.</p></section>
          <section><h2 className="font-display text-2xl mb-3">5. Cancellations</h2><p>Cancel within 48 hours of placing the order for a full refund. After production starts, deposits become non-refundable but can be transferred to another piece in our catalog within 90 days.</p></section>
          <section><h2 className="font-display text-2xl mb-3">6. Jurisdiction</h2><p>These terms are governed by the laws of India. Disputes fall under the exclusive jurisdiction of the courts of Indore, Madhya Pradesh.</p></section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}