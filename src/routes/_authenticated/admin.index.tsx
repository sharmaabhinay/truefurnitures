import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { COL, fsList, fsListSorted, fsGet, fsAdd, fsSet, fsUpdate, fsDelete, fsWatch, where, orderBy } from "@/lib/db/firestore";
import { downloadCsv } from "@/lib/export";
import { Pager, usePaged, ACheck } from "@/components/admin/pager";
import { getFirebaseAuth } from "@/lib/firebase";
import { uploadToCloudinary } from "@/lib/upload";
import { getFirebaseApp } from "@/lib/firebase";
import { useAuth } from "@/lib/auth/auth-context";
import { signOut as fbSignOut } from "firebase/auth";
type Json = unknown;
import { formatINR, formatDate, ORDER_STATUS_STEPS } from "@/lib/format";
import { toast } from "sonner";
import { getVisitors, clearVisitors, getDeviceIcon, getBrowser, type VisitorEvent } from "@/lib/visitor-tracker";
import { brandQueryKey, fetchBrand, DEFAULT_BRAND, type BrandSettings } from "@/lib/brand";
import { getRemoteVisitors } from "@/lib/visitor-tracker";
import { BlogManager } from "@/components/admin/blog-manager";
import { CouponManager } from "@/components/admin/coupon-manager";
import { CarpenterManager } from "@/components/admin/carpenter-manager";
import { OrderCreateModal } from "@/components/admin/order-create-modal";
import { CareersManager } from "@/components/admin/careers-manager";
import { CampaignManager } from "@/components/admin/campaign-manager";
import { InboxManager } from "@/components/admin/inbox-manager";
import { TrashManager, DeleteReasonModal } from "@/components/admin/trash-manager";
import { productStatusLabel } from "@/lib/availability";
import { AModal, AInput } from "@/components/admin/ui";
import {
  FiBarChart2, FiEye, FiPackage, FiUsers, FiTool, FiShoppingBag, FiShoppingCart, FiMessageCircle,
  FiSettings, FiStar, FiTag, FiEdit3, FiMapPin, FiFeather, FiBriefcase, FiTrendingUp,
  FiGlobe, FiMenu, FiRefreshCw, FiExternalLink, FiInbox, FiTrash2, FiPlus, FiDownload,
  FiAlertCircle, FiLoader, FiClock,

} from "react-icons/fi";

export const Route = createFileRoute("/_authenticated/admin/")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { p?: string } =>
    typeof search['p'] === "string" ? { p: search['p'] as string } : {},
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
  | "inbox"
  | "trash"
  | "reviews"
  | "coupons"
  | "blog"
  | "carpenters"
  | "carpenterRequests"
  | "designs"
  | "showrooms"
  | "careers"
  | "campaigns"
  | "settings";

type NavItem = { key: PanelKey; label: string; icon: React.ReactNode };
type NavGroup = { title: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { key: "dashboard", label: "Dashboard", icon: <FiBarChart2 /> },
    ],
  },
  {
    title: "",
    items: [
      { key: "visitors", label: "Visitor Analytics", icon: <FiEye /> },
      { key: "orders", label: "Orders", icon: <FiPackage /> },
      { key: "customers", label: "Customers", icon: <FiUsers /> },
      { key: "inbox", label: "Messages", icon: <FiInbox /> },
      { key: "carpenters", label: "Carpenters", icon: <FiTool /> },
    ],
  },
  {
    title: "Store",
    items: [
      { key: "products", label: "Products", icon: <FiShoppingBag /> },
      { key: "bookings", label: "Quote Requests", icon: <FiMessageCircle /> },
    ],
  },
  {
    title: "Growth",
    items: [
      { key: "campaigns", label: "Ad Campaigns", icon: <FiTrendingUp /> },
      { key: "careers", label: "Careers", icon: <FiBriefcase /> },
    ],
  },
  {
    title: "Settings",
    items: [
      { key: "settings", label: "Settings", icon: <FiSettings /> },
    ],
  },
  {
    title: "Extras",
    items: [
      { key: "reviews", label: "Reviews", icon: <FiStar /> },
      { key: "coupons", label: "Coupons", icon: <FiTag /> },
      { key: "designs", label: "Saved Designs", icon: <FiFeather /> },
      { key: "blog", label: "Blog", icon: <FiEdit3 /> },
      { key: "showrooms", label: "Showrooms", icon: <FiMapPin /> },
      { key: "trash", label: "Trash", icon: <FiTrash2 /> },
    ],
  },
];

const TITLES: Record<PanelKey, string> = {
  dashboard: "Dashboard",
  visitors: "Visitor Analytics",
  orders: "Orders",
  customers: "Customers",
  inbox: "Messages",
  trash: "Trash",
  products: "Product Manager",
  bookings: "Quote Requests",
  reviews: "Reviews",
  coupons: "Coupons",
  blog: "Blog & Journal",
  carpenters: "Carpenter Team",
  designs: "Saved Designs",
  showrooms: "Showrooms",
  careers: "Careers & Applications",
  campaigns: "Ad Campaigns",
  settings: "Settings",
};

