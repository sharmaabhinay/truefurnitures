import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

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
  const { items, remove, setQty, subtotal, count } = useCart();
  const navigate = useNavigate();
  const deposit = Math.round(subtotal * 0.2);

  const onCheckout = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      navigate({ to: "/auth", search: { redirect: "/checkout" } as never });
      return;
    }
    navigate({ to: "/checkout" });
  };

  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)]">
      <SiteHeader />
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
                        <p className="text-xs text-[color:var(--brand-dark)]/60 mt-1 capitalize">Fabric · {i.fabric}</p>
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
                <div className="border-t border-[color:var(--brand-dark)]/10 pt-3 flex justify-between items-baseline">
                  <span className="text-xs font-bold uppercase tracking-widest">Total</span>
                  <span className="font-display text-2xl">{formatINR(subtotal)}</span>
                </div>
                <div className="bg-[color:var(--brand-muted)]/60 p-3 mt-3">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold uppercase tracking-widest">Deposit today (20%)</span>
                    <span className="font-display text-base">{formatINR(deposit)}</span>
                  </div>
                  <p className="text-[10px] text-[color:var(--brand-dark)]/60 mt-1">Balance {formatINR(subtotal - deposit)} due on delivery.</p>
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
      </div>
      <SiteFooter />
    </div>
  );
}