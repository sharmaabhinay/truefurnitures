import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { COL, fsAdd, fsGet } from "@/lib/db/firestore";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/hire-carpenter")({
  head: () => ({
    meta: [
      { title: "Hire a Carpenter in Indore & Ujjain — True Furniture's" },
      {
        name: "description",
        content:
          "Book a skilled True Furniture's carpenter to work at your home in Indore or Ujjain — repairs, custom builds, upholstery and on-site fittings.",
      },
      { property: "og:title", content: "Hire a Carpenter — True Furniture's" },
      { property: "og:description", content: "Skilled carpenters at your doorstep in Indore & Ujjain for repairs, custom builds and fittings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HireCarpenter,
});

const WORK_TYPES = [
  "Sofa repair / re-upholstery",
  "Custom furniture at home",
  "Modular / wardrobe fitting",
  "Polishing & finishing",
  "Furniture assembly / dismantling",
  "Other carpentry work",
] as const;

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile"),
  email: z.string().trim().email("Enter a valid email").max(160).optional().or(z.literal("")),
  city: z.enum(["Indore", "Ujjain"]),
  address_line: z.string().trim().min(6, "Enter the work address").max(240),
  pincode: z.string().trim().regex(/^\d{6}$/, "6-digit pincode").optional().or(z.literal("")),
  work_type: z.string().min(2, "Choose the type of work"),
  preferred_date: z.string().optional().or(z.literal("")),
  duration: z.string().optional().or(z.literal("")),
  budget_range: z.string().optional().or(z.literal("")),
  details: z.string().trim().max(800).optional().or(z.literal("")),
});

type FormState = z.infer<typeof schema>;