function AdminHome() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const panel = ((search.p ?? "dashboard") as PanelKey) in TITLES ? ((search.p ?? "dashboard") as PanelKey) : "dashboard";
  const setPanel = (key: PanelKey) =>
    navigate({ to: "/admin", search: key === "dashboard" ? {} : { p: key } });
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
                    <span className="text-base w-4 flex items-center">{item.icon}</span>
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
            <span className="text-base w-4 flex items-center"><FiGlobe /></span>
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
              <FiMenu />
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
              className="rounded-md px-3 py-1.5 text-[12px] font-medium inline-flex items-center gap-1.5"
              style={{ background: "#C8A86B", color: "#1a1a1a" }}
            >
              View Store <FiExternalLink />
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md px-3 py-1.5 text-[12px] font-medium inline-flex items-center gap-1.5"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #2A2A38", color: "#E8E8F0" }}
            >
              <FiRefreshCw /> Refresh
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 overflow-x-hidden">
          {panel === "dashboard" && <Dashboard onGo={setPanel} />}
          {panel === "visitors" && <Visitors />}
          {panel === "orders" && <Orders />}
          {panel === "customers" && <Customers />}
          {panel === "inbox" && <InboxManager />}
          {panel === "trash" && <TrashManager />}
          {panel === "products" && <Products />}
          {panel === "bookings" && <Bookings />}
          {panel === "reviews" && <Reviews />}
          {panel === "coupons" && <CouponManager />}
          {panel === "blog" && <BlogManager />}
          {panel === "carpenters" && <CarpenterManager />}
          {panel === "designs" && <Designs />}
          {panel === "showrooms" && <Showrooms />}
          {panel === "careers" && <CareersManager />}
          {panel === "campaigns" && <CampaignManager />}
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
        await fbSignOut(getFirebaseAuth());
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
        fsList<any>(COL.orders),
        fsList<any>(COL.showroomBookings),
        fsList<any>(COL.profiles),
        fsList<any>(COL.reviews),
        fsList<any>(COL.sofas),
      ]);
      return {
        orders,
        bookings,
        customers,
        reviews,
        products,
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
  const totalUsers = data?.customers.length ?? 0;
  const monthAgo = Date.now() - 30 * 86400_000;
  const monthOrders = orders.filter((o: { created_at: string }) => new Date(o.created_at).getTime() > monthAgo).length;
  const monthRevenue = orders
    .filter((o: { created_at: string }) => new Date(o.created_at).getTime() > monthAgo)
    .reduce((n: number, o: { total: number }) => n + Number(o.total), 0);
  const [visitorCount, setVisitorCount] = useState(0);
  useEffect(() => {
    setVisitorCount(getVisitors().length);
  }, []);

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
        <Metric label="Total Users" value={totalUsers} icon="👥" change={totalUsers ? "signed up" : undefined} />
        <Metric label="Quote Requests" value={pendingBookings} icon="💬" change="awaiting follow-up" />
        <Metric label="Active Products" value={data?.products.length ?? 0} icon="🛋️" change="live catalog" />
        <Metric label="Total Revenue" value={formatINR(totalRevenue)} icon="💰" change={monthRevenue ? `${formatINR(monthRevenue)} this month` : undefined} />
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Metric label="Total Orders" value={orders.length} icon="📦" change={monthOrders ? `+${monthOrders} this month` : undefined} />
        <Metric label="Pending Orders" value={activeOrders} icon="⏳" change="need attention" />
        <Metric label="Cities Reached" value={cities.length} icon="📍" change={cities.slice(0, 2).join(", ") || "via delivery"} />
        <Metric label="Visitor Events" value={visitorCount} icon="👁️" change="tracked live" />
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
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [askDelete, setAskDelete] = useState(false);
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const rows = await fsListSorted<any>(COL.orders, "created_at", "desc");
      return rows;
    },
  });
  const update = async (id: string, patch: any) => {
    try {
      await fsUpdate(COL.orders, id, patch);
    } catch (e) {
      return toast.error(e instanceof Error ? e.message : "Update failed");
    }
    toast.success("Order updated");
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const filtered = (orders ?? []).filter((o) => {
    if (o.deleted_at) return false;
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
  const paged = usePaged(filtered, 20);

  const exportOrders = () =>
    downloadCsv(`orders-${new Date().toISOString().slice(0, 10)}`, filtered.map((o) => ({
      order_number: o.order_number,
      created_at: o.created_at,
      status: o.status,
      product: (o.sofa_snapshot ?? {}).name ?? "Custom",
      customer: o.customer_name ?? "",
      phone: o.phone ?? "",
      email: o.email ?? "",
      city: o.delivery_city ?? "",
      address: o.delivery_address ?? "",
      subtotal: o.subtotal ?? "",
      discount_code: o.discount_code ?? "",
      total: o.total,
      deposit_paid: o.deposit_paid ?? 0,
      balance_due: o.balance_due ?? 0,
      expected_delivery_date: o.expected_delivery_date ?? "",
      assigned_craftsman: o.assigned_craftsman ?? "",
    })));

  const softDelete = async (reason: string) => {
    const stamp = { deleted_at: new Date().toISOString(), deleted_reason: reason, deleted_by: user?.uid ?? null };
    try {
      await Promise.all(selected.map((id) => fsUpdate(COL.orders, id, stamp)));
      toast.success(`Moved ${selected.length} order(s) to trash`);
      setSelected([]);
      setAskDelete(false);
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <DarkInput
          placeholder="Search order, city, phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: "1 1 220px", minWidth: 200, background: "#16161D", border: "1px solid #2A2A38", color: "#E8E8F0" }}
        />
        <button
          onClick={() => setCreateOpen(true)}
          className="rounded-md px-4 py-2 text-[13px] font-semibold"
          style={{ background: "#C8A86B", color: "#1a1a1a" }}
        >
          <span className="inline-flex items-center gap-1.5"><FiPlus /> New Order</span>
        </button>
        {selected.length > 0 && (
          <button
            onClick={() => setAskDelete(true)}
            className="rounded-md px-4 py-2 text-[13px] font-semibold"
            style={{ background: "transparent", color: "#E05050", border: "1px solid rgba(224,80,80,0.4)" }}
          >
            <span className="inline-flex items-center gap-1.5"><FiTrash2 /> Delete {selected.length}</span>
          </button>
        )}
        <DarkSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s.replaceAll("_", " ")}
            </option>
          ))}
        </DarkSelect>
        <button
          onClick={exportOrders}
          disabled={filtered.length === 0}
          className="rounded-md px-4 py-2 text-[13px] font-semibold disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.04)", color: "#E8E8F0", border: "1px solid #2A2A38" }}
        >
          <span className="inline-flex items-center gap-1.5"><FiDownload /> Export</span>
        </button>
        <span className="text-[12px]" style={{ color: "#888899" }}>
          {filtered.length} order{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <Card className="!p-0">
        {isLoading ? (
          <div className="p-10 text-center text-[13px]" style={{ color: "#888899" }}>Loading…</div>
        ) : (
          <DataTable
            head={["", "Order", "Product", "City / Phone", "Amount", "Status", "ETA", ""]}
            empty={filtered.length === 0}
          >
            {paged.slice.map((o) => {
              const snap = (o.sofa_snapshot ?? {}) as { name?: string };
              return (
                <tr
                  key={o.id}
                  className="border-b last:border-b-0 cursor-pointer hover:bg-white/[0.02]"
                  style={{ borderColor: "rgba(42,42,56,0.5)" }}
                  onClick={() => navigate({ to: "/admin/orders/$id", params: { id: o.id } })}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <ACheck label={`Select ${o.order_number}`} checked={selected.includes(o.id)} onChange={() => toggle(o.id)} />
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate({ to: "/admin/orders/$id", params: { id: o.id } });
                      }}
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
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
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
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
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
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate({ to: "/admin/orders/$id", params: { id: o.id } });
                      }}
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
        <Pager page={paged.page} pages={paged.pages} total={paged.total} onPage={paged.setPage} label="orders" />
      </Card>

      <OrderCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        adminId={user?.uid ?? ""}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ["admin-orders"] });
          qc.invalidateQueries({ queryKey: ["admin-overview"] });
          qc.invalidateQueries({ queryKey: ["admin-customers"] });
        }}
      />
      <DeleteReasonModal
        open={askDelete}
        count={selected.length}
        onCancel={() => setAskDelete(false)}
        onConfirm={softDelete}
      />
    </div>
  );
}

/* ================= CUSTOMERS ================= */

function Customers() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [askDelete, setAskDelete] = useState(false);
  const [q, setQ] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [segment, setSegment] = useState("all");
  const { data } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const [profiles, orders] = await Promise.all([
        fsListSorted<any>(COL.profiles, "created_at", "desc"),
        fsList<any>(COL.orders),
      ]);
      const spent = new Map<string, { count: number; sum: number }>();
      for (const o of orders ?? []) {
        const cur = spent.get(o.user_id) ?? { count: 0, sum: 0 };
        cur.count += 1;
        cur.sum += Number(o.total);
        spent.set(o.user_id, cur);
      }
      return (profiles ?? [])
        .filter((p) => !p.deleted_at)
        .map((p) => ({ ...p, ...(spent.get(p.id) ?? { count: 0, sum: 0 }) }));
    },
  });

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const rows = data ?? [];
  const cities = useMemo(
    () => Array.from(new Set(rows.map((c: any) => c.city).filter(Boolean))).sort(),
    [rows],
  );
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((c: any) => {
      if (cityFilter !== "all" && (c.city ?? "") !== cityFilter) return false;
      if (segment === "new" && c.count > 0) return false;
      if (segment === "repeat" && c.count < 2) return false;
      if (segment === "buyers" && c.count < 1) return false;
      if (!s) return true;
      return [c.full_name, c.email, c.phone, c.city, c.id]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(s));
    });
  }, [rows, q, cityFilter, segment]);
  const paged = usePaged(filtered, 20);

  const exportCustomers = () =>
    downloadCsv(`customers-${new Date().toISOString().slice(0, 10)}`, filtered.map((c: any) => ({
      name: c.full_name ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      city: c.city ?? "",
      orders: c.count,
      lifetime_value: c.sum,
      joined: c.created_at ?? "",
      last_login: c.last_login_at ?? "",
      phone_verified: c.phone_verified ? "yes" : "no",
      email_verified: c.email_verified ? "yes" : "no",
    })));

  const softDelete = async (reason: string) => {
    const stamp = { deleted_at: new Date().toISOString(), deleted_reason: reason, deleted_by: user?.uid ?? null };
    try {
      await Promise.all(selected.map((id) => fsUpdate(COL.profiles, id, stamp)));
      toast.success(`Moved ${selected.length} customer(s) to trash`);
      setSelected([]);
      setAskDelete(false);
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <DarkInput
          placeholder="Search name, email, phone, city…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: "1 1 220px", minWidth: 200, background: "#16161D", border: "1px solid #2A2A38", color: "#E8E8F0" }}
        />
        <DarkSelect value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
          <option value="all">All cities</option>
          {cities.map((c) => <option key={String(c)} value={String(c)}>{String(c)}</option>)}
        </DarkSelect>
        <DarkSelect value={segment} onChange={(e) => setSegment(e.target.value)}>
          <option value="all">All customers</option>
          <option value="new">No orders yet</option>
          <option value="buyers">Has ordered</option>
          <option value="repeat">Repeat (2+)</option>
        </DarkSelect>
        <button
          onClick={exportCustomers}
          disabled={filtered.length === 0}
          className="rounded-md px-4 py-2 text-[13px] font-semibold disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.04)", color: "#E8E8F0", border: "1px solid #2A2A38" }}
        >
          <span className="inline-flex items-center gap-1.5"><FiDownload /> Export</span>
        </button>
        <span className="text-[12px]" style={{ color: "#888899" }}>
          {filtered.length} customer{filtered.length === 1 ? "" : "s"}
        </span>
      </div>
      {selected.length > 0 && (
        <button
          onClick={() => setAskDelete(true)}
          className="rounded-md px-4 py-2 text-[13px] font-semibold"
          style={{ background: "transparent", color: "#E05050", border: "1px solid rgba(224,80,80,0.4)" }}
        >
          <span className="inline-flex items-center gap-1.5"><FiTrash2 /> Delete {selected.length}</span>
        </button>
      )}
    <Card className="!p-0">
      <DataTable
        head={["", "Name", "Phone", "City", "Orders", "Lifetime", "Joined", ""]}
        empty={filtered.length === 0}
      >
        {paged.slice.map((c: any) => (
          <tr
            key={c.id}
            className="border-b last:border-b-0 cursor-pointer hover:bg-white/[0.02]"
            style={{ borderColor: "rgba(42,42,56,0.5)" }}
            onClick={() => navigate({ to: "/admin/customers/$id", params: { id: c.id } })}
          >
            <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
              <ACheck
                label={`Select ${c.full_name ?? c.id}`}
                checked={selected.includes(c.id)}
                onChange={() => toggle(c.id)}
              />
            </td>
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
      <Pager page={paged.page} pages={paged.pages} total={paged.total} onPage={paged.setPage} label="customers" />
    </Card>
      <DeleteReasonModal
        open={askDelete}
        count={selected.length}
        onCancel={() => setAskDelete(false)}
        onConfirm={softDelete}
      />
    </div>
  );
}

/* ================= PRODUCTS ================= */

type SofaRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  full_description: string | null;
  features: string[] | null;
  dimensions: string | null;
  materials: string | null;
  base_price: number;
  sale_price: number | null;
  hero_image: string | null;
  gallery: string[] | null;
  model_url: string | null;
  video_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  is_published: boolean;
  is_featured: boolean;
  status?: string | null;
  available_from?: string | null;
  available_to?: string | null;
  lead_time_days: number;
  delivery_days: number | null;
  product_options: Json | null;
};

