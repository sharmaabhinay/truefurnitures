import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/format";
import { COL, fsFindOne, where } from "@/lib/db/firestore";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { CouponCelebration } from "@/components/coupon-celebration";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — True Furniture's" },
      { name: "description", content: "Review your customized sofa selections before checkout." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Your Cart — True Furniture's" },
      { property: "og:description", content: "Review your customized sofa selections before checkout." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, remove, setQty, subtotal, discount, total, count, coupon, applyCoupon, removeCoupon } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const deposit = Math.round(total * 0.2);
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const applyCode = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setChecking(true);
    try {
      type CouponDoc = { code: string; discount_type: "percent" | "flat"; discount_value: number; min_order_amount: number; active: boolean; valid_until: string | null };
      // Rules only expose active coupons to shoppers, so the query must say so.
      const data = await fsFindOne<CouponDoc>(COL.coupons, where("active", "==", true), where("code", "==", c));
      if (!data || !data.active) return toast.error("Invalid or inactive coupon");
      if (data.valid_until && new Date(data.valid_until) < new Date()) return toast.error("This coupon has expired");
      if (subtotal < Number(data.min_order_amount)) return toast.error(`Minimum order ${formatINR(Number(data.min_order_amount))} required`);
      applyCoupon({ code: data.code, discount_type: data.discount_type, discount_value: Number(data.discount_value), min_order_amount: Number(data.min_order_amount) });
      toast.success(`Coupon ${data.code} applied!`);
      setCode("");
      setCelebrate(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not apply");
    } finally { setChecking(false); }
  };

  const onCheckout = async () => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/checkout" } as never });
      return;
    }
    navigate({ to: "/checkout" });
  };

  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)]">
      <SiteHeader />
      {celebrate && coupon && (
        <CouponCelebration code={coupon.code} amount={formatINR(discount)} onDone={() => setCelebrate(false)} />
      )}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-10 md:py-16">
        <span className="tf-chip mb-4">Your Selection</span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-display mb-8 text-balance">Your Cart</h1>

        {items.length === 0 ? (
          <div className="border border-[color:var(--brand-dark)]/10 p-10 sm:p-16 text-center bg-white">
            <p className="text-lg mb-6 text-[color:var(--brand-dark)]/70">Your cart is empty.</p>
            <Link to="/collections" className="inline-block px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors">
              Browse Collections
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              {items.map((i) => (
                <div key={i.id} className="flex gap-4 sm:gap-6 bg-white border border-[color:var(--brand-dark)]/10 p-4 sm:p-5">
                  <Link to="/products/$slug" params={{ slug: i.slug }} className="shrink-0 size-24 sm:size-32 bg-[color:var(--brand-muted)] overflow-hidden">
                    <img src={i.image} alt={i.name} className="w-full h-full object-cover" />
                  </Link>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to="/products/$slug" params={{ slug: i.slug }} className="font-display text-lg sm:text-xl block truncate hover:text-[color:var(--brand-accent)]">
                          {i.name}
                        </Link>
                        <div className="text-xs text-[color:var(--brand-dark)]/60 mt-1 space-y-0.5">
                          <p className="capitalize">Fabric · {i.fabric}</p>
                          {i.size && <p>Size · {i.size}</p>}
                          {i.color && (
                            <p className="flex items-center gap-1.5">
                              Color · {i.color}
                              {i.colorHex && <span className="inline-block size-3 rounded-full border border-[color:var(--brand-dark)]/20" style={{ backgroundColor: i.colorHex }} />}
                            </p>
                          )}
                          {i.addons && i.addons.length > 0 && <p>Add-ons · {i.addons.join(", ")}</p>}
                        </div>
                      </div>
                      <button onClick={() => remove(i.id)} aria-label="Remove" className="text-[color:var(--brand-dark)]/40 hover:text-[color:var(--brand-accent)] p-1">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 6l12 12M18 6L6 18"/></svg>
                      </button>
                    </div>
                    <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                      <div className="inline-flex items-center border border-[color:var(--brand-dark)]/15">
                        <button onClick={() => setQty(i.id, i.quantity - 1)} className="px-3 py-1.5 text-base hover:bg-[color:var(--brand-muted)]" aria-label="Decrease">−</button>
                        <span className="px-4 py-1.5 text-sm min-w-[2rem] text-center">{i.quantity}</span>
                        <button onClick={() => setQty(i.id, i.quantity + 1)} className="px-3 py-1.5 text-base hover:bg-[color:var(--brand-muted)]" aria-label="Increase">+</button>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-lg">{formatINR(i.unitPrice * i.quantity)}</div>
                        <div className="text-[10px] uppercase tracking-widest text-[color:var(--brand-dark)]/50">{formatINR(i.unitPrice)} each</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <aside className="bg-white border border-[color:var(--brand-dark)]/10 p-6 h-fit lg:sticky lg:top-24">
              <h2 className="font-display text-xl mb-6">Order Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-[color:var(--brand-dark)]/60">Items ({count})</span><span>{formatINR(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-[color:var(--brand-dark)]/60">Delivery (Indore / Ujjain)</span><span>Free</span></div>
                {coupon && (
                  <div className="relative flex justify-between items-center text-[color:var(--brand-accent)] animate-pop">
                    {celebrate && (
                      <span className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
                        {Array.from({ length: 14 }).map((_, i) => (
                          <span
                            key={i}
                            className="tf-confetti"
                            style={{
                              left: `${(i * 7) % 100}%`,
                              background: ["var(--brand-accent)", "var(--brand-dark)", "#4CAF82", "#E0A050"][i % 4],
                              animationDelay: `${i * 45}ms`,
                            }}
                          />
                        ))}
                      </span>
                    )}
                    <span className="flex items-center gap-2 text-xs"><span className="font-mono font-bold">{coupon.code}</span><button onClick={removeCoupon} className="text-[10px] text-[color:var(--brand-dark)]/50 hover:text-red-600">Remove</button></span>
                    <span>− {formatINR(discount)}</span>
                  </div>
                )}
                <div className="border-t border-[color:var(--brand-dark)]/10 pt-3 flex justify-between items-baseline">
                  <span className="text-xs font-bold uppercase tracking-widest">Total</span>
                  <span className="font-display text-2xl">{formatINR(total)}</span>
                </div>
                {!coupon && (
                  <div className="pt-2">
                    <div className="flex gap-2">
                      <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Coupon code" className="flex-1 px-3 py-2 text-xs border border-[color:var(--brand-dark)]/15 focus:border-[color:var(--brand-dark)] focus:outline-none" />
                      <button onClick={applyCode} disabled={checking || !code} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest border border-[color:var(--brand-dark)] hover:bg-[color:var(--brand-dark)] hover:text-white disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">{checking ? "Checking…" : "Apply"}</button>
                    </div>
                    <p className="text-[10px] text-[color:var(--brand-dark)]/50 mt-2">Try TF5-WELCOME for 5% off orders over ₹20,000.</p>
                  </div>
                )}
                <div className="bg-[color:var(--brand-muted)]/60 p-3 mt-3">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold uppercase tracking-widest">Deposit today (20%)</span>
                    <span className="font-display text-base">{formatINR(deposit)}</span>
                  </div>
                  <p className="text-[10px] text-[color:var(--brand-dark)]/60 mt-1">Balance {formatINR(total - deposit)} due on delivery.</p>
                </div>
              </div>
              <button onClick={onCheckout} className="mt-6 w-full px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors">
                Continue to Checkout
              </button>
              <Link to="/collections" className="mt-3 block text-center text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/60 hover:text-[color:var(--brand-accent)]">
                ← Continue Shopping
              </Link>
            </aside>
          </div>
        )}

        {/* Payment options */}
        <section className="mt-16 border-t border-[color:var(--brand-dark)]/10 pt-12">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <span className="tf-chip mb-2">Secure Payments</span>
              <h2 className="text-2xl sm:text-3xl font-display mt-3 text-balance">Every payment method you use — accepted.</h2>
              <p className="text-sm text-[color:var(--brand-dark)]/60 mt-2 max-w-xl">Pay 20% deposit online now, balance on delivery. Choose UPI, cards, netbanking, wallets or cash-on-delivery in Indore &amp; Ujjain.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { name: "UPI", sub: "GPay · PhonePe · Paytm" },
              { name: "Cards", sub: "Visa · Master · Rupay" },
              { name: "Netbanking", sub: "All major banks" },
              { name: "Wallets", sub: "Paytm · Amazon Pay" },
              { name: "EMI", sub: "No-cost 3/6/9 mo" },
              { name: "Cash on Delivery", sub: "Indore &amp; Ujjain" },
            ].map((p) => (
              <div key={p.name} className="bg-white border border-[color:var(--brand-dark)]/10 p-4 text-center hover-lift">
                <div className="text-xs font-bold uppercase tracking-widest">{p.name}</div>
                <div className="text-[10px] text-[color:var(--brand-dark)]/50 mt-1" dangerouslySetInnerHTML={{ __html: p.sub }} />
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/50">
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z"/></svg>
              256-bit SSL Secured
            </span>
            <span>·</span>
            <span>PCI-DSS Compliant Gateway</span>
            <span>·</span>
            <a href="https://wa.me/917773896496" className="hover:text-[color:var(--brand-accent)]">Need help? WhatsApp +91 77738 96496</a>
          </div>
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}