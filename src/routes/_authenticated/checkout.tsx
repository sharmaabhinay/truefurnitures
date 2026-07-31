import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { formatINR, estimatedDelivery } from "@/lib/format";
import { toast } from "sonner";
import { PaymentMethods } from "@/components/payment-methods";
import { PhoneVerify } from "@/components/phone-verify";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — True Furniture's" },
      { name: "description", content: "Confirm your delivery details and place your bespoke sofa order." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Checkout — True Furniture's" },
      { property: "og:description", content: "Confirm your delivery details and place your bespoke sofa order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Checkout,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile"),
  email: z.string().trim().email("Enter a valid email").max(160),
  city: z.enum(["Indore", "Ujjain"]),
  address_line: z.string().trim().min(6, "Enter your full address").max(240),
  landmark: z.string().trim().max(120).optional().or(z.literal("")),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

type FormState = z.infer<typeof schema>;

type SavedAddress = {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line: string;
  landmark: string | null;
  city: string;
  pincode: string;
  is_default: boolean;
};

function Checkout() {
  const { items, subtotal, discount, total, coupon, clear } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({
    full_name: "",
    phone: "",
    email: "",
    city: "Indore",
    address_line: "",
    landmark: "",
    pincode: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddrId, setSelectedAddrId] = useState<string>("");
  const [saveAddress, setSaveAddress] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      setEmailVerified(!!data.user?.email_confirmed_at);
      if (!uid) return;
      const [{ data: p }, { data: a }] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, email, city, phone_verified").eq("id", uid).maybeSingle(),
        supabase.from("user_addresses").select("*").eq("user_id", uid).order("is_default", { ascending: false }).order("created_at", { ascending: false }),
      ]);
      const list = (a as SavedAddress[] | null) ?? [];
      setAddresses(list);
      const prof0 = p as { phone?: string | null; phone_verified?: boolean | null } | null;
      if (prof0?.phone_verified && prof0.phone) setVerifiedPhone(prof0.phone.replace(/\D/g, "").slice(-10));
      const authEmail = data.user?.email ?? "";
      const profileEmail = (p as { email?: string | null } | null)?.email ?? "";
      // Prefer default address; otherwise seed from profile
      const def = list.find((x) => x.is_default) ?? list[0];
      if (def) {
        setSelectedAddrId(def.id);
        setForm((s) => ({
          ...s,
          full_name: def.full_name,
          phone: def.phone,
          email: profileEmail || authEmail || s.email,
          city: (def.city as "Indore" | "Ujjain") ?? "Indore",
          address_line: def.address_line,
          landmark: def.landmark ?? "",
          pincode: def.pincode,
        }));
      } else if (p) {
        const prof = p as { full_name?: string | null; phone?: string | null; city?: string | null; email?: string | null };
        setForm((s) => ({
          ...s,
          full_name: prof.full_name ?? s.full_name,
          phone: prof.phone ?? s.phone,
          email: prof.email ?? authEmail ?? s.email,
          city: (prof.city === "Ujjain" ? "Ujjain" : "Indore"),
        }));
      } else if (authEmail) {
        setForm((s) => ({ ...s, email: authEmail }));
      }
    })();
  }, []);

  function selectAddress(id: string) {
    setSelectedAddrId(id);
    if (id === "__new") return;
    const a = addresses.find((x) => x.id === id);
    if (!a) return;
    setForm((s) => ({
      ...s,
      full_name: a.full_name,
      phone: a.phone,
      city: (a.city as "Indore" | "Ujjain") ?? "Indore",
      address_line: a.address_line,
      landmark: a.landmark ?? "",
      pincode: a.pincode,
    }));
    setErrors({});
  }

  const deposit = Math.round(total * 0.2);
  const balance = total - deposit;
  const phoneVerified = !!verifiedPhone && verifiedPhone === form.phone.replace(/\D/g, "").slice(-10);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[color:var(--brand-cream)]">
        <SiteHeader />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 py-20 text-center">
          <h1 className="text-3xl font-display mb-4">Your cart is empty</h1>
          <p className="text-[color:var(--brand-dark)]/60 mb-8">Add a piece to your cart to place an order.</p>
          <Link to="/collections" className="inline-block px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors">
            Browse Collections
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

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
    if (!phoneVerified) {
      toast.error("Please verify your mobile number with the OTP before placing the order");
      document.getElementById("tf-phone-verify")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id ?? userId;
      if (!uid) throw new Error("Not signed in");

      const data = parsed.data;

      // Optionally save this delivery address for future orders
      if (saveAddress && selectedAddrId === "__new") {
        try {
          await supabase.from("user_addresses").insert({
            user_id: uid,
            label: "Home",
            full_name: data.full_name,
            phone: data.phone,
            address_line: data.address_line,
            landmark: data.landmark || null,
            city: data.city,
            pincode: data.pincode,
            is_default: addresses.length === 0,
          });
        } catch {
          // non-fatal
        }
      }

      // Keep profile in sync (name/phone/city) so future checkouts prefill.
      try {
        await supabase.from("profiles").update({
          full_name: data.full_name,
          phone: data.phone,
          city: data.city,
        }).eq("id", uid);
      } catch {
        // non-fatal
      }

      const addressBlob = [data.address_line, data.landmark, `Pincode: ${data.pincode}`, `Name: ${data.full_name}`, `Email: ${data.email}`]
        .filter(Boolean)
        .join(" · ");

      const rows = items.map((i) => {
        const lineSubtotal = i.unitPrice * i.quantity;
        // proportionally distribute discount across lines
        const lineDiscount = subtotal > 0 ? Math.round((discount * lineSubtotal) / subtotal) : 0;
        const lineTotal = lineSubtotal - lineDiscount;
        const lineDeposit = Math.round(lineTotal * 0.2);
        return {
          user_id: uid,
          sofa_id: i.sofaId,
          sofa_snapshot: { name: i.name, slug: i.slug, image: i.image, unit_price: i.unitPrice, quantity: i.quantity },
          fabric_snapshot: { name: i.fabric },
          size_snapshot: { label: i.size ?? null, color: i.color ?? null },
          addons_snapshot: i.addons ?? [],
          subtotal: lineSubtotal,
          discount: lineDiscount,
          total: lineTotal,
          discount_code: coupon?.code ?? null,
          deposit_paid: 0,
          balance_due: lineTotal - lineDeposit,
          status: "pending_deposit" as const,
          delivery_city: data.city,
          delivery_address: addressBlob,
          phone: data.phone,
          customer_notes: data.notes || null,
          expected_delivery_date: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        };
      });

      const { data: inserted, error } = await supabase
        .from("orders")
        .insert(rows)
        .select("id");
      if (error) throw error;
      const orderIds = (inserted ?? []).map((r: { id: string }) => r.id);
      if (orderIds.length === 0) throw new Error("Could not create order");

      clear();
      toast.success("Order saved. Complete your deposit to confirm.");
      navigate({ to: "/payment", search: { orders: orderIds.join(",") } });
      return;
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Could not place your order");
      setSubmitting(false);
      return;
    } finally {
      // no-op; state is managed above based on modal lifecycle
    }
  };

  const inputCls =
    "w-full px-4 py-3 bg-white border border-[color:var(--brand-dark)]/15 focus:border-[color:var(--brand-dark)] focus:outline-none text-sm";
  const labelCls = "block text-[10px] font-black uppercase tracking-widest mb-2";

  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)]">
      <SiteHeader />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-10 md:py-16">
        <span className="tf-chip mb-4">Almost There</span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-display mb-8 text-balance">Checkout</h1>

        <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-8">
            <section className="bg-white border border-[color:var(--brand-dark)]/10 p-6">
              <h2 className="font-display text-xl mb-6">Delivery Details</h2>
              {addresses.length > 0 && (
                <div className="mb-6">
                  <label className={labelCls}>Deliver To</label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {addresses.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => selectAddress(a.id)}
                        className={`text-left border p-3 text-sm transition-colors ${selectedAddrId === a.id ? "border-[color:var(--brand-dark)] bg-[color:var(--brand-muted)]/50" : "border-[color:var(--brand-dark)]/15 hover:border-[color:var(--brand-dark)]/40"}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest">{a.label}</span>
                          {a.is_default && <span className="text-[9px] px-1.5 py-0.5 bg-[color:var(--brand-accent)] text-white uppercase tracking-widest">Default</span>}
                        </div>
                        <div className="font-semibold">{a.full_name}</div>
                        <div className="text-[color:var(--brand-dark)]/70 text-xs line-clamp-2">{a.address_line}, {a.city} — {a.pincode}</div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => { setSelectedAddrId("__new"); setForm((s) => ({ ...s, full_name: "", phone: "", address_line: "", landmark: "", pincode: "" })); }}
                      className={`text-left border p-3 text-sm border-dashed transition-colors ${selectedAddrId === "__new" ? "border-[color:var(--brand-dark)] bg-[color:var(--brand-muted)]/50" : "border-[color:var(--brand-dark)]/25 hover:border-[color:var(--brand-dark)]/60"}`}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-widest mb-1">+ Use a new address</div>
                      <div className="text-xs text-[color:var(--brand-dark)]/60">Enter details below</div>
                    </button>
                  </div>
                </div>
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor="full_name">Full Name</label>
                  <input id="full_name" className={inputCls} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
                  {errors.full_name && <p className="text-xs text-red-600 mt-1">{errors.full_name}</p>}
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className={labelCls} htmlFor="phone">Mobile</label>
                    {phoneVerified ? <VerifiedBadge label="Verified" /> : <UnverifiedBadge label="Unverified" />}
                  </div>
                  <input id="phone" inputMode="numeric" maxLength={10} className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))} placeholder="10-digit" />
                  {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
                  <div id="tf-phone-verify">
                    <PhoneVerify
                      phone={form.phone}
                      verified={phoneVerified}
                      onVerified={(e164) => setVerifiedPhone(e164.replace(/\D/g, "").slice(-10))}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className={labelCls} htmlFor="email">Email</label>
                    {emailVerified ? <VerifiedBadge label="Verified" /> : <UnverifiedBadge label="Unverified" />}
                  </div>
                  <input id="email" type="email" className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} />
                  {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className={labelCls} htmlFor="city">City</label>
                  <select id="city" className={inputCls} value={form.city} onChange={(e) => set("city", e.target.value as FormState["city"])}>
                    <option value="Indore">Indore</option>
                    <option value="Ujjain">Ujjain</option>
                  </select>
                  {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city}</p>}
                </div>
                <div>
                  <label className={labelCls} htmlFor="pincode">Pincode</label>
                  <input id="pincode" inputMode="numeric" maxLength={6} className={inputCls} value={form.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))} />
                  {errors.pincode && <p className="text-xs text-red-600 mt-1">{errors.pincode}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor="address_line">Address</label>
                  <textarea id="address_line" rows={3} className={inputCls} value={form.address_line} onChange={(e) => set("address_line", e.target.value)} placeholder="House / Flat, Street, Area" />
                  {errors.address_line && <p className="text-xs text-red-600 mt-1">{errors.address_line}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor="landmark">Landmark (optional)</label>
                  <input id="landmark" className={inputCls} value={form.landmark} onChange={(e) => set("landmark", e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor="notes">Delivery Notes (optional)</label>
                  <textarea id="notes" rows={3} className={inputCls} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Access instructions, preferred delivery window…" />
                </div>
                {(addresses.length === 0 || selectedAddrId === "__new") && (
                  <label className="sm:col-span-2 flex items-center gap-2 text-xs text-[color:var(--brand-dark)]/70">
                    <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                    Save this address to my profile for future orders
                  </label>
                )}
              </div>
            </section>

            <section className="bg-[color:var(--brand-muted)]/50 border border-[color:var(--brand-dark)]/10 p-6">
              <h2 className="font-display text-lg mb-2">Reserve · Pay Later</h2>
              <p className="text-sm text-[color:var(--brand-dark)]/70">
                Pay a 20% booking deposit to lock in your build slot. The balance is due on delivery. Our team will contact you within 24 hours to confirm the deposit and fabric choices.
              </p>
              <p className="mt-3 text-sm text-[color:var(--brand-dark)]/80 border-l-2 border-[color:var(--brand-accent)] pl-3">
                Please note: our craftsmen begin making your furniture only after the order is successfully placed and the initial deposit is paid.
              </p>
            </section>

            <PaymentMethods />
          </div>

          <aside className="bg-white border border-[color:var(--brand-dark)]/10 p-6 h-fit lg:sticky lg:top-24">
            <h2 className="font-display text-xl mb-4">Order Summary</h2>
            <div className="space-y-3 mb-5 max-h-64 overflow-auto">
              {items.map((i) => (
                <div key={i.id} className="flex gap-3">
                  <div className="size-14 shrink-0 bg-[color:var(--brand-muted)] overflow-hidden">
                    <img src={i.image} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 text-sm">
                    <div className="truncate">{i.name} × {i.quantity}</div>
                    <div className="text-xs text-[color:var(--brand-dark)]/50 capitalize">{i.fabric}</div>
                  </div>
                  <div className="text-sm">{formatINR(i.unitPrice * i.quantity)}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2 text-sm border-t border-[color:var(--brand-dark)]/10 pt-4">
              <div className="flex justify-between"><span className="text-[color:var(--brand-dark)]/60">Subtotal</span><span>{formatINR(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-[color:var(--brand-dark)]/60">Delivery</span><span>Free</span></div>
              <div className="flex justify-between items-baseline pt-2 border-t border-[color:var(--brand-dark)]/10">
                <span className="text-xs font-bold uppercase tracking-widest">Total</span>
                <span className="font-display text-2xl">{formatINR(subtotal)}</span>
              </div>
            </div>
            <div className="bg-[color:var(--brand-muted)]/60 p-3 mt-4 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-bold uppercase tracking-widest">Deposit (20%)</span>
                <span className="font-display text-base">{formatINR(deposit)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[color:var(--brand-dark)]/60">Balance on delivery</span>
                <span>{formatINR(balance)}</span>
              </div>
              <div className="text-[10px] text-[color:var(--brand-dark)]/60 pt-1">Estimated delivery by {estimatedDelivery(30)}.</div>
            </div>
            <p className="mt-4 text-[10px] text-[color:var(--brand-dark)]/60 leading-relaxed">
              Crafting begins once your order is placed and the 20% deposit is paid.
            </p>
            <button type="submit" disabled={submitting || !phoneVerified} className="mt-3 w-full px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 10V7a6 6 0 1112 0v3"/><rect x="4" y="10" width="16" height="11" rx="2"/></svg>
              {submitting ? "Processing…" : !phoneVerified ? "Verify Mobile to Continue" : `Continue to Payment · ${formatINR(deposit)}`}
            </button>
            <Link to="/cart" className="mt-3 block text-center text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/60 hover:text-[color:var(--brand-accent)]">
              ← Back to Cart
            </Link>
          </aside>
        </form>
      </div>
      <SiteFooter />
    </div>
  );
}