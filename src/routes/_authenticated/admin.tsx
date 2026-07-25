import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, formatDate, ORDER_STATUS_STEPS } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const user = (context as { user?: { id: string } }).user;
    if (!user) throw redirect({ to: "/auth" });
    const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: staff } = await supabase.rpc("has_role", { _user_id: user.id, _role: "staff" });
    if (!data && !staff) throw redirect({ to: "/dashboard" });
    return { isAdmin: !!data, isStaff: !!staff };
  },
  head: () => ({
    meta: [
      { title: "Admin — True Furniture's" },
      { name: "description", content: "Manage orders, customers, products, blog, bookings, reviews and coupons." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminHome,
});

type Tab = "overview" | "orders" | "customers" | "products" | "blog" | "showrooms" | "bookings" | "reviews" | "coupons" | "designs";

function AdminHome() {
  const [tab, setTab] = useState<Tab>("overview");
  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "orders", label: "Orders" },
    { key: "customers", label: "Customers" },
    { key: "products", label: "Products" },
    { key: "blog", label: "Blog" },
    { key: "showrooms", label: "Showrooms" },
    { key: "bookings", label: "Bookings" },
    { key: "reviews", label: "Reviews" },
    { key: "coupons", label: "Coupons" },
    { key: "designs", label: "Designs" },
  ];

  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)] flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 md:px-10 py-8 md:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <span className="tf-chip mb-3">Atelier Console</span>
            <h1 className="text-3xl md:text-4xl font-display mt-2 text-balance">Admin Dashboard</h1>
          </div>
          <Link to="/dashboard" className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/60 hover:text-[color:var(--brand-accent)]">← Customer view</Link>
        </div>

        <nav className="mb-6 border-b border-[color:var(--brand-dark)]/10 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors border-b-2 ${tab === t.key ? "text-[color:var(--brand-dark)] border-[color:var(--brand-accent)]" : "text-[color:var(--brand-dark)]/50 border-transparent hover:text-[color:var(--brand-dark)]"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        {tab === "overview" && <Overview />}
        {tab === "orders" && <Orders />}
        {tab === "customers" && <Customers />}
        {tab === "products" && <Products />}
        {tab === "blog" && <Blog />}
        {tab === "showrooms" && <Showrooms />}
        {tab === "bookings" && <Bookings />}
        {tab === "reviews" && <Reviews />}
        {tab === "coupons" && <Coupons />}
        {tab === "designs" && <Designs />}
      </main>
      <SiteFooter />
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-[color:var(--brand-dark)]/10 p-5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/50">{label}</div>
      <div className="font-display text-2xl mt-2">{value}</div>
    </div>
  );
}

function Overview() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [orders, bookings, customers, reviews] = await Promise.all([
        supabase.from("orders").select("id, total, status, created_at"),
        supabase.from("showroom_bookings").select("id, status"),
        supabase.from("profiles").select("id"),
        supabase.from("reviews").select("id, approved"),
      ]);
      const os = orders.data ?? [];
      const revenue = os.reduce((n, o: { total: number }) => n + Number(o.total), 0);
      const active = os.filter((o: { status: string }) => !["delivered", "cancelled"].includes(o.status)).length;
      const week = os.filter((o: { created_at: string }) => Date.now() - new Date(o.created_at).getTime() < 7 * 86400_000).length;
      const pendingBookings = (bookings.data ?? []).filter((b: { status: string }) => b.status === "pending").length;
      const pendingReviews = (reviews.data ?? []).filter((r: { approved: boolean }) => !r.approved).length;
      return {
        totalOrders: os.length,
        revenue,
        active,
        week,
        customers: (customers.data ?? []).length,
        pendingBookings,
        pendingReviews,
      };
    },
  });
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card label="Total revenue" value={formatINR(data?.revenue ?? 0)} />
      <Card label="All orders" value={data?.totalOrders ?? 0} />
      <Card label="Active orders" value={data?.active ?? 0} />
      <Card label="New this week" value={data?.week ?? 0} />
      <Card label="Customers" value={data?.customers ?? 0} />
      <Card label="Pending bookings" value={data?.pendingBookings ?? 0} />
      <Card label="Reviews to approve" value={data?.pendingReviews ?? 0} />
    </div>
  );
}