function HireCarpenter() {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>({
    full_name: "",
    phone: "",
    email: "",
    city: "Indore",
    address_line: "",
    pincode: "",
    work_type: WORK_TYPES[0],
    preferred_date: "",
    duration: "Half day (up to 4 hrs)",
    budget_range: "₹1,000 – ₹3,000",
    details: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const prof = await fsGet<{ full_name?: string | null; phone?: string | null; email?: string | null; city?: string | null }>(COL.profiles, user.uid);
      if (prof) {
        setForm((s) => ({
          ...s,
          full_name: prof.full_name ?? s.full_name,
          phone: prof.phone?.replace(/\D/g, "").slice(-10) ?? s.phone,
          email: prof.email ?? user.email ?? s.email,
          city: prof.city === "Ujjain" ? "Ujjain" : "Indore",
        }));
      }
    })();
  }, [user]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof FormState;
        if (!errs[k]) errs[k] = issue.message;
      }
      setErrors(errs);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSubmitting(true);
    const d = parsed.data;
    try {
      await fsAdd(COL.carpenterRequests, {
        user_id: user?.uid ?? null,
        full_name: d.full_name,
        phone: d.phone,
        email: d.email || null,
        city: d.city,
        address_line: d.address_line,
        pincode: d.pincode || null,
        work_type: d.work_type,
        preferred_date: d.preferred_date || null,
        duration: d.duration || null,
        budget_range: d.budget_range || null,
        details: d.details || null,
      });
      setDone(true);
      toast.success("Request received — our team will call you shortly.");
    } catch (error) {
      console.error(error);
      toast.error("Could not send your request. Please WhatsApp us instead.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    "w-full px-4 py-3 bg-white border border-[color:var(--brand-dark)]/15 focus:border-[color:var(--brand-dark)] focus:outline-none text-sm";
  const labelCls = "block text-[10px] font-black uppercase tracking-widest mb-2";

  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)]">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-10 md:py-16">
        <span className="tf-chip mb-4">On-site Service</span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-display mt-4 mb-3 text-balance">Hire a Carpenter</h1>
        <p className="text-[color:var(--brand-dark)]/65 max-w-2xl">
          Bring our atelier craftsmen to your home in Indore or Ujjain. Repairs, re-upholstery, fittings or a fully
          custom build made on-site — you decide the scope, we bring the tools.
        </p>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px] mt-10">
          {done ? (
            <section className="bg-white border border-[color:var(--brand-dark)]/10 p-10 text-center animate-fade-up">
              <h2 className="font-display text-2xl mb-3">Request received</h2>
              <p className="text-sm text-[color:var(--brand-dark)]/65 mb-6">
                Our team will call you on {form.phone} within a few working hours to confirm the craftsman and slot.
              </p>
              <Link to="/collections" className="inline-block px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors">
                Browse Collections
              </Link>
            </section>
          ) : (
            <form onSubmit={onSubmit} className="bg-white border border-[color:var(--brand-dark)]/10 p-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="c_name">Full Name</label>
                <input id="c_name" className={inputCls} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
                {errors.full_name && <p className="text-xs text-red-600 mt-1">{errors.full_name}</p>}
              </div>
              <div>
                <label className={labelCls} htmlFor="c_phone">Mobile</label>
                <input id="c_phone" inputMode="numeric" maxLength={10} className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))} placeholder="10-digit" />
                {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
              </div>
              <div>
                <label className={labelCls} htmlFor="c_email">Email (optional)</label>
                <input id="c_email" type="email" className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className={labelCls} htmlFor="c_city">City</label>
                <select id="c_city" className={inputCls} value={form.city} onChange={(e) => set("city", e.target.value as FormState["city"])}>
                  <option value="Indore">Indore</option>
                  <option value="Ujjain">Ujjain</option>
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="c_pin">Pincode</label>
                <input id="c_pin" inputMode="numeric" maxLength={6} className={inputCls} value={form.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))} />
                {errors.pincode && <p className="text-xs text-red-600 mt-1">{errors.pincode}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="c_addr">Work Address</label>
                <textarea id="c_addr" rows={3} className={inputCls} value={form.address_line} onChange={(e) => set("address_line", e.target.value)} placeholder="House / Flat, Street, Area" />
                {errors.address_line && <p className="text-xs text-red-600 mt-1">{errors.address_line}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Type of Work</label>
                <div className="flex flex-wrap gap-2">
                  {WORK_TYPES.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => set("work_type", w)}
                      className={`px-3 py-2 text-[11px] uppercase tracking-widest border transition-all ${form.work_type === w ? "border-[color:var(--brand-dark)] bg-[color:var(--brand-muted)]/60" : "border-[color:var(--brand-dark)]/15 hover:border-[color:var(--brand-dark)]/50"}`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="c_date">Preferred Date</label>
                <input id="c_date" type="date" className={inputCls} value={form.preferred_date} onChange={(e) => set("preferred_date", e.target.value)} />
              </div>
              <div>
                <label className={labelCls} htmlFor="c_dur">Estimated Duration</label>
                <select id="c_dur" className={inputCls} value={form.duration} onChange={(e) => set("duration", e.target.value)}>
                  <option>A couple of hours</option>
                  <option>Half day (up to 4 hrs)</option>
                  <option>Full day</option>
                  <option>Multiple days</option>
                  <option>Not sure yet</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="c_budget">Budget Range</label>
                <select id="c_budget" className={inputCls} value={form.budget_range} onChange={(e) => set("budget_range", e.target.value)}>
                  <option>Under ₹1,000</option>
                  <option>₹1,000 – ₹3,000</option>
                  <option>₹3,000 – ₹10,000</option>
                  <option>₹10,000+</option>
                  <option>Need an estimate</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="c_details">Describe the Work</label>
                <textarea id="c_details" rows={4} className={inputCls} value={form.details} onChange={(e) => set("details", e.target.value)} placeholder="Tell us what needs to be made, repaired or fitted…" />
              </div>
              <button type="submit" disabled={submitting} className="sm:col-span-2 w-full px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors disabled:opacity-60">
                {submitting ? "Sending…" : "Request a Carpenter"}
              </button>
            </form>
          )}

          <aside className="space-y-4 h-fit lg:sticky lg:top-24">
            <div className="bg-white border border-[color:var(--brand-dark)]/10 p-6">
              <h2 className="font-display text-lg mb-3">How it works</h2>
              <ol className="space-y-3 text-sm text-[color:var(--brand-dark)]/70">
                <li><span className="font-bold text-[color:var(--brand-dark)]">1.</span> Share the work, address and a preferred date.</li>
                <li><span className="font-bold text-[color:var(--brand-dark)]">2.</span> We call you with a craftsman, slot and estimate.</li>
                <li><span className="font-bold text-[color:var(--brand-dark)]">3.</span> The carpenter arrives with tools and materials.</li>
                <li><span className="font-bold text-[color:var(--brand-dark)]">4.</span> Pay on completion — no advance for on-site work.</li>
              </ol>
            </div>
            <div className="bg-[color:var(--brand-muted)]/60 border border-[color:var(--brand-dark)]/10 p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--brand-dark)]/50 mb-2">Prefer to talk?</p>
              <a href="https://wa.me/917773896496" target="_blank" rel="noreferrer" className="font-display text-xl hover:text-[color:var(--brand-accent)] transition-colors">
                WhatsApp +91 77738 96496
              </a>
              <p className="text-xs text-[color:var(--brand-dark)]/60 mt-2">Mon–Sat, 10am – 8pm · Indore &amp; Ujjain only.</p>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
