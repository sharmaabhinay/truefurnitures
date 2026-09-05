import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { COL, fsAdd } from "@/lib/db/firestore";

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
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", message: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) return toast.error("Please add your name");
    if (!/^[0-9+\-\s]{8,20}$/.test(form.phone.trim())) return toast.error("Please add a valid phone number");
    setSaving(true);
    try {
      const now = new Date();
      await fsAdd(COL.showroomBookings, {
        status: "pending",
        source: "contact_form",
        full_name: form.full_name.trim().slice(0, 120),
        phone: form.phone.trim().slice(0, 20),
        email: form.email.trim().slice(0, 200) || null,
        notes: form.message.trim().slice(0, 2000) || null,
        party_size: 1,
        showroom_id: null,
        preferred_date: now.toISOString().slice(0, 10),
        preferred_time: now.toTimeString().slice(0, 5),
      });
      setDone(true);
      setForm({ full_name: "", phone: "", email: "", message: "" });
      toast.success("Request sent — our team will call you shortly");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send your request");
    } finally {
      setSaving(false);
    }
  };

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
        {done ? (
          <div className="bg-white p-8 md:p-10 border border-[color:var(--brand-dark)]/10 flex flex-col items-center justify-center text-center animate-fade-up">
            <h2 className="font-display text-3xl">Thank you</h2>
            <p className="mt-3 text-sm text-[color:var(--brand-dark)]/70">Your consultation request has reached our design team. We usually reply within a few hours.</p>
            <button onClick={() => setDone(false)} className="mt-8 px-6 py-3 border border-[color:var(--brand-dark)]/20 text-[10px] font-bold uppercase tracking-widest hover:bg-[color:var(--brand-dark)] hover:text-white transition-colors cursor-pointer">
              Send another request
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-white p-8 md:p-10 space-y-5 border border-[color:var(--brand-dark)]/10">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest block mb-2">Your Name</label>
              <input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} maxLength={120} type="text" className="w-full border-b border-[color:var(--brand-dark)]/20 pb-2 focus:outline-none focus:border-[color:var(--brand-accent)] bg-transparent" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest block mb-2">Phone</label>
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={20} type="tel" className="w-full border-b border-[color:var(--brand-dark)]/20 pb-2 focus:outline-none focus:border-[color:var(--brand-accent)] bg-transparent" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest block mb-2">Email (optional)</label>
              <input value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={200} type="email" className="w-full border-b border-[color:var(--brand-dark)]/20 pb-2 focus:outline-none focus:border-[color:var(--brand-accent)] bg-transparent" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest block mb-2">Message</label>
              <textarea value={form.message} onChange={(e) => set("message", e.target.value)} maxLength={2000} rows={4} className="w-full border-b border-[color:var(--brand-dark)]/20 pb-2 focus:outline-none focus:border-[color:var(--brand-accent)] bg-transparent resize-none" />
            </div>
            <button type="submit" disabled={saving} className="w-full mt-4 px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] disabled:opacity-60 transition-colors cursor-pointer active:scale-[0.99]">
              {saving ? "Sending…" : "Request a Consultation"}
            </button>
            <p className="text-[10px] text-[color:var(--brand-dark)]/40 text-center">We reply on WhatsApp or phone, usually within a few hours.</p>
          </form>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