function Orders() {
  const qc = useQueryClient();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, total, deposit_paid, balance_due, status, delivery_city, phone, created_at, expected_delivery_date, sofa_snapshot, discount_code, admin_notes")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Order updated");
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  if (isLoading) return <div className="tf-skeleton h-64" />;
  return (
    <div className="overflow-x-auto bg-white border border-[color:var(--brand-dark)]/10">
      <table className="w-full text-sm">
        <thead className="bg-[color:var(--brand-muted)]/40 text-[10px] uppercase tracking-widest">
          <tr>
            <th className="text-left p-3">Order</th>
            <th className="text-left p-3">Product</th>
            <th className="text-left p-3">City / Phone</th>
            <th className="text-right p-3">Total</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">ETA</th>
          </tr>
        </thead>
        <tbody>
          {(orders ?? []).map((o) => {
            const snap = (o.sofa_snapshot ?? {}) as { name?: string };
            return (
              <tr key={o.id} className="border-t border-[color:var(--brand-dark)]/5 hover:bg-[color:var(--brand-muted)]/20">
                <td className="p-3">
                  <div className="font-bold">{o.order_number}</div>
                  <div className="text-[10px] text-[color:var(--brand-dark)]/50">{formatDate(o.created_at)}</div>
                  {o.discount_code && <div className="text-[10px] text-[color:var(--brand-accent)]">✓ {o.discount_code}</div>}
                </td>
                <td className="p-3">{snap.name ?? "Custom"}</td>
                <td className="p-3">
                  <div>{o.delivery_city ?? "—"}</div>
                  <a href={`tel:${o.phone}`} className="text-[10px] text-[color:var(--brand-dark)]/50">{o.phone}</a>
                </td>
                <td className="p-3 text-right">
                  <div>{formatINR(Number(o.total))}</div>
                  <div className="text-[10px] text-[color:var(--brand-dark)]/50">Bal {formatINR(Number(o.balance_due))}</div>
                </td>
                <td className="p-3">
                  <select value={o.status} onChange={(e) => update(o.id, { status: e.target.value })} className="text-xs border border-[color:var(--brand-dark)]/20 px-2 py-1 bg-white">
                    {ORDER_STATUS_STEPS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <td className="p-3">
                  <input type="date" defaultValue={o.expected_delivery_date ?? ""} onBlur={(e) => e.target.value !== o.expected_delivery_date && update(o.id, { expected_delivery_date: e.target.value })} className="text-xs border border-[color:var(--brand-dark)]/20 px-2 py-1 bg-white" />
                </td>
              </tr>
            );
          })}
          {(orders ?? []).length === 0 && <tr><td colSpan={6} className="p-8 text-center text-[color:var(--brand-dark)]/50">No orders yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Customers() {
  const { data } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const [{ data: profiles }, { data: orders }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone, city, created_at").order("created_at", { ascending: false }),
        supabase.from("orders").select("user_id, total"),
      ]);
      const spent = new Map<string, { count: number; sum: number }>();
      for (const o of orders ?? []) {
        const cur = spent.get(o.user_id) ?? { count: 0, sum: 0 };
        cur.count += 1;
        cur.sum += Number(o.total);
        spent.set(o.user_id, cur);
      }
      return (profiles ?? []).map((p) => ({ ...p, ...(spent.get(p.id) ?? { count: 0, sum: 0 }) }));
    },
  });
  return (
    <div className="overflow-x-auto bg-white border border-[color:var(--brand-dark)]/10">
      <table className="w-full text-sm">
        <thead className="bg-[color:var(--brand-muted)]/40 text-[10px] uppercase tracking-widest"><tr><th className="text-left p-3">Name</th><th className="text-left p-3">Phone</th><th className="text-left p-3">City</th><th className="text-right p-3">Orders</th><th className="text-right p-3">Lifetime</th><th className="text-left p-3">Joined</th></tr></thead>
        <tbody>
          {(data ?? []).map((c) => (
            <tr key={c.id} className="border-t border-[color:var(--brand-dark)]/5">
              <td className="p-3">{c.full_name ?? "—"}</td>
              <td className="p-3"><a href={`https://wa.me/91${c.phone ?? ""}`} className="hover:text-[color:var(--brand-accent)]">{c.phone ?? "—"}</a></td>
              <td className="p-3">{c.city ?? "—"}</td>
              <td className="p-3 text-right">{c.count}</td>
              <td className="p-3 text-right">{formatINR(c.sum)}</td>
              <td className="p-3 text-[10px] text-[color:var(--brand-dark)]/50">{formatDate(c.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Products() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase.from("sofas").select("id, slug, name, base_price, sale_price, is_published, lead_time_days, active_build_slots, max_concurrent_builds").order("sort_order");
      return data ?? [];
    },
  });
  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from("sofas").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };
  return (
    <div className="overflow-x-auto bg-white border border-[color:var(--brand-dark)]/10">
      <table className="w-full text-sm">
        <thead className="bg-[color:var(--brand-muted)]/40 text-[10px] uppercase tracking-widest"><tr><th className="text-left p-3">Name</th><th className="text-right p-3">Base</th><th className="text-right p-3">Sale</th><th className="text-right p-3">Lead days</th><th className="text-right p-3">Capacity</th><th className="text-left p-3">Live</th></tr></thead>
        <tbody>
          {(data ?? []).map((p) => (
            <tr key={p.id} className="border-t border-[color:var(--brand-dark)]/5">
              <td className="p-3"><Link to="/products/$slug" params={{ slug: p.slug }} className="font-bold hover:text-[color:var(--brand-accent)]">{p.name}</Link></td>
              <td className="p-3 text-right"><input type="number" defaultValue={p.base_price} onBlur={(e) => Number(e.target.value) !== p.base_price && update(p.id, { base_price: Number(e.target.value) })} className="w-24 text-right border border-[color:var(--brand-dark)]/20 px-2 py-1" /></td>
              <td className="p-3 text-right"><input type="number" defaultValue={p.sale_price ?? ""} onBlur={(e) => update(p.id, { sale_price: e.target.value ? Number(e.target.value) : null })} className="w-24 text-right border border-[color:var(--brand-dark)]/20 px-2 py-1" /></td>
              <td className="p-3 text-right"><input type="number" defaultValue={p.lead_time_days} onBlur={(e) => update(p.id, { lead_time_days: Number(e.target.value) })} className="w-16 text-right border border-[color:var(--brand-dark)]/20 px-2 py-1" /></td>
              <td className="p-3 text-right text-xs">{p.active_build_slots} / {p.max_concurrent_builds}</td>
              <td className="p-3"><input type="checkbox" defaultChecked={p.is_published} onChange={(e) => update(p.id, { is_published: e.target.checked })} className="size-4 accent-[color:var(--brand-dark)]" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Blog() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-blog"],
    queryFn: async () => (await supabase.from("blog_posts").select("id, slug, title, is_published, published_at, created_at").order("created_at", { ascending: false })).data ?? [],
  });
  const create = async () => {
    const title = prompt("Post title");
    if (!title) return;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await supabase.from("blog_posts").insert({ title, slug, content: "Write your post here…", excerpt: "", is_published: false });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-blog"] });
  };
  const toggle = async (id: string, published: boolean) => {
    const { error } = await supabase.from("blog_posts").update({ is_published: published, published_at: published ? new Date().toISOString() : null }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-blog"] });
  };
  const del = async (id: string) => {
    if (!confirm("Delete post?")) return;
    await supabase.from("blog_posts").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-blog"] });
  };
  return (
    <div>
      <button onClick={create} className="mb-4 px-4 py-2 bg-[color:var(--brand-dark)] text-white text-[10px] font-bold uppercase tracking-widest">+ New Post</button>
      <div className="bg-white border border-[color:var(--brand-dark)]/10 divide-y divide-[color:var(--brand-dark)]/5">
        {(data ?? []).map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="flex-1 min-w-0"><Link to="/blog/$slug" params={{ slug: p.slug }} className="font-bold hover:text-[color:var(--brand-accent)]">{p.title}</Link><div className="text-[10px] text-[color:var(--brand-dark)]/50">/{p.slug}</div></div>
            <label className="text-xs flex items-center gap-2"><input type="checkbox" defaultChecked={p.is_published} onChange={(e) => toggle(p.id, e.target.checked)} className="accent-[color:var(--brand-dark)]" />Published</label>
            <button onClick={() => del(p.id)} className="text-[10px] font-bold uppercase tracking-widest text-red-600">Delete</button>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[color:var(--brand-dark)]/50 mt-3">Full markdown editor coming next. For now, edit post bodies directly in the database.</p>
    </div>
  );
}

function Showrooms() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-showrooms"],
    queryFn: async () => (await supabase.from("showrooms").select("*").order("sort_order")).data ?? [],
  });
  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from("showrooms").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-showrooms"] });
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(data ?? []).map((s) => (
        <div key={s.id} className="bg-white border border-[color:var(--brand-dark)]/10 p-5 space-y-2">
          <h3 className="font-display text-lg">{s.name}</h3>
          <div className="text-xs text-[color:var(--brand-dark)]/60">{s.city}</div>
          <textarea defaultValue={s.address ?? ""} rows={2} onBlur={(e) => e.target.value !== s.address && update(s.id, { address: e.target.value })} className="w-full text-xs border border-[color:var(--brand-dark)]/15 p-2" />
          <input defaultValue={s.phone ?? ""} onBlur={(e) => e.target.value !== s.phone && update(s.id, { phone: e.target.value })} className="w-full text-xs border border-[color:var(--brand-dark)]/15 p-2" placeholder="Phone" />
          <input defaultValue={s.hours ?? ""} onBlur={(e) => e.target.value !== s.hours && update(s.id, { hours: e.target.value })} className="w-full text-xs border border-[color:var(--brand-dark)]/15 p-2" placeholder="Hours" />
        </div>
      ))}
    </div>
  );
}