type SpecRow = { key: string; val: string };
type SizeVariant = { label: string; price: string; dimensions: string; seating: string };
type FabricVariant = { name: string; priceAdjust: number };
type ColourOption = { label: string; hex: string };
type ProductOptions = {
  sku?: string;
  collection?: string;
  badge?: string;
  warranty?: string;
  specs?: SpecRow[];
  sizes?: SizeVariant[];
  colours?: ColourOption[];
  fabrics?: FabricVariant[];
  cushionFill?: string[];
  modelPath?: string;
  modelFileName?: string;
};

const PRODUCT_TABS = ["Basic", "Images", "Specs & Desc", "Variants", "3D Model"];
const PRODUCT_BADGES = ["", "New", "Bestseller", "Premium", "Limited", "Made to Order"];
const DEFAULT_COLOURS: ColourOption[] = [
  { label: "Sand", hex: "#D9C9A8" },
  { label: "Ivory", hex: "#F0EADB" },
  { label: "Charcoal", hex: "#2F2F33" },
  { label: "Emerald", hex: "#22574A" },
  { label: "Terracotta", hex: "#B0563A" },
  { label: "Midnight", hex: "#25384F" },
];
const DEFAULT_CUSHIONS = ["High-density foam", "Memory foam", "Feather blend", "Pocket spring"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parseProductOptions(value: Json | null | undefined): ProductOptions {
  if (!isRecord(value)) return {};
  return value as ProductOptions;
}

type CartLine = {
  quantity: number;
  fabric?: string;
  size?: string;
  color?: string;
  colorHex?: string;
  addons?: string[];
  addedAt?: string;
};
type CartWatcher = {
  uid: string;
  name: string;
  email: string;
  phone: string;
  quantity: number;
  lines: CartLine[];
  lastAdded: string | null;
};

/** Live cart documents. Admins see counts update as customers shop. */
function useLiveCollection<T = any>(col: string) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setRows(null);
    setError(null);
    const stop = fsWatch<T>(
      col,
      (next) => { setRows(next); setError(null); },
      (e) => setError(e.message || "Live updates unavailable"),
    );
    return stop;
  }, [col]);
  return { rows, error, loading: rows === null && !error };
}

function Products() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<SofaRow> | null>(null);
  const [cartFor, setCartFor] = useState<{ id: string; name: string; watchers: CartWatcher[] } | null>(null);

  const { rows: carts, error: cartError, loading: cartLoading } = useLiveCollection<any>(COL.carts);
  const { rows: liveOrders } = useLiveCollection<any>(COL.orders);

  const { data: profiles } = useQuery({
    queryKey: ["admin-cart-profiles"],
    queryFn: () => fsList<any>(COL.profiles),
  });

  /** uid-level cart docs -> map of sofaId to the customers holding it in cart. */
  const cartMap = useMemo(() => {
    const byUid = new Map<string, any>((profiles ?? []).map((p: any) => [p.id, p]));
    const map = new Map<string, CartWatcher[]>();
    for (const c of carts ?? []) {
      const items: any[] = Array.isArray(c.items) ? c.items : [];
      const grouped = new Map<string, CartLine[]>();
      for (const it of items) {
        if (!it?.sofaId) continue;
        const list = grouped.get(it.sofaId) ?? [];
        list.push({
          quantity: Number(it.quantity) || 1,
          fabric: it.fabric,
          size: it.size,
          color: it.color,
          colorHex: it.colorHex,
          addons: Array.isArray(it.addons) ? it.addons : [],
          addedAt: typeof it.addedAt === "string" ? it.addedAt : undefined,
        });
        grouped.set(it.sofaId, list);
      }
      for (const [sofaId, lines] of grouped) {
        const prof = byUid.get(c.id) ?? {};
        const times = lines.map((l) => l.addedAt).filter(Boolean) as string[];
        const list = map.get(sofaId) ?? [];
        list.push({
          uid: c.id,
          name: prof.full_name || prof.name || "Guest customer",
          email: prof.email || "—",
          phone: prof.phone || "—",
          quantity: lines.reduce((n, l) => n + l.quantity, 0),
          lines,
          lastAdded: times.length ? times.sort().at(-1)! : (c.updated_at ?? null),
        });
        map.set(sofaId, list);
      }
    }
    return map;
  }, [carts, profiles]);

  /** Orders placed per product, for the second badge. */
  const orderCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of liveOrders ?? []) {
      const sid = o?.sofa_id;
      if (!sid) continue;
      map.set(sid, (map.get(sid) ?? 0) + 1);
    }
    return map;
  }, [liveOrders]);


  const { data } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const rows = await fsListSorted<SofaRow>(COL.sofas, "sort_order", "asc");
      return rows;
    },
  });

  const update = async (id: string, patch: any) => {
    try {
      await fsUpdate(COL.sofas, id, patch);
    } catch (e) {
      return toast.error(e instanceof Error ? e.message : "Update failed");
    }
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await fsDelete(COL.sofas, id);
    } catch (e) {
      return toast.error(e instanceof Error ? e.message : "Delete failed");
    }
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
            className="relative rounded-xl overflow-hidden transition-colors"
            style={{ background: "#1E1E28", border: "1px solid #2A2A38" }}
          >
            <div className="h-36 overflow-hidden" style={{ background: "#1a1a22" }}>
              {(() => {
                const st = productStatusLabel(p);
                return (
                  <span
                    className="absolute m-2 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: `${st.color}22`, color: st.color, position: "absolute" }}
                  >
                    {st.label}
                  </span>
                );
              })()}
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
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-[11px]" style={{ color: "#888899" }}>
                  {p.lead_time_days}d lead
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ background: "#2A2A3866", color: "#9FB8A0" }}
                    title="Orders placed for this product"
                  >
                    <FiShoppingBag /> {orderCounts.get(p.id) ?? 0} orders
                  </span>
                  {(() => {
                    const watchers = cartMap.get(p.id) ?? [];
                    const count = watchers.reduce((n, w) => n + w.quantity, 0);
                    if (cartError) {
                      return (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{ background: "#E0505022", color: "#E05050" }}
                          title={cartError}
                        >
                          <FiAlertCircle /> cart data
                        </span>
                      );
                    }
                    if (cartLoading) {
                      return (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{ background: "#2A2A38", color: "#888899" }}
                        >
                          <FiLoader className="animate-spin" /> cart…
                        </span>
                      );
                    }
                    return (
                      <button
                        type="button"
                        disabled={watchers.length === 0}
                        onClick={() => setCartFor({ id: p.id, name: p.name, watchers })}
                        title={watchers.length ? "View customers with this in cart" : "No carts yet"}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-opacity disabled:opacity-50"
                        style={{
                          background: watchers.length ? "#C8A86B22" : "#2A2A38",
                          color: watchers.length ? "#C8A86B" : "#888899",
                          cursor: watchers.length ? "pointer" : "default",
                        }}
                      >
                        <FiShoppingCart /> {count} in cart
                        {watchers.length > 0 && (
                          <span style={{ color: "#888899" }}>· {watchers.length} cust.</span>
                        )}
                      </button>
                    );
                  })()}
                </div>
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

      <CartWatchersModal target={cartFor} onClose={() => setCartFor(null)} />


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

