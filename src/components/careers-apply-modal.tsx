import { useState } from "react";
import { toast } from "sonner";
import { FiX, FiSend } from "react-icons/fi";
import { COL, fsAdd } from "@/lib/db/firestore";

/** Public application form for an open role. */
export function CareersApplyModal({ role, city, onClose }: { role: string; city: string; onClose: () => void }) {
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", experience: "", portfolio: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !(form.email.trim() || form.phone.trim())) {
      toast.error("Name plus an email or phone are required");
      return;
    }
    setSaving(true);
    try {
      await fsAdd(COL.careerApplications, {
        role,
        city,
        status: "new",
        full_name: form.full_name.trim().slice(0, 120),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        experience: form.experience.trim() || null,
        portfolio: form.portfolio.trim() || null,
        note: form.note.trim() || null,
        source: "careers_page",
      });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full px-3 py-2.5 border border-[color:var(--brand-dark)]/15 bg-white text-sm focus:outline-none focus:border-[color:var(--brand-dark)] transition-colors";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-fade-in-slow">
      <div className="absolute inset-0 bg-[color:var(--brand-dark)]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[color:var(--brand-cream)] p-6 sm:p-8 animate-scale-in max-h-[90vh] overflow-y-auto">
        <button aria-label="Close" onClick={onClose} className="absolute top-3 right-3 p-2 text-[color:var(--brand-dark)]/50 hover:text-[color:var(--brand-dark)] active:scale-90 transition">
          <FiX size={18} />
        </button>
        {done ? (
          <div className="py-10 text-center animate-fade-up">
            <h2 className="font-display text-2xl mb-2">Application received</h2>
            <p className="text-sm text-[color:var(--brand-dark)]/70">Our team reviews every application within 3 working days.</p>
            <button onClick={onClose} className="mt-6 px-6 py-3 bg-[color:var(--brand-dark)] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors">Close</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <span className="tf-chip">{city}</span>
            <h2 className="font-display text-2xl pt-2">Apply — {role}</h2>
            <p className="text-xs text-[color:var(--brand-dark)]/60 pb-2">We reply to every applicant within 3 working days.</p>
            <input className={input} placeholder="Full name*" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
            <div className="grid sm:grid-cols-2 gap-3">
              <input className={input} placeholder="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              <input className={input} placeholder="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input className={input} placeholder="Years of experience" value={form.experience} onChange={(e) => set("experience", e.target.value)} />
              <input className={input} placeholder="Portfolio / LinkedIn URL" value={form.portfolio} onChange={(e) => set("portfolio", e.target.value)} />
            </div>
            <textarea className={`${input} min-h-24`} placeholder="Why you're a fit" value={form.note} onChange={(e) => set("note", e.target.value)} />
            <button
              type="submit"
              disabled={saving}
              className="w-full px-6 py-3.5 bg-[color:var(--brand-dark)] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] disabled:opacity-60 transition-colors flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <FiSend /> {saving ? "Sending…" : "Submit application"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
