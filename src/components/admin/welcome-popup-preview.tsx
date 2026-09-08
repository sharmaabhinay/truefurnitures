import type { WelcomePopup } from "@/lib/brand";

/**
 * Non-interactive replica of the storefront welcome popup so admins can see
 * exactly how their copy, discount badge and city prompt will look before saving.
 */
export function WelcomePopupPreview({ popup }: { popup: WelcomePopup }) {
  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #2A2A38" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] font-semibold" style={{ color: "#E8E8F0" }}>Live preview</div>
        <div className="text-[11px]" style={{ color: popup.enabled ? "#6BC8B4" : "#888899" }}>
          {popup.enabled ? "Visible to visitors" : "Currently hidden"}
        </div>
      </div>

      <div className="rounded-md overflow-hidden" style={{ background: "rgba(16,16,20,0.6)", padding: 18 }}>
        <div
          className="mx-auto w-full max-w-md p-6 sm:p-8 relative"
          style={{ background: "var(--brand-cream, #F7F3EC)", color: "var(--brand-dark, #1a1a1a)" }}
        >
          <span
            className="absolute top-3 right-3 text-[14px]"
            style={{ color: "rgba(26,26,26,0.4)" }}
            aria-hidden
          >
            ✕
          </span>
          <div className="tf-chip mb-4 inline-block">{popup.badge || "Badge"}</div>
          <h3 className="font-display text-2xl sm:text-3xl mb-2 text-balance">
            <span className="italic">{popup.italic}</span> {popup.title}
          </h3>
          <p className="text-sm mb-4" style={{ color: "rgba(26,26,26,0.6)" }}>{popup.body}</p>

          <div className="mb-3">
            <div className="text-[10px] font-black uppercase tracking-widest mb-1">Email</div>
            <div className="border-b pb-1 text-sm" style={{ borderColor: "rgba(26,26,26,0.2)", color: "rgba(26,26,26,0.4)" }}>
              you@example.com
            </div>
          </div>

          {popup.ask_city && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest">Nearest City</span>
                {popup.ask_location && (
                  <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--brand-accent, #C8A86B)" }}>
                    Detected · Indore
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["Indore", "Ujjain", "Other"].map((c, i) => (
                  <div
                    key={c}
                    className="py-2 text-center text-[10px] font-bold uppercase tracking-widest border"
                    style={
                      i === 0
                        ? { background: "var(--brand-dark, #1a1a1a)", color: "#fff", borderColor: "var(--brand-dark, #1a1a1a)" }
                        : { borderColor: "rgba(26,26,26,0.2)" }
                    }
                  >
                    {c}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            className="w-full mt-2 px-6 py-3 text-center text-xs font-bold uppercase tracking-widest"
            style={{ background: "var(--brand-dark, #1a1a1a)", color: "#fff" }}
          >
            {popup.cta || "Subscribe"}
          </div>
          <div className="text-center text-[10px] font-bold uppercase tracking-widest pt-2" style={{ color: "rgba(26,26,26,0.5)" }}>
            No thanks
          </div>
        </div>

        <div className="mt-4 text-center">
          <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "#888899" }}>
            Discount badge shown after subscribing
          </div>
          <div
            className="inline-block px-6 py-3 font-mono text-sm tracking-widest"
            style={{
              background: "var(--brand-cream, #F7F3EC)",
              color: "var(--brand-dark, #1a1a1a)",
              border: "2px dashed var(--brand-accent, #C8A86B)",
            }}
          >
            {(popup.discount_code || "CODE").toUpperCase()} · {Number(popup.discount_percent) || 0}% OFF
          </div>
        </div>
      </div>

      <div className="mt-3 text-[11px]" style={{ color: "#888899" }}>
        Appears after {Math.max(0, Number(popup.delay_seconds) || 0)}s
        {popup.reshow_after_days > 0
          ? ` · shows again after ${popup.reshow_after_days} day${popup.reshow_after_days === 1 ? "" : "s"}`
          : " · never shown again once dismissed"}
      </div>
    </div>
  );
}
