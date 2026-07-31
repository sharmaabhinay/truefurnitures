import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { UnverifiedBadge, VerifiedBadge } from "@/components/phone-verify";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — True Furniture's" },
      { name: "description", content: "Manage your account details and saved delivery addresses." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "My Profile — True Furniture's" },
      { property: "og:description", content: "Manage your account details and saved delivery addresses." },
    ],
  }),
  component: ProfilePage,
});

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  avatar_url: string | null;
  phone_verified?: boolean | null;
};

type Address = {
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

const addressSchema = z.object({
  label: z.string().trim().min(1).max(40),
  full_name: z.string().trim().min(2, "Enter a name").max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile"),
  address_line: z.string().trim().min(6, "Enter your full address").max(240),
  landmark: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.enum(["Indore", "Ujjain"]),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  is_default: z.boolean().optional(),
});

type AddressForm = z.infer<typeof addressSchema>;

const EMPTY_ADDR: AddressForm = {
  label: "Home",
  full_name: "",
  phone: "",
  address_line: "",
  landmark: "",
  city: "Indore",
  pincode: "",
  is_default: false,
};

function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddressForm>(EMPTY_ADDR);
  const [errs, setErrs] = useState<Partial<Record<keyof AddressForm, string>>>({});
  const [savingAddr, setSavingAddr] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      setEmailVerified(!!data.user?.email_confirmed_at);
      if (!uid) return;
      const [{ data: p }, { data: a }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_addresses").select("*").eq("user_id", uid).order("is_default", { ascending: false }).order("created_at", { ascending: false }),
      ]);
      const resolved: Profile =
        (p as Profile | null) ?? {
          id: uid,
          full_name: (data.user?.user_metadata?.full_name as string | undefined) ?? null,
          email: data.user?.email ?? null,
          phone: null,
          city: null,
          avatar_url: null,
        };
      if (!p) {
        await supabase.from("profiles").upsert({ id: uid, full_name: resolved.full_name, email: resolved.email }).select();
      } else if (!resolved.email && data.user?.email) {
        resolved.email = data.user.email;
      }
      setProfile(resolved);
      setAddresses((a as Address[] | null) ?? []);
      setLoading(false);
    })();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !userId) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name?.trim() || null,
          phone: profile.phone?.trim() || null,
          city: profile.city?.trim() || null,
        })
        .eq("id", userId);
      if (error) throw error;

      // Email change goes through auth (sends confirmation).
      const { data: u } = await supabase.auth.getUser();
      if (profile.email && u.user && profile.email.trim() !== u.user.email) {
        const { error: eErr } = await supabase.auth.updateUser({ email: profile.email.trim() });
        if (eErr) throw eErr;
        toast.success("Profile saved. Check your inbox to confirm the new email.");
      } else {
        toast.success("Profile updated");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSavingProfile(false);
    }
  }

  function openNew() {
    setEditingId(null);
    setForm({ ...EMPTY_ADDR, full_name: profile?.full_name ?? "", phone: profile?.phone ?? "" });
    setErrs({});
    setShowForm(true);
  }

  function openEdit(a: Address) {
    setEditingId(a.id);
    setForm({
      label: a.label,
      full_name: a.full_name,
      phone: a.phone,
      address_line: a.address_line,
      landmark: a.landmark ?? "",
      city: (a.city as "Indore" | "Ujjain") ?? "Indore",
      pincode: a.pincode,
      is_default: a.is_default,
    });
    setErrs({});
    setShowForm(true);
  }

  async function submitAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const parsed = addressSchema.safeParse(form);
    if (!parsed.success) {
      const es: Partial<Record<keyof AddressForm, string>> = {};
      for (const i of parsed.error.issues) {
        const k = i.path[0] as keyof AddressForm;
        if (!es[k]) es[k] = i.message;
      }
      setErrs(es);
      return;
    }
    setSavingAddr(true);
    try {
      const payload = { ...parsed.data, landmark: parsed.data.landmark || null, user_id: userId };
      if (parsed.data.is_default) {
        await supabase.from("user_addresses").update({ is_default: false }).eq("user_id", userId);
      }
      if (editingId) {
        const { error } = await supabase.from("user_addresses").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        // If it's the first address, mark default.
        if (addresses.length === 0) payload.is_default = true;
        const { error } = await supabase.from("user_addresses").insert(payload);
        if (error) throw error;
      }
      const { data: a } = await supabase.from("user_addresses").select("*").eq("user_id", userId).order("is_default", { ascending: false }).order("created_at", { ascending: false });
      setAddresses((a as Address[] | null) ?? []);
      setShowForm(false);
      toast.success(editingId ? "Address updated" : "Address saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save address");
    } finally {
      setSavingAddr(false);
    }
  }

  async function removeAddress(id: string) {
    if (!confirm("Remove this address?")) return;
    const { error } = await supabase.from("user_addresses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  async function makeDefault(id: string) {
    if (!userId) return;
    await supabase.from("user_addresses").update({ is_default: false }).eq("user_id", userId);
    const { error } = await supabase.from("user_addresses").update({ is_default: true }).eq("id", id);
    if (error) return toast.error(error.message);
    setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })).sort((a, b) => Number(b.is_default) - Number(a.is_default)));
    toast.success("Default address updated");
  }

  const inputCls = "w-full px-4 py-3 bg-white border border-[color:var(--brand-dark)]/15 focus:border-[color:var(--brand-dark)] focus:outline-none text-sm";
  const labelCls = "block text-[10px] font-black uppercase tracking-widest mb-2";

  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)]">
      <SiteHeader />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-10 md:py-16">
        <span className="tf-chip mb-4">Account</span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-display mb-8 text-balance">My Profile</h1>

        {loading || !profile ? (
          <p className="text-sm text-[color:var(--brand-dark)]/60">Loading…</p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
            <section className="bg-white border border-[color:var(--brand-dark)]/10 p-6 h-fit">
              <h2 className="font-display text-xl mb-6">Personal Details</h2>
              <form onSubmit={saveProfile} className="space-y-5">
                <div>
                  <label className={labelCls}>Full Name</label>
                  <input className={inputCls} value={profile.full_name ?? ""} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className={labelCls}>Email</label>
                    {emailVerified ? <VerifiedBadge label="Verified" /> : <UnverifiedBadge label="Unverified" />}
                  </div>
                  <input type="email" className={inputCls} value={profile.email ?? ""} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
                  <p className="text-[10px] text-[color:var(--brand-dark)]/50 mt-1">Changing email sends a confirmation link to the new address.</p>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className={labelCls}>Mobile</label>
                    {profile.phone_verified ? <VerifiedBadge label="Verified" /> : <UnverifiedBadge label="Unverified" />}
                  </div>
                  <input inputMode="numeric" maxLength={10} className={inputCls} value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value.replace(/\D/g, "") })} placeholder="10-digit" />
                  {!profile.phone_verified && (
                    <p className="text-[10px] text-[color:var(--brand-dark)]/50 mt-1">Your mobile is verified by OTP during checkout.</p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <select className={inputCls} value={profile.city ?? ""} onChange={(e) => setProfile({ ...profile, city: e.target.value })}>
                    <option value="">Select…</option>
                    <option value="Indore">Indore</option>
                    <option value="Ujjain">Ujjain</option>
                  </select>
                </div>
                <button disabled={savingProfile} type="submit" className="w-full px-6 py-4 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors disabled:opacity-60">
                  {savingProfile ? "Saving…" : "Save Changes"}
                </button>
              </form>
            </section>

            <section className="bg-white border border-[color:var(--brand-dark)]/10 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl">Saved Addresses</h2>
                {!showForm && (
                  <button onClick={openNew} className="px-4 py-2 bg-[color:var(--brand-dark)] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)]">
                    + Add address
                  </button>
                )}
              </div>

              {showForm && (
                <form onSubmit={submitAddress} className="grid gap-4 sm:grid-cols-2 mb-6 border border-[color:var(--brand-dark)]/10 p-4 bg-[color:var(--brand-muted)]/40">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Label</label>
                    <input className={inputCls} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Home, Office…" />
                  </div>
                  <div>
                    <label className={labelCls}>Full Name</label>
                    <input className={inputCls} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                    {errs.full_name && <p className="text-xs text-red-600 mt-1">{errs.full_name}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Mobile</label>
                    <input inputMode="numeric" maxLength={10} className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} />
                    {errs.phone && <p className="text-xs text-red-600 mt-1">{errs.phone}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Address</label>
                    <textarea rows={2} className={inputCls} value={form.address_line} onChange={(e) => setForm({ ...form, address_line: e.target.value })} placeholder="House / Flat, Street, Area" />
                    {errs.address_line && <p className="text-xs text-red-600 mt-1">{errs.address_line}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Landmark (optional)</label>
                    <input className={inputCls} value={form.landmark ?? ""} onChange={(e) => setForm({ ...form, landmark: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>City</label>
                    <select className={inputCls} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value as "Indore" | "Ujjain" })}>
                      <option value="Indore">Indore</option>
                      <option value="Ujjain">Ujjain</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Pincode</label>
                    <input inputMode="numeric" maxLength={6} className={inputCls} value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "") })} />
                    {errs.pincode && <p className="text-xs text-red-600 mt-1">{errs.pincode}</p>}
                  </div>
                  <label className="sm:col-span-2 flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={!!form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
                    Set as default address
                  </label>
                  <div className="sm:col-span-2 flex gap-3">
                    <button disabled={savingAddr} type="submit" className="flex-1 px-6 py-3 bg-[color:var(--brand-dark)] text-white text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] disabled:opacity-60">
                      {savingAddr ? "Saving…" : editingId ? "Update Address" : "Save Address"}
                    </button>
                    <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 border border-[color:var(--brand-dark)]/20 text-xs font-bold uppercase tracking-widest hover:bg-white">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {addresses.length === 0 && !showForm ? (
                <p className="text-sm text-[color:var(--brand-dark)]/60">No addresses yet. Add one to speed up checkout.</p>
              ) : (
                <div className="space-y-3">
                  {addresses.map((a) => (
                    <div key={a.id} className="border border-[color:var(--brand-dark)]/10 p-4 flex flex-col sm:flex-row sm:justify-between gap-3">
                      <div className="text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest">{a.label}</span>
                          {a.is_default && <span className="text-[9px] px-2 py-0.5 bg-[color:var(--brand-accent)] text-white uppercase tracking-widest">Default</span>}
                        </div>
                        <div className="font-semibold">{a.full_name} · {a.phone}</div>
                        <div className="text-[color:var(--brand-dark)]/70">{a.address_line}{a.landmark ? `, ${a.landmark}` : ""}</div>
                        <div className="text-[color:var(--brand-dark)]/70">{a.city} — {a.pincode}</div>
                      </div>
                      <div className="flex sm:flex-col gap-2 sm:items-end shrink-0">
                        {!a.is_default && (
                          <button onClick={() => makeDefault(a.id)} className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/70 hover:text-[color:var(--brand-accent)]">
                            Make default
                          </button>
                        )}
                        <button onClick={() => openEdit(a)} className="text-[10px] font-bold uppercase tracking-widest hover:text-[color:var(--brand-accent)]">Edit</button>
                        <button onClick={() => removeAddress(a.id)} className="text-[10px] font-bold uppercase tracking-widest text-red-600 hover:opacity-70">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}