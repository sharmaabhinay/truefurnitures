import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Avant-Garde Atelier" },
      { name: "description", content: "Speak with a design consultant. WhatsApp, email or visit our showrooms in Indore and Ujjain." },
      { property: "og:title", content: "Contact — Avant-Garde Atelier" },
      { property: "og:description", content: "Speak with a design consultant in Indore or Ujjain." },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)]">
      <SiteHeader />
      <section className="px-6 md:px-10 py-20 md:py-28 max-w-5xl mx-auto grid md:grid-cols-2 gap-16">
        <div>
          <span className="text-[color:var(--brand-accent)] font-semibold tracking-[0.3em] uppercase text-xs">Contact</span>
          <h1 className="text-5xl md:text-6xl font-display mt-6 leading-[0.95]">Let&apos;s <span className="italic">talk</span>.</h1>
          <p className="mt-8 text-[color:var(--brand-dark)]/70 font-light leading-relaxed max-w-md">
            Every commission begins with a conversation. Reach us on WhatsApp for the fastest response, or send us the details of your project.
          </p>
          <div className="mt-12 space-y-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2 text-[color:var(--brand-dark)]/40">WhatsApp</p>
              <a href="https://wa.me/917773896496" className="text-lg font-display hover:text-[color:var(--brand-accent)]">+91 77738 96496</a>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2 text-[color:var(--brand-dark)]/40">Phone</p>
              <a href="tel:+917773896496" className="text-lg font-display hover:text-[color:var(--brand-accent)]">+91 77738 96496</a>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2 text-[color:var(--brand-dark)]/40">Email</p>
              <a href="mailto:hello@truefurnitures.in" className="text-lg font-display hover:text-[color:var(--brand-accent)]">hello@truefurnitures.in</a>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2 text-[color:var(--brand-dark)]/40">Studio Hours</p>
              <p className="text-lg font-display">Mon–Sat · 10:00 AM – 8:00 PM</p>
            </div>
          </div>
        </div>
        <form className="bg-white p-8 md:p-10 space-y-5 border border-[color:var(--brand-dark)]/10">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest block mb-2">Your Name</label>
            <input type="text" className="w-full border-b border-[color:var(--brand-dark)]/20 pb-2 focus:outline-none focus:border-[color:var(--brand-accent)] bg-transparent" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest block mb-2">Phone</label>
            <input type="tel" className="w-full border-b border-[color:var(--brand-dark)]/20 pb-2 focus:outline-none focus:border-[color:var(--brand-accent)] bg-transparent" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest block mb-2">Message</label>
            <textarea rows={4} className="w-full border-b border-[color:var(--brand-dark)]/20 pb-2 focus:outline-none focus:border-[color:var(--brand-accent)] bg-transparent resize-none" />
          </div>
          <button type="button" className="w-full mt-4 px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors">
            Request a Consultation
          </button>
          <p className="text-[10px] text-[color:var(--brand-dark)]/40 text-center">Live form submission coming in the next release.</p>
        </form>
      </section>
      <SiteFooter />
    </div>
  );
}