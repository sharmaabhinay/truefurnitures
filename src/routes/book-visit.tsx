import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { COL, fsList, fsAdd, orderBy } from "@/lib/db/firestore";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/book-visit")({
  head: () => ({
    meta: [
      { title: "Book a Showroom Visit — True Furniture's" },
      { name: "description", content: "Reserve a private appointment at our Indore or Ujjain showroom to feel the fabrics and finalize your bespoke sofa." },
      { property: "og:title", content: "Book a Showroom Visit — True Furniture's" },
      { property: "og:description", content: "Private appointments at our Indore & Ujjain showrooms." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookVisit,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile"),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  showroom_id: z.string().min(1, "Select a showroom"),
  preferred_date: z.string().min(1, "Select a date"),
  preferred_time: z.string().min(1, "Select a time"),
  party_size: z.number().int().min(1).max(10),
  notes: z.string().max(500).optional().or(z.literal("")),
});

const TIMES = ["10:30 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM", "7:30 PM"];

function BookVisit() {
  const { user } = useAuth();
  const { data: showrooms } = useQuery({
    queryKey: ["showrooms-list"],
    queryFn: async () => {
      return fsList<{ id: string; name: string; city: string }>(COL.showrooms, orderBy("sort_order"));
    },
  });

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    showroom_id: "",
    preferred_date: "",
    preferred_time: TIMES[0],
    party_size: 2,
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const minDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const iss of parsed.error.issues) errs[iss.path[0] as string] = iss.message;
      setErrors(errs);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...parsed.data, email: parsed.data.email || null, user_id: user?.uid ?? null };
      await fsAdd(COL.showroomBookings, payload);
      setDone(true);
      toast.success("Booking request received! We'll confirm on WhatsApp shortly.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-4 py-3 bg-white border border-[color:var(--brand-dark)]/15 focus:border-[color:var(--brand-dark)] focus:outline-none text-sm";
  const labelCls = "block text-[10px] font-black uppercase tracking-widest mb-2";

  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)] flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 md:px-10 py-12 md:py-16">
        <span className="tf-chip mb-4">Private Appointment</span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-display mt-4 mb-3 text-balance">Book a showroom visit.</h1>
        <p className="text-[color:var(--brand-dark)]/60 mb-10">Feel the boucle, sit on every frame, meet our designers. Complimentary chai on arrival.</p>

        {done ? (
          <div className="bg-white border border-[color:var(--brand-dark)]/10 p-10 text-center animate-fade-up">
            <div className="size-14 rounded-full bg-[color:var(--brand-accent)]/15 mx-auto grid place-items-center mb-4">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[color:var(--brand-accent)]"><path d="M5 12l5 5L20 7"/></svg>
            </div>
            <h2 className="font-display text-2xl mb-2">Request received</h2>
            <p className="text-sm text-[color:var(--brand-dark)]/60">Our concierge will call to confirm within 2 business hours.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="bg-white border border-[color:var(--brand-dark)]/10 p-6 sm:p-8 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Full name</label>
              <input className={inputCls} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              {errors.full_name && <p className="text-xs text-red-600 mt-1">{errors.full_name}</p>}
            </div>
            <div>
              <label className={labelCls}>Mobile</label>
              <input inputMode="numeric" maxLength={10} className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} />
              {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className={labelCls}>Email (optional)</label>
              <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Showroom</label>
              <select className={inputCls} value={form.showroom_id} onChange={(e) => setForm({ ...form, showroom_id: e.target.value })}>
                <option value="">Select a showroom</option>
                {(showrooms ?? []).map((s: { id: string; name: string; city: string }) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.city}</option>
                ))}
              </select>
              {errors.showroom_id && <p className="text-xs text-red-600 mt-1">{errors.showroom_id}</p>}
            </div>
            <div>
              <label className={labelCls}>Party size</label>
              <input type="number" min={1} max={10} className={inputCls} value={form.party_size} onChange={(e) => setForm({ ...form, party_size: Number(e.target.value) || 1 })} />
            </div>
            <div>
              <label className={labelCls}>Preferred date</label>
              <input type="date" min={minDate} className={inputCls} value={form.preferred_date} onChange={(e) => setForm({ ...form, preferred_date: e.target.value })} />
              {errors.preferred_date && <p className="text-xs text-red-600 mt-1">{errors.preferred_date}</p>}
            </div>
            <div>
              <label className={labelCls}>Preferred time</label>
              <select className={inputCls} value={form.preferred_time} onChange={(e) => setForm({ ...form, preferred_time: e.target.value })}>
                {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Notes (optional)</label>
              <textarea rows={3} className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Style you love, colours you're considering, accessibility needs…" />
            </div>
            <button disabled={submitting} type="submit" className="sm:col-span-2 mt-2 w-full px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors disabled:opacity-60">
              {submitting ? "Sending…" : "Request Appointment"}
            </button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