function Bookings() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => (await supabase.from("showroom_bookings").select("*, showroom:showrooms(name, city)").order("preferred_date", { ascending: true })).data ?? [],
  });
  const update = async (id: string, status: string) => {
    const { error } = await supabase.from("showroom_bookings").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["admin-bookings"] });
  };
  return (
    <div className="space-y-3">
      {(data ?? []).map((b) => {
        const sr = (b as { showroom?: { name?: string; city?: string } }).showroom;
        return (
          <div key={b.id} className="bg-white border border-[color:var(--brand-dark)]/10 p-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px]">
              <div className="font-bold">{b.full_name} · {b.party_size} guest(s)</div>
              <div className="text-xs text-[color:var(--brand-dark)]/60">{sr?.name} · {b.preferred_date} · {b.preferred_time}</div>
              <div className="text-[10px] text-[color:var(--brand-dark)]/50 mt-1">{b.phone} {b.email && `· ${b.email}`}</div>
              {b.notes && <div className="text-[10px] italic text-[color:var(--brand-dark)]/60 mt-1">"{b.notes}"</div>}
            </div>
            <select value={b.status} onChange={(e) => update(b.id, e.target.value)} className="text-xs border border-[color:var(--brand-dark)]/20 px-2 py-1 bg-white">
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <a href={`https://wa.me/91${b.phone}`} target="_blank" rel="noreferrer" className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 border border-[color:var(--brand-dark)] hover:bg-[color:var(--brand-dark)] hover:text-white">WhatsApp</a>
          </div>
        );
      })}
      {(data ?? []).length === 0 && <div className="bg-white border border-[color:var(--brand-dark)]/10 p-8 text-center text-[color:var(--brand-dark)]/50">No booking requests yet.</div>}
    </div>
  );
}

