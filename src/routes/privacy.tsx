import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — True Furniture's" },
      { name: "description", content: "How True Furniture's collects, uses, and protects the personal information of our customers in Indore, Ujjain, and across India." },
      { property: "og:title", content: "Privacy Policy — True Furniture's" },
      { property: "og:description", content: "How True Furniture's handles your personal information." },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)] flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 md:px-10 py-16 sm:py-24">
        <span className="tf-chip">Privacy Policy</span>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-display mt-4 mb-4">Your data, respected.</h1>
        <p className="text-[color:var(--brand-dark)]/50 text-sm mb-12">Last updated: January 2026</p>

        <div className="prose space-y-8 text-[color:var(--brand-dark)]/80 leading-relaxed">
          <section>
            <h2 className="font-display text-2xl mb-3">1. What we collect</h2>
            <p>When you browse truefurnitures.in, book a showroom visit, subscribe to our newsletter, or place an order, we collect: your name, email, phone number, city, delivery address, order details, and design preferences. We also collect anonymised usage data (page views, device type) to improve the site.</p>
          </section>
          <section>
            <h2 className="font-display text-2xl mb-3">2. How we use it</h2>
            <p>We use your information only to: fulfil your order, arrange delivery and after-sales service, personalise your design consultations, and — with your consent — send occasional updates about new collections. We never sell your data.</p>
          </section>
          <section>
            <h2 className="font-display text-2xl mb-3">3. Who we share with</h2>
            <p>Only trusted partners essential to fulfilling your order: our delivery partners in Indore &amp; Ujjain, and our payment processor (Razorpay). Each is contractually bound to protect your information.</p>
          </section>
          <section>
            <h2 className="font-display text-2xl mb-3">4. Your rights</h2>
            <p>You can request access, correction, or deletion of your personal data at any time by writing to <a className="underline" href="mailto:privacy@truefurnitures.in">privacy@truefurnitures.in</a>. You can unsubscribe from marketing emails via the link at the bottom of any message.</p>
          </section>
          <section>
            <h2 className="font-display text-2xl mb-3">5. Cookies</h2>
            <p>We use essential cookies to keep you signed in and a small number of analytics cookies to understand which collections resonate. No advertising or cross-site tracking cookies are used.</p>
          </section>
          <section>
            <h2 className="font-display text-2xl mb-3">6. Contact</h2>
            <p>True Furniture's · Scheme No. 54, Vijay Nagar, Indore 452010 · <a className="underline" href="mailto:privacy@truefurnitures.in">privacy@truefurnitures.in</a></p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}