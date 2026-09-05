import { useCallback, useEffect, useRef, useState } from "react";
import { COL, fsAdd } from "@/lib/db/firestore";
import { detectCity, geolocationPermission, rememberCity } from "@/lib/geo";
import { useBrand } from "@/lib/brand";

const KEY = "tf_welcome_v1";

export function WelcomeModal() {
  const popup = useBrand().welcome_popup;
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [city, setCity] = useState<"Indore" | "Ujjain" | "Other">("Indore");
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "detecting" | "done" | "failed">("idle");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!popup.enabled) return;
    // Stored as "<version>:<dismissed-at>" so admins can re-show it by bumping
    // the version or shortening the re-show window.
    const seen = localStorage.getItem(KEY);
    if (seen) {
      const [v, at] = seen.split(":");
      const days = (Date.now() - Number(at || 0)) / 86400000;
      const sameVersion = Number(v) === Number(popup.version);
      if (sameVersion && (popup.reshow_after_days <= 0 || days < popup.reshow_after_days)) return;
    }
    // Never interrupt conversion/checkout/account flows with the discount popup.
    const skipOn = ["/auth", "/checkout", "/payment", "/cart", "/dashboard", "/admin", "/reset-password"];
    if (skipOn.some((p) => window.location.pathname.startsWith(p))) return;
    const t = setTimeout(() => setOpen(true), Math.max(0, popup.delay_seconds) * 1000);
    return () => clearTimeout(t);
  }, [popup]);

  const started = useRef(false);

  const runDetect = useCallback(async () => {
    setGeoState("detecting");
    const found = await detectCity();
    if (found) {
      setDetectedCity(found.city);
      setCity(found.nearest);
      setGeoState("done");
    } else {
      setGeoState("failed");
    }
  }, []);

  // Ask for location once the popup is visible so the browser prompt has context.
  useEffect(() => {
    if (!open || started.current) return;
    if (!popup.ask_location) { setGeoState("failed"); started.current = true; return; }
    started.current = true;
    void (async () => {
      if ((await geolocationPermission()) === "denied") {
        setGeoState("failed");
        return;
      }
      await runDetect();
    })();
  }, [open, runDetect, popup.ask_location]);

  function dismiss() {
    localStorage.setItem(KEY, `${popup.version}:${Date.now()}`);
    setOpen(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const code = popup.discount_code;
    const normalizedEmail = email.trim().toLowerCase();
    try {
      // Subscribers are write-only for the public, so we never read before writing.
      await fsAdd(COL.newsletterSubscribers, {
        email: normalizedEmail,
        city,
        source: "welcome_popup",
        discount_code: code,
      });
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Something went wrong");
      return;
    }
    rememberCity(detectedCity ?? city);
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
            <p className="text-[color:var(--brand-dark)]/60 mb-6 text-sm">Use this at checkout for {popup.discount_percent}% off your first order.</p>
            <div className="inline-block border-2 border-dashed border-[color:var(--brand-accent)] px-8 py-4 font-mono text-lg tracking-widest">{message}</div>
          </div>
        ) : (
          <>
            <div className="tf-chip mb-6">{popup.badge}</div>
            <h2 className="font-display text-3xl sm:text-4xl mb-3 text-balance">
              <span className="italic">{popup.italic}</span> {popup.title}
            </h2>
            <p className="text-[color:var(--brand-dark)]/60 mb-6 text-sm sm:text-base">
              {popup.body}
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
              {popup.ask_city && (
              <div>
                <div className="flex items-center justify-between mb-2 gap-3">
                  <label className="text-[10px] font-black uppercase tracking-widest">Nearest City</label>
                  {geoState === "detecting" && (
                    <span className="text-[10px] uppercase tracking-widest text-[color:var(--brand-dark)]/40">Detecting…</span>
                  )}
                  {geoState === "done" && detectedCity && (
                    <span className="text-[10px] uppercase tracking-widest text-[color:var(--brand-accent)]">Detected · {detectedCity}</span>
                  )}
                  {geoState === "failed" && (
                    <button type="button" onClick={() => void runDetect()} className="text-[10px] uppercase tracking-widest underline text-[color:var(--brand-dark)]/50 hover:text-[color:var(--brand-dark)]">
                      Use my location
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["Indore", "Ujjain", "Other"] as const).map((c) => (
                    <button type="button" key={c} onClick={() => { setCity(c); setDetectedCity(null); }}
                      className={`py-3 text-[10px] font-bold uppercase tracking-widest border transition-colors ${city === c ? "bg-[color:var(--brand-dark)] text-white border-[color:var(--brand-dark)]" : "border-[color:var(--brand-dark)]/20 hover:border-[color:var(--brand-dark)]"}`}>
                      {c}
                    </button>
                  ))}
                </div>
                {geoState === "failed" && (
                  <p className="text-[10px] text-[color:var(--brand-dark)]/40 mt-2">Couldn’t detect your location — please pick your nearest city.</p>
                )}
              </div>
              )}
              {status === "error" && <p className="text-xs text-red-600">{message}</p>}
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full mt-2 px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors disabled:opacity-60"
              >
                {status === "loading" ? "Sending…" : popup.cta}
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