/** Searchable, paginated list of customers holding a product in their cart. */
function CartWatchersModal({
  target,
  onClose,
}: {
  target: { id: string; name: string; watchers: CartWatcher[] } | null;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  useEffect(() => { setQ(""); }, [target?.id]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = target?.watchers ?? [];
    const filtered = needle
      ? list.filter((w) =>
          [w.name, w.email, w.phone].some((v) => (v ?? "").toLowerCase().includes(needle)),
        )
      : list;
    return [...filtered].sort((a, b) => (b.lastAdded ?? "").localeCompare(a.lastAdded ?? ""));
  }, [target, q]);

  const paged = usePaged(rows, 8);

  return (
    <AModal
      open={!!target}
      onClose={onClose}
      wide
      title="In customers' carts"
      subtitle={target ? `${target.watchers.length} customer(s) have "${target.name}" in their cart` : ""}
    >
      <AInput
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, email or phone…"
      />
      <div className="space-y-2">
        {paged.slice.map((w) => (
          <Link
            key={w.uid}
            to="/admin/customers/$id"
            params={{ id: w.uid }}
            search={{ product: target?.id }}
            onClick={onClose}
            className="block rounded-lg px-3 py-2.5 cursor-pointer"
            style={{ background: "#16161D", border: "1px solid #2A2A38", color: "#E8E8F0" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold truncate">{w.name}</div>
                <div className="text-[11px] truncate" style={{ color: "#888899" }}>
                  {w.email} · {w.phone}
                </div>
              </div>
              <span className="text-[11px] shrink-0" style={{ color: "#C8A86B" }}>Qty {w.quantity}</span>
            </div>
            <div className="mt-2 space-y-1">
              {w.lines.map((l, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-[11px]" style={{ color: "#888899" }}>
                  <span className="truncate">
                    {[l.size, l.fabric, l.color, (l.addons ?? []).join(", ")].filter(Boolean).join(" · ") || "Default configuration"}
                    {" · × "}{l.quantity}
                  </span>
                  <span className="shrink-0">
                    {l.addedAt ? new Date(l.addedAt).toLocaleString("en-IN") : "—"}
                  </span>
                </div>
              ))}
            </div>
          </Link>
        ))}
        {rows.length === 0 && (
          <div className="py-8 text-center text-[13px]" style={{ color: "#888899" }}>
            {target && target.watchers.length === 0
              ? "Nobody has this product in their cart yet."
              : "No customers match your search."}
          </div>
        )}
      </div>
      <Pager page={paged.page} pages={paged.pages} total={paged.total} onPage={paged.setPage} label="customers" />
    </AModal>
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
  const options = parseProductOptions(product.product_options);
  const [tab, setTab] = useState(0);
  const [name, setName] = useState(product.name ?? "");
  const [slug, setSlug] = useState(product.slug ?? "");
  const [tagline, setTagline] = useState(product.tagline ?? "");
  const [basePrice, setBasePrice] = useState<string>(product.base_price ? String(product.base_price) : "");
  const [salePrice, setSalePrice] = useState<string>(product.sale_price ? String(product.sale_price) : "");
  const [sku, setSku] = useState(options.sku ?? "");
  const [collection, setCollection] = useState(options.collection ?? "");
  const [badge, setBadge] = useState(options.badge ?? "");
  const [warranty, setWarranty] = useState(options.warranty ?? "5-year frame warranty · 1-year upholstery");
  const [images, setImages] = useState<string[]>(() => {
    const merged = [product.hero_image, ...(product.gallery ?? [])].filter((v): v is string => Boolean(v));
    return Array.from(new Set(merged));
  });
  const [imageUrl, setImageUrl] = useState("");
  const [modelUrl, setModelUrl] = useState(product.model_url ?? "");
  const [modelPath, setModelPath] = useState(options.modelPath ?? "");
  const [modelFileName, setModelFileName] = useState(options.modelFileName ?? "");
  const [description, setDescription] = useState(product.description ?? "");
  const [fullDescription, setFullDescription] = useState(product.full_description ?? "");
  const [features, setFeatures] = useState<string[]>(product.features?.length ? product.features : [""]);
  const [specs, setSpecs] = useState<SpecRow[]>(() => {
    if (Array.isArray(options.specs) && options.specs.length > 0) return options.specs;
    const rows: SpecRow[] = [];
    if (product.dimensions) rows.push({ key: "Dimensions", val: product.dimensions });
    if (product.materials) rows.push({ key: "Materials", val: product.materials });
    return rows.length ? rows : [{ key: "Frame", val: "" }];
  });
  const [sizes, setSizes] = useState<SizeVariant[]>(() =>
    Array.isArray(options.sizes) && options.sizes.length > 0
      ? options.sizes
      : [{ label: "3-Seater", price: product.base_price ? String(product.base_price) : "", dimensions: product.dimensions ?? "", seating: "3" }],
  );
  const [colours, setColours] = useState<ColourOption[]>(() =>
    Array.isArray(options.colours) && options.colours.length > 0 ? options.colours : DEFAULT_COLOURS.slice(0, 4),
  );
  const [fabrics, setFabrics] = useState<FabricVariant[]>(() =>
    Array.isArray(options.fabrics) && options.fabrics.length > 0
      ? options.fabrics
      : [
          { name: "Bouclé", priceAdjust: 0 },
          { name: "Velvet", priceAdjust: 5000 },
        ],
  );
  const [cushionFill, setCushionFill] = useState<string[]>(() =>
    Array.isArray(options.cushionFill) ? options.cushionFill.filter((v): v is string => typeof v === "string") : ["High-density foam"],
  );
  const [leadTime, setLeadTime] = useState<string>(String(product.lead_time_days ?? 30));
  const [videoUrl, setVideoUrl] = useState(product.video_url ?? "");
  const [seoTitle, setSeoTitle] = useState(product.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(product.seo_description ?? "");
  const [isPublished, setIsPublished] = useState(product.is_published ?? true);
  const [isFeatured, setIsFeatured] = useState(product.is_featured ?? false);
  const [status, setStatus] = useState<string>(product.status ?? (product.is_published === false ? "draft" : "published"));
  const [availableFrom, setAvailableFrom] = useState<string>((product.available_from ?? "").slice(0, 10));
  const [availableTo, setAvailableTo] = useState<string>((product.available_to ?? "").slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"images" | "model" | null>(null);

  const autoSlug = (v: string) =>
    v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const productFolder = autoSlug(slug || name) || "new-product";

  const uploadProductFile = async (file: File, folder: "images" | "models") => {
    const { url, publicId } = await uploadToCloudinary(
      file,
      `product-media/${productFolder}/${folder}`,
      folder === "images" ? "image" : "raw",
    );
    return { path: publicId, url };
  };

  const uploadImages = async (files: FileList | null) => {
    const selected = files ? Array.from(files) : [];
    if (selected.length === 0) return;
    setUploading("images");
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        const { url } = await uploadProductFile(file, "images");
        uploaded.push(url);
      }
      setImages((cur) => Array.from(new Set([...cur, ...uploaded])));
      toast.success(`${uploaded.length} image${uploaded.length === 1 ? "" : "s"} uploaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setUploading(null);
    }
  };

  const uploadModel = async (file: File | undefined) => {
    if (!file) return;
    setUploading("model");
    try {
      const { path, url } = await uploadProductFile(file, "models");
      setModelUrl(url);
      setModelPath(path);
      setModelFileName(file.name);
      toast.success("3D model uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "3D upload failed");
    } finally {
      setUploading(null);
    }
  };

  const addImageUrl = () => {
    const url = imageUrl.trim();
    if (!url) return;
    setImages((cur) => Array.from(new Set([...cur, url])));
    setImageUrl("");
  };

  const setSpec = (index: number, patch: Partial<SpecRow>) => {
    setSpecs((cur) => cur.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const setSize = (index: number, patch: Partial<SizeVariant>) => {
    setSizes((cur) => cur.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const setFabric = (index: number, patch: Partial<FabricVariant>) => {
    setFabrics((cur) => cur.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const save = async () => {
    if (!name.trim() || !basePrice) {
      toast.error("Name and base price are required");
      return;
    }
    setSaving(true);
    const cleanSpecs = specs.filter((s) => s.key.trim() || s.val.trim());
    const cleanFeatures = features.map((f) => f.trim()).filter(Boolean);
    const heroImage = images[0] ?? "";
    const gallery = images.slice(1);
    const dimensions = cleanSpecs.find((s) => s.key.toLowerCase().includes("dimension"))?.val.trim() || null;
    const materials = cleanSpecs
      .filter((s) => !s.key.toLowerCase().includes("dimension"))
      .map((s) => `${s.key.trim()}: ${s.val.trim()}`)
      .filter((s) => !s.endsWith(": "))
      .join(" · ") || null;
    const payload = {
      name: name.trim(),
      slug: (slug || autoSlug(name)).trim(),
      tagline: tagline || null,
      description: description || null,
      full_description: fullDescription || null,
      features: cleanFeatures.length ? cleanFeatures : null,
      dimensions,
      materials,
      base_price: Number(basePrice),
      sale_price: salePrice ? Number(salePrice) : null,
      hero_image: heroImage || null,
      gallery,
      model_url: modelUrl || null,
      video_url: videoUrl || null,
      seo_title: seoTitle || null,
      seo_description: seoDescription || null,
      lead_time_days: Number(leadTime) || 30,
      delivery_days: Number(leadTime) || 30,
      is_published: status === "draft" ? false : isPublished,
      status,
      available_from: availableFrom || null,
      available_to: availableTo || null,
      is_featured: isFeatured,
      product_options: {
        sku: sku || null,
        collection: collection || null,
        badge: badge || null,
        warranty: warranty || null,
        specs: cleanSpecs,
        sizes: sizes.filter((s) => s.label.trim() || s.price || s.dimensions.trim() || s.seating.trim()),
        colours,
        fabrics: fabrics.filter((f) => f.name.trim()),
        cushionFill,
        modelPath: modelPath || null,
        modelFileName: modelFileName || null,
      },
    };
    try {
      if (isEdit && product.id) {
        await fsUpdate(COL.sofas, product.id, payload);
      } else {
        await fsAdd(COL.sofas, payload);
      }
    } catch (e) {
      setSaving(false);
      return toast.error(e instanceof Error ? e.message : "Save failed");
    }
    setSaving(false);
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
        className="rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col admin-scroll"
        style={{ background: "#1E1E28", border: "1px solid #2A2A38" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b" style={{ borderColor: "#2A2A38" }}>
          <div>
            <div className="text-[17px] font-semibold">{isEdit ? "Edit Product" : "Add New Product"}</div>
            <div className="text-[11px] mt-0.5" style={{ color: "#888899" }}>Full CMS product setup · images · variants · 3D model</div>
          </div>
          <button onClick={onClose} className="text-xl" style={{ color: "#888899" }}>×</button>
        </div>

        <div className="flex overflow-x-auto border-b admin-scroll" style={{ borderColor: "#2A2A38" }}>
          {PRODUCT_TABS.map((label, index) => (
            <button
              key={label}
              onClick={() => setTab(index)}
              className="px-4 sm:px-5 py-3 text-[12px] font-semibold whitespace-nowrap border-b-2 transition-colors"
              style={{ color: tab === index ? "#C8A86B" : "#888899", borderColor: tab === index ? "#C8A86B" : "transparent" }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 admin-scroll">
          {tab === 0 && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Product Name *">
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
                  <DarkInput value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="royale-sectional" />
                </Field>
                <Field label="Collection">
                  <DarkInput value={collection} onChange={(e) => setCollection(e.target.value)} placeholder="e.g. Royale" />
                </Field>
                <Field label="SKU">
                  <DarkInput value={sku} onChange={(e) => setSku(e.target.value)} placeholder="TF-SF-001" />
                </Field>
                <Field label="Price (₹) *">
                  <DarkInput type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="48500" />
                </Field>
                <Field label="Sale Price / Offer (₹)">
                  <DarkInput type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="Optional" />
                </Field>
                <Field label="Badge">
                  <DarkSelect value={badge} onChange={(e) => setBadge(e.target.value)} className="w-full py-2">
                    {PRODUCT_BADGES.map((b) => <option key={b} value={b}>{b || "None"}</option>)}
                  </DarkSelect>
                </Field>
                <Field label="Delivery Days">
                  <DarkInput type="number" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} placeholder="30" />
                </Field>
                <Field label="Warranty">
                  <DarkInput value={warranty} onChange={(e) => setWarranty(e.target.value)} placeholder="Warranty text" />
                </Field>
                <Field label="Video URL">
                  <DarkInput value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Muted product video URL" />
                </Field>
              </div>
              <Field label="Tagline">
                <DarkInput value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Optional short strapline" />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="SEO Title">
                  <DarkInput value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Premium Custom Sofa in Indore" />
                </Field>
                <Field label="SEO Description">
                  <DarkInput value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="Short search/social description" />
                </Field>
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-[13px] cursor-pointer" style={{ color: "#888899" }}>
                  <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
                  Active / visible in store
                </label>
                <label className="flex items-center gap-2 text-[13px] cursor-pointer" style={{ color: "#888899" }}>
                  <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
                  Featured on homepage
                </label>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Publish status">
                  <DarkSelect value={status} onChange={(e) => setStatus(e.target.value)} className="w-full py-2">
                    <option value="published">Published</option>
                    <option value="draft">Draft (hidden)</option>
                    <option value="scheduled">Scheduled</option>
                  </DarkSelect>
                </Field>
                <Field label="Available from">
                  <DarkInput type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} />
                </Field>
                <Field label="Available to">
                  <DarkInput type="date" value={availableTo} onChange={(e) => setAvailableTo(e.target.value)} />
                </Field>
              </div>
              <p className="text-[11px]" style={{ color: "#888899" }}>
                Drafts never show on the store. Scheduled products go live automatically inside the availability window.
              </p>
            </>
          )}

          {tab === 1 && (
            <>
              <Field label="Add Image URL">
                <div className="flex gap-2">
                  <DarkInput
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addImageUrl();
                      }
                    }}
                    placeholder="https://..."
                  />
                  <button onClick={addImageUrl} className="rounded-md px-4 text-[12px] font-semibold" style={{ background: "#C8A86B", color: "#1a1a1a" }}>Add</button>
                </div>
              </Field>
              <Field label="Upload Product Images">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => uploadImages(e.currentTarget.files)}
                  className="block w-full text-[12px] file:mr-4 file:rounded-md file:border-0 file:px-4 file:py-2 file:text-[12px] file:font-semibold"
                  style={{ color: "#888899" }}
                />
                {uploading === "images" && <p className="text-[11px] mt-2" style={{ color: "#C8A86B" }}>Uploading images…</p>}
              </Field>
              {images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((img, i) => (
                    <div key={`${img}-${i}`} className="relative group rounded-xl overflow-hidden aspect-[4/3]" style={{ background: "#16161D" }}>
                      <img src={img} alt={`Product ${i + 1}`} className="w-full h-full object-cover" />
                      {i === 0 && <span className="absolute top-2 left-2 rounded px-2 py-0.5 text-[10px] font-bold" style={{ background: "#C8A86B", color: "#1a1a1a" }}>MAIN</span>}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {i > 0 && <button onClick={() => setImages((cur) => [img, ...cur.filter((_, j) => j !== i)])} className="rounded px-2 py-1 text-[10px]" style={{ background: "#C8A86B", color: "#1a1a1a" }}>Main</button>}
                        <button onClick={() => setImages((cur) => cur.filter((_, j) => j !== i))} className="rounded px-2 py-1 text-[10px]" style={{ background: "#E05050", color: "#fff" }}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl p-10 text-center text-[13px]" style={{ background: "#16161D", color: "#888899" }}>No product images added yet.</div>
              )}
            </>
          )}

          {tab === 2 && (
            <>
              <Field label="Short Description (card)">
                <DarkTextarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description shown on product cards…" />
              </Field>
              <Field label="Long Description (product page)">
                <DarkTextarea rows={5} value={fullDescription} onChange={(e) => setFullDescription(e.target.value)} placeholder="Full detailed description for the product page…" />
              </Field>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] uppercase tracking-[0.08em]" style={{ color: "#888899" }}>Specifications</label>
                  <button onClick={() => setSpecs((cur) => [...cur, { key: "", val: "" }])} className="text-[12px]" style={{ color: "#C8A86B" }}>+ Add row</button>
                </div>
                <div className="space-y-2">
                  {specs.map((s, i) => (
                    <div key={i} className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
                      <DarkInput value={s.key} onChange={(e) => setSpec(i, { key: e.target.value })} placeholder="Key (e.g. Frame)" />
                      <DarkInput value={s.val} onChange={(e) => setSpec(i, { val: e.target.value })} placeholder="Value (e.g. Sheesham)" />
                      <button onClick={() => setSpecs((cur) => cur.filter((_, j) => j !== i))} className="rounded-md px-3 text-[12px]" style={{ border: "1px solid #2A2A38", color: "#E05050" }}>Delete</button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] uppercase tracking-[0.08em]" style={{ color: "#888899" }}>Features</label>
                  <button onClick={() => setFeatures((cur) => [...cur, ""])} className="text-[12px]" style={{ color: "#C8A86B" }}>+ Add</button>
                </div>
                <div className="space-y-2">
                  {features.map((feature, i) => (
                    <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
                      <DarkInput value={feature} onChange={(e) => setFeatures((cur) => cur.map((f, j) => (j === i ? e.target.value : f)))} placeholder={`Feature ${i + 1}`} />
                      <button onClick={() => setFeatures((cur) => cur.filter((_, j) => j !== i))} className="rounded-md px-3 text-[12px]" style={{ border: "1px solid #2A2A38", color: "#E05050" }}>Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 3 && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] uppercase tracking-[0.08em]" style={{ color: "#888899" }}>Sizes & Pricing</label>
                  <button onClick={() => setSizes((cur) => [...cur, { label: "", price: "", dimensions: "", seating: "" }])} className="text-[12px]" style={{ color: "#C8A86B" }}>+ Add size</button>
                </div>
                <div className="space-y-2">
                  {sizes.map((s, i) => (
                    <div key={i} className="grid sm:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2">
                      <DarkInput value={s.label} onChange={(e) => setSize(i, { label: e.target.value })} placeholder="3-Seater" />
                      <DarkInput type="number" value={s.price} onChange={(e) => setSize(i, { price: e.target.value })} placeholder="Price ₹" />
                      <DarkInput value={s.dimensions} onChange={(e) => setSize(i, { dimensions: e.target.value })} placeholder="220×90×85 cm" />
                      <DarkInput value={s.seating} onChange={(e) => setSize(i, { seating: e.target.value })} placeholder="Seating" />
                      <button onClick={() => setSizes((cur) => cur.filter((_, j) => j !== i))} className="rounded-md px-3 text-[12px]" style={{ border: "1px solid #2A2A38", color: "#E05050" }}>Delete</button>
                    </div>
                  ))}
                </div>
              </div>
              <Field label="Colours">
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_COLOURS.map((c) => {
                    const selected = colours.some((x) => x.hex === c.hex);
                    return (
                      <button
                        key={c.hex}
                        title={c.label}
                        onClick={() => setColours((cur) => selected ? cur.filter((x) => x.hex !== c.hex) : [...cur, c])}
                        className="size-9 rounded-full border-2 transition-transform hover:scale-105"
                        style={{ background: c.hex, borderColor: selected ? "#C8A86B" : "#2A2A38", boxShadow: selected ? "0 0 0 2px rgba(200,168,107,0.35)" : "none" }}
                      />
                    );
                  })}
                </div>
                <p className="text-[11px] mt-2" style={{ color: "#888899" }}>{colours.length} colour options selected</p>
              </Field>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] uppercase tracking-[0.08em]" style={{ color: "#888899" }}>Fabrics with Price Adjustment</label>
                  <button onClick={() => setFabrics((cur) => [...cur, { name: "", priceAdjust: 0 }])} className="text-[12px]" style={{ color: "#C8A86B" }}>+ Add fabric</button>
                </div>
                <div className="space-y-2">
                  {fabrics.map((f, i) => (
                    <div key={i} className="grid grid-cols-[1fr_140px_auto] gap-2">
                      <DarkInput value={f.name} onChange={(e) => setFabric(i, { name: e.target.value })} placeholder="Bouclé" />
                      <DarkInput type="number" value={String(f.priceAdjust)} onChange={(e) => setFabric(i, { priceAdjust: Number(e.target.value) || 0 })} placeholder="+₹" />
                      <button onClick={() => setFabrics((cur) => cur.filter((_, j) => j !== i))} className="rounded-md px-3 text-[12px]" style={{ border: "1px solid #2A2A38", color: "#E05050" }}>Delete</button>
                    </div>
                  ))}
                </div>
              </div>
              <Field label="Cushion Fill Options">
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_CUSHIONS.map((fill) => {
                    const selected = cushionFill.includes(fill);
                    return (
                      <button
                        key={fill}
                        onClick={() => setCushionFill((cur) => selected ? cur.filter((x) => x !== fill) : [...cur, fill])}
                        className="rounded-full px-3 py-1.5 text-[12px] border transition-colors"
                        style={{ background: selected ? "#C8A86B" : "#16161D", color: selected ? "#1a1a1a" : "#888899", borderColor: selected ? "#C8A86B" : "#2A2A38" }}
                      >
                        {fill}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </>
          )}

          {tab === 4 && (
            <div className="space-y-5">
              <div className="text-center rounded-2xl p-8" style={{ background: "#16161D", border: "1px dashed #2A2A38" }}>
                <span className="text-5xl block mb-4">🧊</span>
                <p className="text-sm font-semibold mb-1">3D Model Upload</p>
                <p className="text-xs mb-5" style={{ color: "#888899" }}>Upload .glb, .gltf, or .obj. If none is uploaded, the live canvas sofa preview still works automatically.</p>
                <input
                  type="file"
                  accept=".glb,.gltf,.obj,model/gltf-binary,model/gltf+json"
                  onChange={(e) => uploadModel(e.currentTarget.files?.[0])}
                  className="block mx-auto text-[12px] file:mr-4 file:rounded-md file:border-0 file:px-4 file:py-2 file:text-[12px] file:font-semibold"
                  style={{ color: "#888899" }}
                />
                {uploading === "model" && <p className="text-[11px] mt-3" style={{ color: "#C8A86B" }}>Uploading 3D model…</p>}
              </div>
              <Field label="3D Model URL">
                <DarkInput value={modelUrl} onChange={(e) => setModelUrl(e.target.value)} placeholder="https://.../model.glb" />
              </Field>
              {modelUrl && (
                <div className="rounded-xl p-4" style={{ background: "#16161D", border: "1px solid #2A2A38" }}>
                  <div className="text-[13px] font-semibold" style={{ color: "#C8A86B" }}>Model connected</div>
                  <div className="text-[11px] mt-1 break-all" style={{ color: "#888899" }}>{modelFileName || modelUrl}</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-5 sm:px-6 py-4 border-t" style={{ borderColor: "#2A2A38" }}>
          <button
            onClick={onClose}
            className="rounded-md px-5 py-2.5 text-[13px]"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #2A2A38", color: "#888899" }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || Boolean(uploading)}
            className="flex-1 rounded-md py-2.5 text-[13px] font-semibold disabled:opacity-60"
            style={{ background: "#C8A86B", color: "#1a1a1a" }}
          >
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Product"}
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
    queryFn: async () => {
      const [bookings, showrooms] = await Promise.all([
        fsListSorted<any>(COL.showroomBookings, "preferred_date", "asc"),
        fsList<any>(COL.showrooms),
      ]);
      const byId = new Map(showrooms.map((s) => [s.id, s]));
      return bookings.map((b) => ({ ...b, showroom: byId.get(b.showroom_id) }));
    },
  });
  const update = async (id: string, status: string) => {
    try {
      await fsUpdate(COL.showroomBookings, id, { status });
    } catch (e) {
      return toast.error(e instanceof Error ? e.message : "Update failed");
    }
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
  const [draft, setDraft] = useState<{ sofa_id: string; author: string; city: string; rating: number; title: string; body: string; images: string[] } | null>(null);
  const [imgUrl, setImgUrl] = useState("");
  const [uploadingReview, setUploadingReview] = useState(false);

  const uploadReviewImages = async (files: FileList | null) => {
    const selected = files ? Array.from(files) : [];
    if (selected.length === 0 || !draft) return;
    setUploadingReview(true);
    try {
      const urls: string[] = [];
      for (const file of selected) {
        const { url } = await uploadToCloudinary(file, "review-media", "image");
        urls.push(url);
      }
      setDraft((d) => (d ? { ...d, images: [...d.images, ...urls] } : d));
      toast.success("Review photos uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingReview(false);
    }
  };
  const { data } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const [reviews, sofas] = await Promise.all([
        fsListSorted<any>(COL.reviews, "created_at", "desc"),
        fsList<any>(COL.sofas),
      ]);
      const byId = new Map(sofas.map((s) => [s.id, s]));
      return { rows: reviews.map((r) => ({ ...r, sofa: byId.get(r.sofa_id) })), sofas };
    },
  });
  const rows = data?.rows ?? [];
  const sofas = data?.sofas ?? [];

  const addReview = async () => {
    if (!draft?.body.trim() || !draft.sofa_id) return toast.error("Pick a product and write the review");
    try {
      await fsAdd(COL.reviews, {
        sofa_id: draft.sofa_id,
        user_id: null,
        author_name: draft.author || "Verified buyer",
        city: draft.city || null,
        rating: draft.rating,
        title: draft.title || null,
        body: draft.body,
        images: draft.images,
        approved: true,
      });
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("Review published");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add review");
    }
  };
  const setApproved = async (id: string, approved: boolean) => {
    try {
      await fsUpdate(COL.reviews, id, { approved });
    } catch (e) {
      return toast.error(e instanceof Error ? e.message : "Update failed");
    }
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
  };
  const del = async (id: string) => {
    if (!confirm("Delete review?")) return;
    await fsDelete(COL.reviews, id);
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
  };
  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="text-[13px] font-semibold">Product reviews</div>
          <button
            onClick={() =>
              setDraft(draft ? null : { sofa_id: sofas[0]?.id ?? "", author: "", city: "", rating: 5, title: "", body: "", images: [] })
            }
            className="rounded-md px-4 py-2 text-[12px] font-semibold"
            style={{ background: "#C8A86B", color: "#1a1a1a" }}
          >
            <span className="inline-flex items-center gap-1.5"><FiPlus /> {draft ? "Close" : "Add review"}</span>
          </button>
        </div>
        {draft && (
          <div className="mt-4 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-4">
              <DarkSelect value={draft.sofa_id} onChange={(e) => setDraft({ ...draft, sofa_id: e.target.value })}>
                {sofas.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </DarkSelect>
              <DarkInput placeholder="Customer name" value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} />
              <DarkInput placeholder="City" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
              <DarkSelect value={String(draft.rating)} onChange={(e) => setDraft({ ...draft, rating: Number(e.target.value) })}>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}
              </DarkSelect>
            </div>
            <DarkInput placeholder="Headline (optional)" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <DarkTextarea rows={3} placeholder="Review…" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex gap-2">
                <DarkInput placeholder="Photo URL" value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} />
                <button
                  onClick={() => {
                    if (!imgUrl.trim()) return;
                    setDraft({ ...draft, images: [...draft.images, imgUrl.trim()] });
                    setImgUrl("");
                  }}
                  className="rounded-md px-4 text-[12px] font-semibold"
                  style={{ background: "#C8A86B", color: "#1a1a1a" }}
                >
                  Add
                </button>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => uploadReviewImages(e.currentTarget.files)}
                className="block w-full text-[12px] file:mr-4 file:rounded-md file:border-0 file:px-4 file:py-2 file:text-[12px] file:font-semibold"
                style={{ color: "#888899" }}
              />
            </div>
            {uploadingReview && <p className="text-[11px]" style={{ color: "#C8A86B" }}>Uploading photos…</p>}
            {draft.images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {draft.images.map((src, i) => (
                  <div key={`${src}-${i}`} className="relative">
                    <img src={src} alt={`Review ${i + 1}`} className="h-16 w-16 rounded-md object-cover" />
                    <button
                      onClick={() => setDraft({ ...draft, images: draft.images.filter((_, j) => j !== i) })}
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full text-[11px]"
                      style={{ background: "#E05050", color: "#fff" }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div>
              <button onClick={addReview} className="rounded-md px-4 py-2 text-[12px] font-semibold" style={{ background: "#C8A86B", color: "#1a1a1a" }}>
                Publish review
              </button>
            </div>
          </div>
        )}
      </Card>
      {rows.map((r) => (
        <Card key={r.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[13px]" style={{ color: "#C8A86B" }}>
                {"★".repeat(r.rating)}
                <span style={{ color: "#2A2A38" }}>{"★".repeat(5 - r.rating)}</span>
              </div>
              {r.title && <div className="admin-serif text-lg mt-1">{r.title}</div>}
              <p className="text-[13px] mt-1" style={{ color: "#E8E8F0", opacity: 0.85 }}>{r.body}</p>
              {Array.isArray(r.images) && r.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {r.images.map((src: string, i: number) => (
                    <img key={`${src}-${i}`} src={src} alt={`Review photo ${i + 1}`} className="h-16 w-16 rounded-md object-cover" />
                  ))}
                </div>
              )}
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
      {rows.length === 0 && (
        <Card>
          <div className="text-center py-8 text-[13px]" style={{ color: "#888899" }}>
            No reviews yet.
          </div>
        </Card>
      )}
    </div>
  );
}

/* ================= DESIGNS ================= */

function Designs() {
  const { data } = useQuery({
    queryKey: ["admin-designs"],
    queryFn: async () => {
      const [designs, sofas] = await Promise.all([
        fsListSorted<any>(COL.savedDesigns, "created_at", "desc"),
        fsList<any>(COL.sofas),
      ]);
      const byId = new Map(sofas.map((s) => [s.id, s]));
      return designs.map((d) => ({ ...d, sofa: byId.get(d.sofa_id) }));
    },
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
    queryFn: async () => fsListSorted<any>(COL.showrooms, "sort_order", "asc"),
  });
  const update = async (id: string, patch: any) => {
    try {
      await fsUpdate(COL.showrooms, id, patch);
    } catch (e) {
      return toast.error(e instanceof Error ? e.message : "Update failed");
    }
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
  const TABS = ["Brand & Store", "Site CMS", "API Config", "Danger Zone"] as const;
  const [tab, setTab] = useState<(typeof TABS)[number]>("Brand & Store");
  const qc = useQueryClient();

  // Single source of truth: site_settings row drives the storefront, emails, SEO and receipts.
  const { data: brandRow } = useQuery({ queryKey: brandQueryKey, queryFn: fetchBrand });
  const [brand, setBrand] = useState<BrandSettings>(DEFAULT_BRAND);
  const [brandLoaded, setBrandLoaded] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  useEffect(() => {
    if (brandRow && !brandLoaded) { setBrand(brandRow); setBrandLoaded(true); }
  }, [brandRow, brandLoaded]);
  const brandPatch = <K extends keyof BrandSettings>(k: K, v: BrandSettings[K]) => setBrand((p) => ({ ...p, [k]: v }));
  const saveBrand = async () => {
    setSavingBrand(true);
    try {
      await fsSet(COL.siteSettings, "default", {
        brand_name: brand.brand_name,
        tagline: brand.tagline,
        cities: brand.cities,
        established: brand.established,
        phone: brand.phone,
        whatsapp: brand.whatsapp.replace(/\D/g, ""),
        email: brand.email,
        address: brand.address,
        meta_title: brand.meta_title,
        meta_description: brand.meta_description,
        deposit_rate: Number(brand.deposit_rate) || 20,
        free_delivery_above: Number(brand.free_delivery_above) || 0,
        delivery_note: brand.delivery_note,
        announcement: brand.announcement,
        announcement_on: brand.announcement_on,
        require_phone_verification: brand.require_phone_verification,
        require_email_verification: brand.require_email_verification,
        hero_badge: brand.hero_badge,
        hero_headline: brand.hero_headline,
        hero_italic: brand.hero_italic,
        hero_subtext: brand.hero_subtext,
        hero_cta: brand.hero_cta,
        hero_image: brand.hero_image,
      });
    } catch (e) {
      setSavingBrand(false);
      toast.error(e instanceof Error ? e.message : "Save failed");
      return;
    }
    setSavingBrand(false);
    await qc.invalidateQueries({ queryKey: brandQueryKey });
    toast.success("Brand details saved — applied across the site, emails and receipts.");
  };

  const [apiUrl, setApiUrl] = useState("");

  useEffect(() => {
    try {
      setApiUrl(window.location.origin);
    } catch {
      /* ignore */
    }
  }, []);

  const pingApi = async () => {
    try {
      const r = await fetch("/api/public/health");
      toast.success(r.ok ? "✓ API reachable" : `API returned ${r.status}`);
    } catch {
      toast.error("✗ Cannot reach API endpoint.");
    }
  };
  const clearLocal = () => {
    if (!confirm("Clear all locally cached data (cart, CMS, visitors)?")) return;
    ["tf_cart", "tf_visitors", "tf_site_cms", "tf_store_info", "tf_welcome_seen", "tf_selected_city"].forEach(
      (k) => {
        try {
          window.localStorage.removeItem(k);
        } catch {
          /* ignore */
        }
      },
    );
    toast.success("Local cache cleared. Reload to refresh.");
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex border-b overflow-x-auto" style={{ borderColor: "#2A2A38" }}>
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-5 py-2.5 text-[12px] whitespace-nowrap -mb-px border-b-2 transition-colors"
              style={{
                background: "transparent",
                color: active ? "#C8A86B" : "#888899",
                borderBottomColor: active ? "#C8A86B" : "transparent",
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {tab === "Site CMS" && (
        <Card>
          <CardTitle right="Controls the storefront">Site CMS</CardTitle>
          <div className="grid gap-x-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "#C8A86B" }}>
                Hero Section
              </div>
              <Field label="Hero Headline">
                <DarkInput value={brand.hero_headline} onChange={(e) => brandPatch("hero_headline", e.target.value)} />
              </Field>
              <Field label="Hero Headline (italic line)">
                <DarkInput value={brand.hero_italic} onChange={(e) => brandPatch("hero_italic", e.target.value)} />
              </Field>
              <Field label="Hero Sub-text">
                <DarkTextarea rows={3} value={brand.hero_subtext} onChange={(e) => brandPatch("hero_subtext", e.target.value)} />
              </Field>
              <Field label="Hero Badge">
                <DarkInput value={brand.hero_badge} onChange={(e) => brandPatch("hero_badge", e.target.value)} />
              </Field>
              <Field label="Primary CTA Label">
                <DarkInput value={brand.hero_cta} onChange={(e) => brandPatch("hero_cta", e.target.value)} />
              </Field>
            </div>
            <div className="space-y-4">
              <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "#C8A86B" }}>
                Media & SEO
              </div>
              <Field label="Hero Image URL">
                <DarkInput value={brand.hero_image} onChange={(e) => brandPatch("hero_image", e.target.value)} placeholder="https://…" />
                {brand.hero_image && (
                  <img src={brand.hero_image} alt="" className="mt-3 w-full h-32 object-cover rounded-md opacity-70" />
                )}
              </Field>
              <div className="rounded-md p-3 text-[12px]" style={{ background: "rgba(200,168,107,0.08)", border: "1px solid #2A2A38", color: "#888899" }}>
                SEO meta, announcement bar, WhatsApp number and the delivery note now live in the
                <strong style={{ color: "#C8A86B" }}> Brand &amp; Store </strong> tab, so one edit updates the site,
                emails and receipts together.
              </div>
            </div>
          </div>
          <button
            onClick={saveBrand}
            disabled={savingBrand}
            className="mt-6 rounded-md px-6 py-2.5 text-[13px] font-semibold disabled:opacity-60"
            style={{ background: "#C8A86B", color: "#1a1a1a" }}
          >
            {savingBrand ? "Saving…" : "Save & publish to live site"}
          </button>
        </Card>
      )}

      {tab === "Brand & Store" && (
        <Card>
          <CardTitle right="One place — applies everywhere">Brand & Store</CardTitle>
          <p className="text-[12px] mb-4" style={{ color: "#888899" }}>
            These details are the single source of truth. Changing them updates the storefront, page titles &amp; social
            previews, every Resend email, and order receipts automatically.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Brand Name">
              <DarkInput value={brand.brand_name} onChange={(e) => brandPatch("brand_name", e.target.value)} />
            </Field>
            <Field label="Tagline">
              <DarkInput value={brand.tagline} onChange={(e) => brandPatch("tagline", e.target.value)} />
            </Field>
            <Field label="Cities">
              <DarkInput value={brand.cities} onChange={(e) => brandPatch("cities", e.target.value)} />
            </Field>
            <Field label="Established">
              <DarkInput value={brand.established} onChange={(e) => brandPatch("established", e.target.value)} />
            </Field>
            <Field label="Phone">
              <DarkInput value={brand.phone} onChange={(e) => brandPatch("phone", e.target.value)} />
            </Field>
            <Field label="WhatsApp (digits, with country code)">
              <DarkInput value={brand.whatsapp} onChange={(e) => brandPatch("whatsapp", e.target.value)} />
            </Field>
            <Field label="Email">
              <DarkInput value={brand.email} onChange={(e) => brandPatch("email", e.target.value)} />
            </Field>
            <Field label="Address">
              <DarkInput value={brand.address} onChange={(e) => brandPatch("address", e.target.value)} />
            </Field>
            <Field label="Advance Deposit (%)">
              <DarkInput type="number" value={brand.deposit_rate} onChange={(e) => brandPatch("deposit_rate", Number(e.target.value))} />
            </Field>
            <Field label="Free Delivery Above (₹)">
              <DarkInput type="number" value={brand.free_delivery_above} onChange={(e) => brandPatch("free_delivery_above", Number(e.target.value))} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Delivery Note">
                <DarkInput value={brand.delivery_note} onChange={(e) => brandPatch("delivery_note", e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Meta Title (SEO)">
                <DarkInput value={brand.meta_title} onChange={(e) => brandPatch("meta_title", e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Meta Description (SEO)">
                <DarkTextarea rows={2} value={brand.meta_description} onChange={(e) => brandPatch("meta_description", e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2 flex items-center justify-between py-1">
              <div className="text-[13px]">Show announcement bar</div>
              <button
                type="button"
                onClick={() => brandPatch("announcement_on", !brand.announcement_on)}
                className="relative w-9 h-5 rounded-full transition-colors"
                style={{ background: brand.announcement_on ? "#4CAF82" : "#2A2A38" }}
                aria-label="Toggle announcement bar"
              >
                <span
                  className="absolute top-0.5 size-4 rounded-full bg-white transition-all"
                  style={{ left: brand.announcement_on ? "18px" : "2px" }}
                />
              </button>
            </div>
            <div className="sm:col-span-2 grid gap-2 rounded-lg p-3" style={{ background: "#16161D", border: "1px solid #2A2A38" }}>
              <div className="text-[11px] uppercase tracking-[0.14em] mb-1" style={{ color: "#C8A86B" }}>Customer verification</div>
              <div className="flex items-center justify-between py-1">
                <div className="text-[13px]">
                  Require phone OTP verification
                  <div className="text-[11px]" style={{ color: "#888899" }}>Customers must verify their mobile before an order is placed.</div>
                </div>
                <button
                  type="button"
                  onClick={() => brandPatch("require_phone_verification", !brand.require_phone_verification)}
                  className="relative w-9 h-5 rounded-full shrink-0 transition-colors"
                  style={{ background: brand.require_phone_verification ? "#4CAF82" : "#2A2A38" }}
                  aria-label="Toggle phone verification"
                >
                  <span className="absolute top-0.5 size-4 rounded-full bg-white transition-all" style={{ left: brand.require_phone_verification ? "18px" : "2px" }} />
                </button>
              </div>
              <div className="flex items-center justify-between py-1">
                <div className="text-[13px]">
                  Require email verification
                  <div className="text-[11px]" style={{ color: "#888899" }}>Blocks checkout until the customer's email is confirmed.</div>
                </div>
                <button
                  type="button"
                  onClick={() => brandPatch("require_email_verification", !brand.require_email_verification)}
                  className="relative w-9 h-5 rounded-full shrink-0 transition-colors"
                  style={{ background: brand.require_email_verification ? "#4CAF82" : "#2A2A38" }}
                  aria-label="Toggle email verification"
                >
                  <span className="absolute top-0.5 size-4 rounded-full bg-white transition-all" style={{ left: brand.require_email_verification ? "18px" : "2px" }} />
                </button>
              </div>
            </div>
            <div className="sm:col-span-2">
              <Field label="Announcement Text">
                <DarkInput value={brand.announcement ?? ""} onChange={(e) => brandPatch("announcement", e.target.value)} placeholder='e.g. "🎉 Sale — 20% off recliners"' />
              </Field>
            </div>
          </div>
          <button
            onClick={saveBrand}
            disabled={savingBrand}
            className="mt-6 rounded-md px-6 py-2.5 text-[13px] font-semibold disabled:opacity-60"
            style={{ background: "#C8A86B", color: "#1a1a1a" }}
          >
            {savingBrand ? "Saving…" : "💾 Save Brand Details"}
          </button>
        </Card>
      )}

      {tab === "API Config" && (
        <Card>
          <CardTitle>API Configuration</CardTitle>
          <Field label="App Origin">
            <DarkInput value={apiUrl} readOnly />
          </Field>
          <button
            onClick={pingApi}
            className="mt-3 rounded-md px-4 py-2 text-[13px]"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #2A2A38", color: "#E8E8F0" }}
          >
            ↺ Ping /api/public/health
          </button>
          <div
            className="mt-5 rounded-lg p-4 text-[12px] space-y-1"
            style={{ background: "#16161D", border: "1px solid #2A2A38", color: "#888899" }}
          >
            <div className="font-medium mb-2" style={{ color: "#E8E8F0" }}>Public endpoints</div>
            <div>GET /api/public/health — Health check</div>
            <div>POST /api/public/webhook — Webhook receiver</div>
          </div>
        </Card>
      )}

      {tab === "Danger Zone" && (
        <div className="rounded-xl p-5" style={{ background: "#1E1E28", border: "1px solid rgba(224,80,80,0.3)" }}>
          <div className="text-[13px] font-semibold mb-2" style={{ color: "#E05050" }}>Danger Zone</div>
          <div className="text-[12px] mb-4" style={{ color: "#888899" }}>
            Clear all locally cached data from this browser (cart, CMS drafts, visitor log, welcome popup state).
            Live database data is unaffected.
          </div>
          <button
            onClick={clearLocal}
            className="rounded-md px-5 py-2.5 text-[13px]"
            style={{ background: "transparent", border: "1px solid #E05050", color: "#E05050" }}
          >
            Clear Local Cache
          </button>
        </div>
      )}
    </div>
  );
}

function fmtRel(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const V_ALL_TYPES = [
  "all",
  "session",
  "visit",
  "product_view",
  "view_3d",
  "add_to_cart",
  "quote",
  "newsletter",
] as const;

const V_TYPE_ICONS: Record<string, string> = {
  session: "👤",
  visit: "👁️",
  product_view: "🛋️",
  view_3d: "🧊",
  add_to_cart: "🛒",
  quote: "📝",
  newsletter: "✉️",
};

const V_TYPE_COLORS: Record<string, string> = {
  session: "#C8A86B",
  visit: "#6BA8C8",
  product_view: "#4CAF82",
  view_3d: "#A86BC8",
  add_to_cart: "#E0A458",
  quote: "#E5484D",
  newsletter: "#6BC8B4",
};

function Visitors() {
  const [visitors, setVisitors] = useState<VisitorEvent[]>([]);
  const [filter, setFilter] = useState<string>("all");

  const load = () => {
    setVisitors(getVisitors());
    void getRemoteVisitors().then((remote) => {
      const local = getVisitors();
      const seen = new Set<string>();
      const merged = [...remote, ...local].filter((v) => {
        const k = `${v.time}|${v.type}|${v.page ?? ""}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      setVisitors(merged.sort((a, b) => (a.time > b.time ? 1 : -1)));
    });
  };

  useEffect(() => {
    load();
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
            onClick={load}
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