function Reviews() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => (await supabase.from("reviews").select("*, sofa:sofas(name)").order("created_at", { ascending: false })).data ?? [],
  });
  const setApproved = async (id: string, approved: boolean) => {
    const { error } = await supabase.from("reviews").update({ approved }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
  };
  const del = async (id: string) => {
    if (!confirm("Delete review?")) return;
    await supabase.from("reviews").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
  };
  return (
    <div className="space-y-3">
      {(data ?? []).map((r) => (
        <div key={r.id} className="bg-white border border-[color:var(--brand-dark)]/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="text-[color:var(--brand-accent)] text-sm">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
              {r.title && <h4 className="font-display text-lg">{r.title}</h4>}
              <p className="text-sm text-[color:var(--brand-dark)]/70 mt-1">{r.body}</p>
              <div className="text-[10px] text-[color:var(--brand-dark)]/50 mt-2">{(r as { sofa?: { name?: string } }).sofa?.name ?? "—"} · {r.city ?? "—"} · {formatDate(r.created_at)}</div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={r.approved} onChange={(e) => setApproved(r.id, e.target.checked)} className="accent-[color:var(--brand-accent)]" />Public</label>
              <button onClick={() => del(r.id)} className="text-[10px] font-bold uppercase tracking-widest text-red-600">Delete</button>
            </div>
          </div>
        </div>
      ))}
      {(data ?? []).length === 0 && <div className="bg-white border border-[color:var(--brand-dark)]/10 p-8 text-center text-[color:var(--brand-dark)]/50">No reviews yet.</div>}
    </div>
  );
}

