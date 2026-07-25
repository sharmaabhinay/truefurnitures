import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, formatDate, ORDER_STATUS_STEPS } from "@/lib/format";
import { toast } from "sonner";
import { getVisitors, clearVisitors, getDeviceIcon, getBrowser, type VisitorEvent } from "@/lib/visitor-tracker";

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
      { title: "Admin Panel — True Furniture's" },
      { name: "description", content: "Manage orders, customers, products, bookings, reviews and more." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminHome,
});

type PanelKey =
  | "dashboard"
  | "visitors"
  | "orders"
  | "products"
  | "bookings"
  | "customers"
  | "reviews"
  | "coupons"
  | "blog"
  | "designs"
  | "showrooms"
  | "settings";

type NavItem = { key: PanelKey; label: string; icon: string };
type NavGroup = { title: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { key: "dashboard", label: "Dashboard", icon: "📊" },
    ],
  },
  {
    title: "",
    items: [
      { key: "visitors", label: "Visitor Analytics", icon: "👁️" },
      { key: "orders", label: "Orders", icon: "📦" },
      { key: "customers", label: "Customers", icon: "👥" },
    ],
  },
  {
    title: "Store",
    items: [
      { key: "products", label: "Products", icon: "🛋️" },
      { key: "bookings", label: "Quote Requests", icon: "💬" },
    ],
  },
  {
    title: "Settings",
    items: [
      { key: "settings", label: "Settings", icon: "⚙️" },
    ],
  },
  {
    title: "Extras",
    items: [
      { key: "reviews", label: "Reviews", icon: "⭐" },
      { key: "coupons", label: "Coupons", icon: "🏷️" },
      { key: "designs", label: "Saved Designs", icon: "🎨" },
      { key: "blog", label: "Blog", icon: "📝" },
      { key: "showrooms", label: "Showrooms", icon: "📍" },
    ],
  },
];

const TITLES: Record<PanelKey, string> = {
  dashboard: "Dashboard",
  visitors: "Visitor Analytics",
  orders: "Orders",
  customers: "Customers",
  products: "Product Manager",
  bookings: "Quote Requests",
  reviews: "Reviews",
  coupons: "Coupons",
  blog: "Blog",
  designs: "Saved Designs",
  showrooms: "Showrooms",
  settings: "Settings",
};

function AdminHome() {
  const [panel, setPanel] = useState<PanelKey>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
      );
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen flex admin-shell text-[#E8E8F0]" style={{ background: "#0F0F13" }}>
      <style>{`
        .admin-shell { font-family: 'DM Sans', 'Plus Jakarta Sans', system-ui, sans-serif; }
        .admin-serif { font-family: 'Cormorant Garamond', 'Playfair Display', serif; }
        .admin-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .admin-scroll::-webkit-scrollbar-thumb { background:#2A2A38; border-radius: 3px; }
        @keyframes admin-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }
        .admin-live-dot { animation: admin-pulse 2s infinite; }
      `}</style>

      {sidebarOpen && (
        <button
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={`fixed z-50 top-0 bottom-0 left-0 w-60 flex flex-col border-r transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "#16161D", borderColor: "#2A2A38" }}
      >
        <div className="px-6 py-5 border-b" style={{ borderColor: "#2A2A38" }}>
          <h2 className="admin-serif text-xl font-semibold" style={{ color: "#C8A86B" }}>
            True Furniture's
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color: "#888899" }}>
            Admin Panel · Indore
          </p>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto admin-scroll">
          {NAV.map((group) => (
            <div key={group.title}>
              {group.title && (
                <div
                  className="px-5 pt-3 pb-1 text-[10px] tracking-[0.14em] uppercase"
                  style={{ color: "#888899" }}
                >
                  {group.title}
                </div>
              )}
              {group.items.map((item) => {
                const active = panel === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setPanel(item.key);
                      setSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-6 py-2.5 text-[13px] text-left transition-colors border-l-2"
                    style={{
                      color: active ? "#C8A86B" : "#888899",
                      background: active ? "rgba(200,168,107,0.06)" : "transparent",
                      borderLeftColor: active ? "#C8A86B" : "transparent",
                    }}
                  >
                    <span className="text-base w-4">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center gap-3 px-6 py-2.5 text-[13px] text-left transition-colors border-l-2 border-l-transparent"
            style={{ color: "#888899" }}
          >
            <span className="text-base w-4">🌐</span>
            <span>View Store</span>
          </a>
        </nav>
        <div className="p-5 border-t" style={{ borderColor: "#2A2A38" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
              style={{ background: "#C8A86B", color: "#1a1a1a" }}
            >
              AD
            </div>
            <div className="min-w-0">
              <div className="text-sm truncate">Admin</div>
              <div className="text-[11px]" style={{ color: "#888899" }}>
                Super Administrator
              </div>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex-1 flex flex-col lg:ml-60 min-w-0">
        <header
          className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-8 py-3 border-b"
          style={{ background: "#16161D", borderColor: "#2A2A38" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-lg px-2 -ml-2"
              aria-label="Open menu"
            >
              ☰
            </button>
            <div className="text-[15px] font-semibold truncate">{TITLES[panel]}</div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block text-[12px]" style={{ color: "#888899" }}>
              {now}
            </div>
            <div
              className="hidden sm:flex items-center rounded-full px-2.5 py-1 text-[11px]"
              style={{
                background: "rgba(200,168,107,0.12)",
                border: "1px solid rgba(200,168,107,0.2)",
                color: "#C8A86B",
              }}
            >
              <span
                className="w-2 h-2 rounded-full admin-live-dot mr-2"
                style={{ background: "#4CAF82" }}
              />
              Live
            </div>
            <Link
              to="/"
              className="rounded-md px-3 py-1.5 text-[12px] font-medium"
              style={{ background: "#C8A86B", color: "#1a1a1a" }}
            >
              View Store ↗
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md px-3 py-1.5 text-[12px] font-medium"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #2A2A38", color: "#E8E8F0" }}
            >
              ↺ Refresh
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 overflow-x-hidden">
          {panel === "dashboard" && <Dashboard onGo={setPanel} />}
          {panel === "visitors" && <Visitors />}
          {panel === "orders" && <Orders />}
          {panel === "customers" && <Customers />}
          {panel === "products" && <Products />}
          {panel === "bookings" && <Bookings />}
          {panel === "reviews" && <Reviews />}
          {panel === "coupons" && <Coupons />}
          {panel === "blog" && <Blog />}
          {panel === "designs" && <Designs />}
          {panel === "showrooms" && <Showrooms />}
          {panel === "settings" && <Settings />}
        </main>
      </div>
    </div>
  );
}

function SignOutButton() {
  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        window.location.href = "/";
      }}
      className="mt-3 w-full rounded-md text-[12px] py-2 transition-colors"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid #2A2A38",
        color: "#888899",
      }}
    >
      Sign Out
    </button>
  );
}

/* ================= UI PRIMITIVES ================= */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl p-5 ${className}`}
      style={{ background: "#1E1E28", border: "1px solid #2A2A38" }}
    >
      {children}
    </div>
  );
}

function CardTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="text-[13px] font-semibold">{children}</div>
      {right && <div className="text-[11px]" style={{ color: "#888899" }}>{right}</div>}
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  change,
  changeType = "up",
}: {
  label: string;
  value: string | number;
  icon: string;
  change?: string;
  changeType?: "up" | "dn";
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="text-[11px]" style={{ color: "#888899" }}>{label}</div>
        <div className="text-xl opacity-40">{icon}</div>
      </div>
      <div className="admin-serif text-3xl font-semibold mt-1">{value}</div>
      {change && (
        <div
          className="text-[11px] mt-1"
          style={{ color: changeType === "up" ? "#4CAF82" : "#E05050" }}
        >
          {changeType === "up" ? "↑" : "↓"} {change}
        </div>
      )}
    </Card>
  );
}

function DarkInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md px-3 py-2 text-[13px] outline-none ${props.className ?? ""}`}
      style={{ background: "#16161D", border: "1px solid #2A2A38", color: "#E8E8F0" }}
    />
  );
}

function DarkSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`rounded-md px-2.5 py-1.5 text-[12px] outline-none ${props.className ?? ""}`}
      style={{ background: "#16161D", border: "1px solid #2A2A38", color: "#E8E8F0" }}
    />
  );
}

function DarkTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md px-3 py-2 text-[13px] outline-none resize-none ${props.className ?? ""}`}
      style={{ background: "#16161D", border: "1px solid #2A2A38", color: "#E8E8F0" }}
    />
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    delivered: "#4CAF82",
    completed: "#4CAF82",
    confirmed: "#4CAF82",
    processing: "#C8A86B",
    in_production: "#C8A86B",
    quality_check: "#C8A86B",
    pending: "#C8A86B",
    pending_deposit: "#C8A86B",
    shipped: "#5090E0",
    out_for_delivery: "#5090E0",
    cancelled: "#E05050",
  };
  const color = map[status] ?? "#888899";
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize"
      style={{ background: `${color}26`, color }}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function DataTable({
  head,
  children,
  empty,
}: {
  head: string[];
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="overflow-x-auto admin-scroll">
      <table className="w-full border-collapse min-w-[640px]">
        <thead>
          <tr>
            {head.map((h) => (
              <th
                key={h}
                className="text-left text-[11px] font-medium uppercase tracking-[0.08em] px-3 py-2 border-b"
                style={{ color: "#888899", borderColor: "#2A2A38" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-[13px]">{children}</tbody>
      </table>
      {empty && (
        <div className="text-center py-10 text-[13px]" style={{ color: "#888899" }}>
          No data yet.
        </div>
      )}
    </div>
  );
}

/* ================= DASHBOARD ================= */

function Dashboard({ onGo }: { onGo: (p: PanelKey) => void }) {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [orders, bookings, customers, reviews, products] = await Promise.all([
        supabase.from("orders").select("id, total, status, delivery_city, created_at, order_number, sofa_snapshot"),
        supabase.from("showroom_bookings").select("id, status, created_at, full_name, phone, preferred_date, showroom_id"),
        supabase.from("profiles").select("id, city"),
        supabase.from("reviews").select("id, approved"),
        supabase.from("sofas").select("id"),
      ]);
      return {
        orders: orders.data ?? [],
        bookings: bookings.data ?? [],
        customers: customers.data ?? [],
        reviews: reviews.data ?? [],
        products: products.data ?? [],
      };
    },
  });

  const orders = data?.orders ?? [];
  const totalRevenue = orders.reduce((n, o: { total: number }) => n + Number(o.total), 0);
  const activeOrders = orders.filter(
    (o: { status: string }) => !["delivered", "cancelled"].includes(o.status),
  ).length;
  const cities = Array.from(
    new Set(orders.map((o: { delivery_city: string | null }) => o.delivery_city).filter(Boolean)),
  );
  const pendingBookings = (data?.bookings ?? []).filter((b: { status: string }) => b.status === "pending").length;
  const pendingReviews = (data?.reviews ?? []).filter((r: { approved: boolean }) => !r.approved).length;

  // 7-day bar chart
  const days = useMemo(() => {
    const arr: { label: string; count: number; iso: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      arr.push({
        label: d.toLocaleDateString("en-IN", { weekday: "short" }),
        iso: d.toISOString().slice(0, 10),
        count: 0,
      });
    }
    for (const o of orders) {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      const bucket = arr.find((a) => a.iso === key);
      if (bucket) bucket.count += 1;
    }
    return arr;
  }, [orders]);
  const maxCount = Math.max(1, ...days.map((d) => d.count));

  // Top locations
  const locCounts: Record<string, number> = {};
  for (const o of orders) {
    if (o.delivery_city) locCounts[o.delivery_city] = (locCounts[o.delivery_city] || 0) + 1;
  }
  const sortedLocs = Object.entries(locCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxLoc = sortedLocs[0]?.[1] ?? 1;

  const recent = orders
    .slice()
    .sort(
      (a: { created_at: string }, b: { created_at: string }) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Metric label="Total Revenue" value={formatINR(totalRevenue)} icon="💰" change={`${orders.length} orders`} />
        <Metric label="Active Orders" value={activeOrders} icon="📦" change="in production" />
        <Metric label="Products" value={data?.products.length ?? 0} icon="🛋️" change="live catalog" />
        <Metric label="Cities Reached" value={cities.length} icon="📍" change={cities.slice(0, 2).join(", ") || "—"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardTitle right="Last 7 days">Order Activity</CardTitle>
            <div className="flex items-end gap-1.5 h-28">
              {days.map((d) => (
                <div
                  key={d.iso}
                  title={`${d.count} orders`}
                  className="flex-1 rounded-t transition-opacity hover:opacity-100"
                  style={{
                    height: `${Math.max(4, Math.round((d.count / maxCount) * 100))}%`,
                    background: "#C8A86B",
                    opacity: 0.75,
                  }}
                />
              ))}
            </div>
            <div className="flex gap-1.5 mt-2">
              {days.map((d) => (
                <div
                  key={d.iso}
                  className="flex-1 text-center text-[10px]"
                  style={{ color: "#888899" }}
                >
                  {d.label}
                </div>
              ))}
            </div>
          </Card>
        </div>
        <Card>
          <CardTitle>Quick Actions</CardTitle>
          <div className="space-y-2">
            {[
              { p: "orders" as PanelKey, l: `Review orders (${activeOrders})`, i: "📦" },
              { p: "bookings" as PanelKey, l: `Bookings pending (${pendingBookings})`, i: "💬" },
              { p: "reviews" as PanelKey, l: `Reviews to approve (${pendingReviews})`, i: "⭐" },
              { p: "products" as PanelKey, l: "Add new product", i: "＋" },
              { p: "coupons" as PanelKey, l: "Create coupon", i: "🏷️" },
            ].map((a) => (
              <button
                key={a.p + a.l}
                onClick={() => onGo(a.p)}
                className="w-full flex items-center gap-3 text-left rounded-md px-3 py-2 text-[13px] transition-colors"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #2A2A38" }}
              >
                <span className="w-5 text-center">{a.i}</span>
                <span className="flex-1">{a.l}</span>
                <span style={{ color: "#888899" }}>→</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle right={sortedLocs.length ? `${cities.length} cities` : ""}>
            Top Locations
          </CardTitle>
          {sortedLocs.length === 0 ? (
            <div className="text-center py-8 text-[13px]" style={{ color: "#888899" }}>
              No orders with a delivery city yet.
            </div>
          ) : (
            <div>
              {sortedLocs.map(([city, n]) => (
                <div
                  key={city}
                  className="flex items-center gap-3 py-2 border-b last:border-b-0"
                  style={{ borderColor: "rgba(42,42,56,0.5)" }}
                >
                  <span className="flex-1 text-[13px]">📍 {city}</span>
                  <div
                    className="w-28 h-1.5 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((Number(n) / Number(maxLoc)) * 100)}%`,
                        background: "#C8A86B",
                      }}
                    />
                  </div>
                  <span className="text-[12px] w-8 text-right" style={{ color: "#888899" }}>
                    {n}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle right="Latest orders">Recent Activity</CardTitle>
          {recent.length === 0 ? (
            <div className="text-center py-8 text-[13px]" style={{ color: "#888899" }}>
              No orders yet.
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((o) => {
                const snap = (o.sofa_snapshot ?? {}) as { name?: string };
                return (
                  <div
                    key={o.id}
                    className="flex items-center gap-3 py-2 border-b last:border-b-0"
                    style={{ borderColor: "rgba(42,42,56,0.5)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] truncate">
                        <span className="font-semibold">{o.order_number}</span>{" "}
                        <span style={{ color: "#888899" }}>· {snap.name ?? "Custom"}</span>
                      </div>
                      <div className="text-[11px]" style={{ color: "#888899" }}>
                        {o.delivery_city ?? "—"} · {formatDate(o.created_at)}
                      </div>
                    </div>
                    <div className="text-[12px] font-medium">{formatINR(Number(o.total))}</div>
                    <StatusPill status={o.status} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ================= ORDERS ================= */

function Orders() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, total, deposit_paid, balance_due, status, delivery_city, phone, created_at, expected_delivery_date, sofa_snapshot, discount_code")
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
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const filtered = (orders ?? []).filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (q) {
      const s = q.toLowerCase();
      const snap = (o.sofa_snapshot ?? {}) as { name?: string };
      return (
        o.order_number.toLowerCase().includes(s) ||
        (o.delivery_city ?? "").toLowerCase().includes(s) ||
        (o.phone ?? "").toLowerCase().includes(s) ||
        (snap.name ?? "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  const statuses = ["all", ...ORDER_STATUS_STEPS.map((s) => s.key), "cancelled"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <DarkInput
          placeholder="Search order, city, phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: "1 1 220px", minWidth: 200, background: "#16161D", border: "1px solid #2A2A38", color: "#E8E8F0" }}
        />
        <DarkSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s.replaceAll("_", " ")}
            </option>
          ))}
        </DarkSelect>
      </div>

      <Card className="!p-0">
        {isLoading ? (
          <div className="p-10 text-center text-[13px]" style={{ color: "#888899" }}>Loading…</div>
        ) : (
          <DataTable
            head={["Order", "Product", "City / Phone", "Amount", "Status", "ETA", ""]}
            empty={filtered.length === 0}
          >
            {filtered.map((o) => {
              const snap = (o.sofa_snapshot ?? {}) as { name?: string };
              return (
                <tr
                  key={o.id}
                  className="border-b last:border-b-0"
                  style={{ borderColor: "rgba(42,42,56,0.5)" }}
                >
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/admin/orders/$id", params: { id: o.id } })}
                      className="font-semibold hover:underline text-left"
                      style={{ color: "#C8A86B", background: "transparent" }}
                    >
                      {o.order_number}
                    </button>
                    <div className="text-[10px]" style={{ color: "#888899" }}>{formatDate(o.created_at)}</div>
                    {o.discount_code && (
                      <div className="text-[10px]" style={{ color: "#C8A86B" }}>✓ {o.discount_code}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">{snap.name ?? "Custom"}</td>
                  <td className="px-3 py-2.5">
                    <div>{o.delivery_city ?? "—"}</div>
                    <a href={`tel:${o.phone}`} className="text-[11px]" style={{ color: "#888899" }}>
                      {o.phone}
                    </a>
                  </td>
                  <td className="px-3 py-2.5">
                    <div>{formatINR(Number(o.total))}</div>
                    <div className="text-[10px]" style={{ color: "#888899" }}>
                      Bal {formatINR(Number(o.balance_due))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <DarkSelect
                      value={o.status}
                      onChange={(e) => update(o.id, { status: e.target.value })}
                    >
                      {ORDER_STATUS_STEPS.map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                      <option value="cancelled">Cancelled</option>
                    </DarkSelect>
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="date"
                      defaultValue={o.expected_delivery_date ?? ""}
                      onBlur={(e) =>
                        e.target.value !== o.expected_delivery_date &&
                        update(o.id, { expected_delivery_date: e.target.value || null })
                      }
                      className="rounded-md px-2 py-1 text-[12px]"
                      style={{ background: "#16161D", border: "1px solid #2A2A38", color: "#E8E8F0" }}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/admin/orders/$id", params: { id: o.id } })}
                      className="text-[11px] underline"
                      style={{ color: "#C8A86B", background: "transparent" }}
                    >
                      View →
                    </button>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </Card>
    </div>
  );
}

/* ================= CUSTOMERS ================= */

function Customers() {
  const navigate = useNavigate();
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
    <Card className="!p-0">
      <DataTable
        head={["Name", "Phone", "City", "Orders", "Lifetime", "Joined", ""]}
        empty={(data ?? []).length === 0}
      >
        {(data ?? []).map((c) => (
          <tr
            key={c.id}
            className="border-b last:border-b-0 cursor-pointer hover:bg-white/[0.02]"
            style={{ borderColor: "rgba(42,42,56,0.5)" }}
            onClick={() => navigate({ to: "/admin/customers/$id", params: { id: c.id } })}
          >
            <td className="px-3 py-2.5">
              <span className="hover:underline font-medium" style={{ color: "#C8A86B" }}>
                {c.full_name ?? "Unnamed"}
              </span>
            </td>
            <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
              <a href={`https://wa.me/91${c.phone ?? ""}`} target="_blank" rel="noreferrer" style={{ color: "#C8A86B" }}>
                {c.phone ?? "—"}
              </a>
            </td>
            <td className="px-3 py-2.5">{c.city ?? "—"}</td>
            <td className="px-3 py-2.5">{c.count}</td>
            <td className="px-3 py-2.5">{formatINR(c.sum)}</td>
            <td className="px-3 py-2.5 text-[11px]" style={{ color: "#888899" }}>
              {formatDate(c.created_at)}
            </td>
            <td className="px-3 py-2.5 text-right">
              <span className="text-[11px] underline" style={{ color: "#C8A86B" }}>View →</span>
            </td>
          </tr>
        ))}
      </DataTable>
    </Card>
  );
}

/* ================= PRODUCTS ================= */

type SofaRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  base_price: number;
  sale_price: number | null;
  hero_image: string | null;
  is_published: boolean;
  is_featured: boolean;
  lead_time_days: number;
};

function Products() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<SofaRow> | null>(null);

  const { data } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sofas")
        .select("id, slug, name, tagline, description, base_price, sale_price, hero_image, is_published, is_featured, lead_time_days")
        .order("sort_order");
      return (data ?? []) as SofaRow[];
    },
  });

  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from("sofas").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    const { error } = await supabase.from("sofas").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const filtered = (data ?? []).filter((p) =>
    search ? p.name.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center">
        <DarkInput
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 240px", minWidth: 200, background: "#16161D", border: "1px solid #2A2A38", color: "#E8E8F0" }}
        />
        <button
          onClick={() => setEditing({})}
          className="rounded-md px-4 py-2 text-[13px] font-semibold"
          style={{ background: "#C8A86B", color: "#1a1a1a" }}
        >
          + Add Product
        </button>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}>
        {filtered.map((p) => (
          <div
            key={p.id}
            className="rounded-xl overflow-hidden transition-colors"
            style={{ background: "#1E1E28", border: "1px solid #2A2A38" }}
          >
            <div className="h-36 overflow-hidden" style={{ background: "#1a1a22" }}>
              {p.hero_image ? (
                <img src={p.hero_image} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl opacity-30">🛋️</div>
              )}
            </div>
            <div className="p-4 space-y-2">
              <div className="text-[14px] font-semibold truncate">{p.name}</div>
              <div className="text-[13px]" style={{ color: "#C8A86B" }}>
                {formatINR(Number(p.sale_price ?? p.base_price))}
                {p.sale_price && (
                  <span className="ml-2 text-[11px] line-through" style={{ color: "#888899" }}>
                    {formatINR(Number(p.base_price))}
                  </span>
                )}
              </div>
              <div className="text-[11px]" style={{ color: "#888899" }}>
                {p.lead_time_days}d lead
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEditing(p)}
                  className="flex-1 rounded-md py-1.5 text-[12px]"
                  style={{ background: "transparent", border: "1px solid #2A2A38", color: "#E8E8F0" }}
                >
                  Edit
                </button>
                <button
                  onClick={() => del(p.id, p.name)}
                  className="flex-1 rounded-md py-1.5 text-[12px]"
                  style={{ background: "transparent", border: "1px solid #2A2A38", color: "#E05050" }}
                >
                  Delete
                </button>
              </div>
              <label className="flex items-center gap-2 text-[11px] pt-1" style={{ color: "#888899" }}>
                <input
                  type="checkbox"
                  defaultChecked={p.is_published}
                  onChange={(e) => update(p.id, { is_published: e.target.checked })}
                />
                Live on store
              </label>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-[13px]" style={{ color: "#888899" }}>
            No products match.
          </div>
        )}
      </div>

      {editing && (
        <ProductModal
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin-products"] });
          }}
        />
      )}
    </div>
  );
}

function ProductModal({
  product,
  onClose,
  onSaved,
}: {
  product: Partial<SofaRow>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(product.id);
  const [name, setName] = useState(product.name ?? "");
  const [slug, setSlug] = useState(product.slug ?? "");
  const [tagline, setTagline] = useState(product.tagline ?? "");
  const [basePrice, setBasePrice] = useState<string>(product.base_price ? String(product.base_price) : "");
  const [salePrice, setSalePrice] = useState<string>(product.sale_price ? String(product.sale_price) : "");
  const [heroImage, setHeroImage] = useState(product.hero_image ?? "");
  const [description, setDescription] = useState(product.description ?? "");
  const [leadTime, setLeadTime] = useState<string>(String(product.lead_time_days ?? 30));
  const [isPublished, setIsPublished] = useState(product.is_published ?? true);
  const [saving, setSaving] = useState(false);

  const autoSlug = (v: string) =>
    v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const save = async () => {
    if (!name.trim() || !basePrice) {
      toast.error("Name and base price are required");
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      slug: (slug || autoSlug(name)).trim(),
      tagline: tagline || null,
      description: description || null,
      base_price: Number(basePrice),
      sale_price: salePrice ? Number(salePrice) : null,
      hero_image: heroImage || null,
      lead_time_days: Number(leadTime) || 30,
      is_published: isPublished,
    };
    const { error } = isEdit
      ? await supabase.from("sofas").update(payload).eq("id", product.id!)
      : await supabase.from("sofas").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(isEdit ? "Product updated" : "Product created");
    onSaved();
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-6 sm:p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto admin-scroll"
        style={{ background: "#1E1E28", border: "1px solid #2A2A38" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="text-[17px] font-semibold">{isEdit ? "Edit Product" : "Add New Product"}</div>
          <button onClick={onClose} className="text-xl" style={{ color: "#888899" }}>×</button>
        </div>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Product Name">
              <DarkInput
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!isEdit) setSlug(autoSlug(e.target.value));
                }}
                placeholder="Royale Sectional"
              />
            </Field>
            <Field label="Slug (URL)">
              <DarkInput
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="royale-sectional"
              />
            </Field>
          </div>
          <Field label="Tagline">
            <DarkInput value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Optional short strapline" />
          </Field>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Base Price (₹)">
              <DarkInput type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="48500" />
            </Field>
            <Field label="Sale Price (₹)">
              <DarkInput type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="Optional" />
            </Field>
            <Field label="Lead Days">
              <DarkInput type="number" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} placeholder="30" />
            </Field>
          </div>
          <Field label="Hero Image URL">
            <DarkInput value={heroImage} onChange={(e) => setHeroImage(e.target.value)} placeholder="https://…" />
            {heroImage && (
              <img src={heroImage} alt="" className="mt-3 w-full h-40 object-cover rounded-md" />
            )}
          </Field>
          <Field label="Description">
            <DarkTextarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the product…" />
          </Field>
          <label className="flex items-center gap-2 text-[13px]" style={{ color: "#888899" }}>
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
            />
            Publish immediately
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="rounded-md px-5 py-2.5 text-[13px]"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #2A2A38", color: "#888899" }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 rounded-md py-2.5 text-[13px] font-semibold disabled:opacity-60"
            style={{ background: "#C8A86B", color: "#1a1a1a" }}
          >
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.08em] mb-1.5" style={{ color: "#888899" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

/* ================= BOOKINGS ================= */

function Bookings() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () =>
      (await supabase
        .from("showroom_bookings")
        .select("*, showroom:showrooms(name, city)")
        .order("preferred_date", { ascending: true })).data ?? [],
  });
  const update = async (id: string, status: string) => {
    const { error } = await supabase.from("showroom_bookings").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-bookings"] });
  };
  return (
    <div className="space-y-3">
      {(data ?? []).map((b) => {
        const sr = (b as { showroom?: { name?: string; city?: string } }).showroom;
        return (
          <Card key={b.id}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[220px]">
                <div className="font-semibold text-[14px]">
                  {b.full_name} · {b.party_size} guest{b.party_size === 1 ? "" : "s"}
                </div>
                <div className="text-[12px]" style={{ color: "#888899" }}>
                  {sr?.name ?? "—"} · {b.preferred_date} · {b.preferred_time}
                </div>
                <div className="text-[11px] mt-1" style={{ color: "#888899" }}>
                  {b.phone}
                  {b.email && ` · ${b.email}`}
                </div>
                {b.notes && (
                  <div className="text-[11px] italic mt-1" style={{ color: "#888899" }}>
                    "{b.notes}"
                  </div>
                )}
              </div>
              <DarkSelect value={b.status} onChange={(e) => update(b.id, e.target.value)}>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </DarkSelect>
              <a
                href={`https://wa.me/91${b.phone}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md px-3 py-1.5 text-[12px] font-medium"
                style={{ background: "#C8A86B", color: "#1a1a1a" }}
              >
                WhatsApp
              </a>
            </div>
          </Card>
        );
      })}
      {(data ?? []).length === 0 && (
        <Card>
          <div className="text-center py-8 text-[13px]" style={{ color: "#888899" }}>
            No booking requests yet.
          </div>
        </Card>
      )}
    </div>
  );
}

/* ================= REVIEWS ================= */

function Reviews() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () =>
      (await supabase.from("reviews").select("*, sofa:sofas(name)").order("created_at", { ascending: false })).data ?? [],
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
        <Card key={r.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[13px]" style={{ color: "#C8A86B" }}>
                {"★".repeat(r.rating)}
                <span style={{ color: "#2A2A38" }}>{"★".repeat(5 - r.rating)}</span>
              </div>
              {r.title && <div className="admin-serif text-lg mt-1">{r.title}</div>}
              <p className="text-[13px] mt-1" style={{ color: "#E8E8F0", opacity: 0.85 }}>{r.body}</p>
              <div className="text-[11px] mt-2" style={{ color: "#888899" }}>
                {(r as { sofa?: { name?: string } }).sofa?.name ?? "—"} · {r.city ?? "—"} · {formatDate(r.created_at)}
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end shrink-0">
              <label className="text-[12px] flex items-center gap-2" style={{ color: "#888899" }}>
                <input type="checkbox" checked={r.approved} onChange={(e) => setApproved(r.id, e.target.checked)} />
                Public
              </label>
              <button onClick={() => del(r.id)} className="text-[11px]" style={{ color: "#E05050" }}>
                Delete
              </button>
            </div>
          </div>
        </Card>
      ))}
      {(data ?? []).length === 0 && (
        <Card>
          <div className="text-center py-8 text-[13px]" style={{ color: "#888899" }}>
            No reviews yet.
          </div>
        </Card>
      )}
    </div>
  );
}

/* ================= COUPONS ================= */

function Coupons() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () =>
      (await supabase.from("coupons").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const create = async () => {
    const code = prompt("Coupon code (e.g. DIWALI10)")?.toUpperCase().trim();
    if (!code) return;
    const type = confirm("OK = Percent off, Cancel = Flat amount off") ? "percent" : "flat";
    const value = Number(prompt(type === "percent" ? "Percent (1-100)" : "Flat amount in ₹") ?? "0");
    if (!value) return;
    const min = Number(prompt("Minimum order amount (₹) — 0 for none", "0") ?? "0");
    const { error } = await supabase.from("coupons").insert({
      code,
      discount_type: type,
      discount_value: value,
      min_order_amount: min,
      active: true,
    });
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
    <div className="space-y-4">
      <button
        onClick={create}
        className="rounded-md px-4 py-2 text-[13px] font-semibold"
        style={{ background: "#C8A86B", color: "#1a1a1a" }}
      >
        + New Coupon
      </button>
      <Card className="!p-0">
        <div className="divide-y" style={{ borderColor: "#2A2A38" }}>
          {(data ?? []).map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 p-4" style={{ borderTop: "1px solid rgba(42,42,56,0.5)" }}>
              <div className="flex-1 min-w-[180px]">
                <div className="font-mono font-semibold">{c.code}</div>
                <div className="text-[11px]" style={{ color: "#888899" }}>
                  {c.discount_type === "percent" ? `${c.discount_value}% off` : `${formatINR(Number(c.discount_value))} off`}
                  {Number(c.min_order_amount) > 0 && ` · min ${formatINR(Number(c.min_order_amount))}`}
                  {" · "}used {c.uses_count} times
                </div>
              </div>
              <label className="text-[12px] flex items-center gap-2" style={{ color: "#888899" }}>
                <input type="checkbox" checked={c.active} onChange={(e) => toggle(c.id, e.target.checked)} />
                Active
              </label>
              <button onClick={() => del(c.id)} className="text-[11px]" style={{ color: "#E05050" }}>
                Delete
              </button>
            </div>
          ))}
          {(data ?? []).length === 0 && (
            <div className="p-8 text-center text-[13px]" style={{ color: "#888899" }}>
              No coupons yet.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ================= BLOG ================= */

function Blog() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-blog"],
    queryFn: async () =>
      (await supabase
        .from("blog_posts")
        .select("id, slug, title, is_published, created_at")
        .order("created_at", { ascending: false })).data ?? [],
  });
  const create = async () => {
    const title = prompt("Post title");
    if (!title) return;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await supabase.from("blog_posts").insert({
      title,
      slug,
      content: "Write your post here…",
      excerpt: "",
      is_published: false,
    });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-blog"] });
  };
  const toggle = async (id: string, published: boolean) => {
    const { error } = await supabase
      .from("blog_posts")
      .update({ is_published: published, published_at: published ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-blog"] });
  };
  const del = async (id: string) => {
    if (!confirm("Delete post?")) return;
    await supabase.from("blog_posts").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-blog"] });
  };
  return (
    <div className="space-y-4">
      <button
        onClick={create}
        className="rounded-md px-4 py-2 text-[13px] font-semibold"
        style={{ background: "#C8A86B", color: "#1a1a1a" }}
      >
        + New Post
      </button>
      <Card className="!p-0">
        {(data ?? []).map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center gap-3 p-4 border-t first:border-t-0"
            style={{ borderColor: "rgba(42,42,56,0.5)" }}
          >
            <div className="flex-1 min-w-0">
              <Link to="/blog/$slug" params={{ slug: p.slug }} className="font-semibold hover:text-[color:#C8A86B]">
                {p.title}
              </Link>
              <div className="text-[11px]" style={{ color: "#888899" }}>/{p.slug}</div>
            </div>
            <label className="text-[12px] flex items-center gap-2" style={{ color: "#888899" }}>
              <input type="checkbox" defaultChecked={p.is_published} onChange={(e) => toggle(p.id, e.target.checked)} />
              Published
            </label>
            <button onClick={() => del(p.id)} className="text-[11px]" style={{ color: "#E05050" }}>
              Delete
            </button>
          </div>
        ))}
        {(data ?? []).length === 0 && (
          <div className="p-8 text-center text-[13px]" style={{ color: "#888899" }}>
            No posts yet.
          </div>
        )}
      </Card>
    </div>
  );
}

/* ================= DESIGNS ================= */

function Designs() {
  const { data } = useQuery({
    queryKey: ["admin-designs"],
    queryFn: async () =>
      (await supabase
        .from("saved_designs")
        .select("id, name, created_at, share_token, sofa:sofas(name)")
        .order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <Card className="!p-0">
      {(data ?? []).map((d) => (
        <div
          key={d.id}
          className="flex flex-wrap items-center gap-3 p-4 border-t first:border-t-0"
          style={{ borderColor: "rgba(42,42,56,0.5)" }}
        >
          <div className="flex-1">
            <span className="font-semibold">{d.name}</span>
            <span className="text-[11px] ml-2" style={{ color: "#888899" }}>
              {(d as { sofa?: { name?: string } }).sofa?.name}
            </span>
          </div>
          <Link
            to="/shared-design/$token"
            params={{ token: d.share_token }}
            className="rounded-md px-3 py-1.5 text-[12px]"
            style={{ border: "1px solid #2A2A38", color: "#E8E8F0" }}
          >
            Preview
          </Link>
          <span className="text-[11px]" style={{ color: "#888899" }}>{formatDate(d.created_at)}</span>
        </div>
      ))}
      {(data ?? []).length === 0 && (
        <div className="p-8 text-center text-[13px]" style={{ color: "#888899" }}>
          No saved designs yet.
        </div>
      )}
    </Card>
  );
}

/* ================= SHOWROOMS ================= */

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
        <Card key={s.id}>
          <div className="admin-serif text-xl mb-1">{s.name}</div>
          <div className="text-[12px] mb-3" style={{ color: "#888899" }}>{s.city}</div>
          <div className="space-y-2">
            <DarkTextarea
              defaultValue={s.address ?? ""}
              rows={2}
              onBlur={(e) => e.target.value !== s.address && update(s.id, { address: e.target.value })}
              placeholder="Address"
            />
            <DarkInput
              defaultValue={s.phone ?? ""}
              onBlur={(e) => e.target.value !== s.phone && update(s.id, { phone: e.target.value })}
              placeholder="Phone"
            />
            <DarkInput
              defaultValue={s.hours ?? ""}
              onBlur={(e) => e.target.value !== s.hours && update(s.id, { hours: e.target.value })}
              placeholder="Hours"
            />
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ================= SETTINGS ================= */

function Settings() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardTitle>Store Information</CardTitle>
        <div className="space-y-3">
          <Field label="Store Name"><DarkInput defaultValue="True Furniture's" /></Field>
          <Field label="Phone"><DarkInput defaultValue="+91 77738 96496" /></Field>
          <Field label="WhatsApp"><DarkInput defaultValue="+91 77738 96496" /></Field>
          <Field label="Email"><DarkInput defaultValue="hello@truefurnitures.in" /></Field>
          <Field label="Address"><DarkInput defaultValue="Vijay Nagar, Indore — 452010" /></Field>
          <button
            onClick={() => toast.success("Settings saved locally. Wire to a `store_settings` table when needed.")}
            className="rounded-md px-4 py-2 text-[13px] font-semibold"
            style={{ background: "#C8A86B", color: "#1a1a1a" }}
          >
            Save Changes
          </button>
        </div>
      </Card>
      <Card>
        <CardTitle>Feature Toggles</CardTitle>
        <div className="space-y-3">
          {[
            ["3D Configurator", "Interactive models on product pages", true],
            ["Welcome Modal", "First-visit location + discount popup", true],
            ["Auto-confirm Orders", "Skip manual review for online deposits", false],
            ["Newsletter Signup", "Footer + welcome modal capture", true],
            ["Blog", "Public /blog route visible", true],
          ].map(([label, hint, on]) => (
            <div
              key={label as string}
              className="flex items-center justify-between py-2 border-b last:border-b-0"
              style={{ borderColor: "rgba(42,42,56,0.5)" }}
            >
              <div>
                <div className="text-[13px]">{label}</div>
                <div className="text-[11px]" style={{ color: "#888899" }}>{hint}</div>
              </div>
              <FeatureToggle defaultOn={Boolean(on)} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function FeatureToggle({ defaultOn }: { defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      onClick={() => setOn((v) => !v)}
      className="relative w-9 h-5 rounded-full transition-colors"
      style={{ background: on ? "#4CAF82" : "#2A2A38" }}
      aria-pressed={on}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
        style={{ left: on ? "18px" : "2px" }}
      />
    </button>
  );
}

/* ================= VISITOR ANALYTICS ================= */

const V_TYPE_ICONS: Record<string, string> = {
  session: "🌐",
  visit: "📍",
  add_to_cart: "🛒",
  quote: "💬",
  newsletter: "📧",
  product_view: "👁️",
  view_3d: "🧊",
};
const V_TYPE_COLORS: Record<string, string> = {
  session: "#5090E0",
  visit: "#4CAF82",
  add_to_cart: "#B478FF",
  quote: "#C8A86B",
  newsletter: "#E56AA7",
  product_view: "#5090E0",
  view_3d: "#B478FF",
};
const V_ALL_TYPES = ["all", "session", "visit", "product_view", "view_3d", "add_to_cart", "quote", "newsletter"];

function fmtRel(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function Visitors() {
  const [visitors, setVisitors] = useState<VisitorEvent[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    setVisitors(getVisitors());
  }, []);

  const filtered = filter === "all" ? visitors : visitors.filter((v) => v.type === filter);
  const recent = [...filtered].reverse().slice(0, 80);

  const stats = V_ALL_TYPES.filter((t) => t !== "all").map((t) => ({
    type: t,
    count: visitors.filter((v) => v.type === t).length,
  }));

  const cityMap: Record<string, number> = {};
  visitors.filter((v) => v.city).forEach((v) => {
    cityMap[v.city!] = (cityMap[v.city!] || 0) + 1;
  });
  const topCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxCity = topCities[0]?.[1] || 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[15px] font-semibold">Visitor Analytics</div>
          <div className="text-[11px]" style={{ color: "#888899" }}>
            {visitors.length} events tracked · live session
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setVisitors(getVisitors())}
            className="rounded-md px-3 py-1.5 text-[12px]"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #2A2A38", color: "#E8E8F0" }}
          >
            ↺ Refresh
          </button>
          <button
            onClick={() => {
              if (!confirm("Clear all locally tracked visitor events?")) return;
              clearVisitors();
              setVisitors([]);
              toast.success("Visitor log cleared");
            }}
            className="rounded-md px-3 py-1.5 text-[12px]"
            style={{ background: "transparent", border: "1px solid #2A2A38", color: "#E05050" }}
          >
            Clear Log
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[{ type: "all", count: visitors.length }, ...stats].map(({ type, count }) => {
          const active = filter === type;
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className="rounded-xl p-3 text-left transition-all"
              style={{
                background: active ? "rgba(200,168,107,0.06)" : "#1E1E28",
                border: `1px solid ${active ? "#C8A86B" : "#2A2A38"}`,
              }}
            >
              <span className="text-xl block mb-1">{V_TYPE_ICONS[type] || "📊"}</span>
              <div
                className="admin-serif text-2xl font-semibold"
                style={{ color: active ? "#C8A86B" : "#E8E8F0" }}
              >
                {count}
              </div>
              <div className="text-[10px] capitalize" style={{ color: "#888899" }}>
                {type.replaceAll("_", " ")}
              </div>
            </button>
          );
        })}
      </div>

      {topCities.length > 0 && (
        <Card>
          <CardTitle>Top Locations</CardTitle>
          <div className="space-y-2">
            {topCities.map(([city, n]) => (
              <div key={city} className="flex items-center gap-3">
                <span className="text-[13px] flex-1">📍 {city}</span>
                <div
                  className="w-32 h-1.5 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.round((n / maxCity) * 100)}%`, background: "#C8A86B" }}
                  />
                </div>
                <span className="text-[12px] w-6 text-right" style={{ color: "#888899" }}>{n}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="text-[13px] font-semibold">Event Log</div>
          <div className="flex flex-wrap gap-2">
            {["all", "session", "add_to_cart", "quote"].map((t) => {
              const active = filter === t;
              return (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className="text-[11px] px-3 py-1 rounded-full transition-all"
                  style={{
                    background: active ? "#C8A86B" : "transparent",
                    color: active ? "#1a1a1a" : "#888899",
                    border: `1px solid ${active ? "#C8A86B" : "#2A2A38"}`,
                  }}
                >
                  {t === "all" ? "All" : t.replaceAll("_", " ")}
                </button>
              );
            })}
          </div>
        </div>
        {recent.length === 0 ? (
          <div className="text-center py-12" style={{ color: "#888899" }}>
            <div className="text-4xl mb-3">👁️</div>
            <div className="text-[13px]">
              No visitor events yet. Wire <code className="text-[11px]">logVisitor()</code> from
              <span className="mx-1" style={{ color: "#C8A86B" }}>@/lib/visitor-tracker</span>
              into storefront pages to start tracking.
            </div>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto admin-scroll">
            {recent.map((v, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2 border-b last:border-b-0"
                style={{ borderColor: "rgba(42,42,56,0.5)" }}
              >
                <span className="text-base flex-shrink-0">{V_TYPE_ICONS[v.type] || "•"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] truncate">
                    {v.type.replaceAll("_", " ")}
                    {v.item ? ` — ${v.item}` : ""}
                    {v.city ? ` from ${v.city}` : ""}
                    {v.page ? ` (${v.page})` : ""}
                  </div>
                  <div className="text-[10px]" style={{ color: "#888899" }}>
                    {v.ua && `${getDeviceIcon(v.ua)} ${getBrowser(v.ua)}`}
                    {v.screen && ` · ${v.screen}`}
                  </div>
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full capitalize flex-shrink-0"
                  style={{
                    background: `${V_TYPE_COLORS[v.type] || "#888899"}26`,
                    color: V_TYPE_COLORS[v.type] || "#888899",
                  }}
                >
                  {v.type.replaceAll("_", " ")}
                </span>
                <span className="text-[10px] whitespace-nowrap flex-shrink-0" style={{ color: "#888899" }}>
                  {fmtRel(v.time)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}