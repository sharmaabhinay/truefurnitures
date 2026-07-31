import { useEffect, useState } from "react";
import { COL, fsAdd, fsFindOne, where } from "@/lib/db/firestore";

const KEY = "tf_welcome_v1";

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [city, setCity] = useState<"Indore" | "Ujjain" | "Other">("Indore");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(KEY)) return;
    const t = setTimeout(() => setOpen(true), 1800);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    localStorage.setItem(KEY, "1");
    setOpen(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const code = "TF5-WELCOME";
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const existing = await fsFindOne(COL.newsletterSubscribers, where("email", "==", normalizedEmail));
      if (!existing) {
        await fsAdd(COL.newsletterSubscribers, {
          email: normalizedEmail,
          city,
          source: "welcome_popup",
          discount_code: code,
        });
      }
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Something went wrong");
      return;
    }
    localStorage.setItem("tf_location", city);
    localStorage.setItem("tf_discount", code);
    setStatus("done");
    setMessage(code);
    setTimeout(dismiss, 3000);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in-slow">
      <div className="absolute inset-0 bg-[color:var(--brand-dark)]/60 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative w-full max-w-lg bg-[color:var(--brand-cream)] p-6 sm:p-10 animate-scale-in">
        <button aria-label="Close" onClick={dismiss} className="absolute top-3 right-3 p-2 text-[color:var(--brand-dark)]/50 hover:text-[color:var(--brand-dark)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
        {status === "done" ? (
          <div className="text-center py-4">
            <div className="tf-chip mb-6 mx-auto">Welcome Aboard</div>
            <h2 className="font-display text-3xl sm:text-4xl mb-3">Your code is ready.</h2>
            <p className="text-[color:var(--brand-dark)]/60 mb-6 text-sm">Use this at checkout for 5% off your first order.</p>
            <div className="inline-block border-2 border-dashed border-[color:var(--brand-accent)] px-8 py-4 font-mono text-lg tracking-widest">{message}</div>
          </div>
        ) : (
          <>
            <div className="tf-chip mb-6">Welcome to the Atelier</div>
            <h2 className="font-display text-3xl sm:text-4xl mb-3 text-balance">
              <span className="italic">5% off</span> your first bespoke sofa.
            </h2>
            <p className="text-[color:var(--brand-dark)]/60 mb-6 text-sm sm:text-base">
              Join our list for early access to new collections, private showroom invitations, and a welcome discount reserved for first-time clients in Indore &amp; Ujjain.
            </p>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest block mb-2">Email</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border-b border-[color:var(--brand-dark)]/20 pb-2 focus:outline-none focus:border-[color:var(--brand-accent)] bg-transparent text-base"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest block mb-2">Nearest City</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Indore", "Ujjain", "Other"] as const).map((c) => (
                    <button type="button" key={c} onClick={() => setCity(c)}
                      className={`py-3 text-[10px] font-bold uppercase tracking-widest border transition-colors ${city === c ? "bg-[color:var(--brand-dark)] text-white border-[color:var(--brand-dark)]" : "border-[color:var(--brand-dark)]/20 hover:border-[color:var(--brand-dark)]"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              {status === "error" && <p className="text-xs text-red-600">{message}</p>}
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full mt-2 px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors disabled:opacity-60"
              >
                {status === "loading" ? "Sending…" : "Claim 5% Discount"}
              </button>
              <button type="button" onClick={dismiss} className="w-full text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/50 hover:text-[color:var(--brand-dark)] pt-2">
                No thanks
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}