function Coupons() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => (await supabase.from("coupons").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const create = async () => {
    const code = prompt("Coupon code (e.g. DIWALI10)")?.toUpperCase().trim();
    if (!code) return;
    const type = confirm("OK = Percent off, Cancel = Flat amount off") ? "percent" : "flat";
    const value = Number(prompt(type === "percent" ? "Percent (1-100)" : "Flat amount in ₹") ?? "0");
    if (!value) return;
    const min = Number(prompt("Minimum order amount (₹) — 0 for none", "0") ?? "0");
    const { error } = await supabase.from("coupons").insert({ code, discount_type: type, discount_value: value, min_order_amount: min, active: true });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  };
  const toggle = async (id: string, active: boolean) => {
    await supabase.from("coupons").update({ active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  };
  const del = async (id: string) => {
    if (!confirm("Delete coupon?")) return;
    await supabase.from("coupons").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  };
  return (
    <div>
      <button onClick={create} className="mb-4 px-4 py-2 bg-[color:var(--brand-dark)] text-white text-[10px] font-bold uppercase tracking-widest">+ New Coupon</button>
      <div className="bg-white border border-[color:var(--brand-dark)]/10 divide-y divide-[color:var(--brand-dark)]/5">
        {(data ?? []).map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="flex-1 min-w-[180px]">
              <div className="font-mono font-bold">{c.code}</div>
              <div className="text-[10px] text-[color:var(--brand-dark)]/50">
                {c.discount_type === "percent" ? `${c.discount_value}% off` : `${formatINR(Number(c.discount_value))} off`}
                {Number(c.min_order_amount) > 0 && ` · min ${formatINR(Number(c.min_order_amount))}`}
                {" · "} used {c.uses_count} times
              </div>
            </div>
            <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={c.active} onChange={(e) => toggle(c.id, e.target.checked)} className="accent-[color:var(--brand-dark)]" />Active</label>
            <button onClick={() => del(c.id)} className="text-[10px] font-bold uppercase tracking-widest text-red-600">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Designs() {
  const { data } = useQuery({
    queryKey: ["admin-designs"],
    queryFn: async () => (await supabase.from("saved_designs").select("id, name, created_at, share_token, sofa:sofas(name)").order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <div className="bg-white border border-[color:var(--brand-dark)]/10 divide-y divide-[color:var(--brand-dark)]/5">
      {(data ?? []).map((d) => (
        <div key={d.id} className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex-1"><span className="font-bold">{d.name}</span><span className="text-[10px] text-[color:var(--brand-dark)]/50 ml-2">{(d as { sofa?: { name?: string } }).sofa?.name}</span></div>
          <Link to="/shared-design/$token" params={{ token: d.share_token }} className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 border border-[color:var(--brand-dark)]/30 hover:border-[color:var(--brand-dark)]">Preview</Link>
          <span className="text-[10px] text-[color:var(--brand-dark)]/50">{formatDate(d.created_at)}</span>
        </div>
      ))}
      {(data ?? []).length === 0 && <div className="p-8 text-center text-[color:var(--brand-dark)]/50">No saved designs yet.</div>}
    </div>
  );
}