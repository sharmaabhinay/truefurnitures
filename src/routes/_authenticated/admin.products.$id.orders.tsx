import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { COL, fsGet, fsList } from "@/lib/db/firestore";
import { formatINR, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/products/$id/orders")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Product orders — Admin · True Furniture's" },
      { name: "description", content: "View orders placed for a selected True Furniture's product." },
      { property: "og:title", content: "Product Orders — True Furniture's Admin" },
      { property: "og:description", content: "View orders placed for a selected product." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProductOrders,
});

const dark = {
  bg: "#0F0F13",
  card: "#16161D",
  border: "#2A2A38",
  text: "#E8E8F0",
  mute: "#888899",
  accent: "#C8A86B",
};

function ProductOrders() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const { data: product } = useQuery({
    queryKey: ["product-orders-sofa", id],
    queryFn: () => fsGet<any>(COL.sofas, id),
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ["product-orders", id, product?.slug ?? ""],
    queryFn: async () => {
      const rows = await fsList<any>(COL.orders);
      const slug = product?.slug;
      return rows
        .filter((o) => !o.deleted_at)
        .filter((o) => o.sofa_id === id || (slug && o.sofa_snapshot?.slug === slug))
        .sort(
          (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
        );
    },
    enabled: !!product || product === null,
  });

  const revenue = (orders ?? []).reduce((n, o) => n + (Number(o.total) || 0), 0);

  return (
    <div className="min-h-screen p-5" style={{ background: dark.bg, color: dark.text }}>
      <div className="mx-auto max-w-4xl space-y-4">
        <Link to="/admin" className="text-[12px]" style={{ color: dark.accent }}>
          ← Back to admin
        </Link>

        <div className="rounded-xl p-4" style={{ background: dark.card, border: `1px solid ${dark.border}` }}>
          <div className="text-[11px] uppercase tracking-[0.08em]" style={{ color: dark.mute }}>
            Orders for
          </div>
          <h1 className="text-[20px] font-semibold">{product?.name ?? "Product"}</h1>
          <div className="mt-2 text-[13px]" style={{ color: dark.mute }}>
            {orders?.length ?? 0} order(s) · {formatINR(revenue)} total value
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ background: dark.card, border: `1px solid ${dark.border}` }}>
          {isLoading && <div className="p-5 text-[13px]" style={{ color: dark.mute }}>Loading…</div>}
          {!isLoading && (orders ?? []).length === 0 && (
            <div className="p-5 text-[13px]" style={{ color: dark.mute }}>
              No orders placed for this product yet.
            </div>
          )}
          {(orders ?? []).map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => navigate({ to: "/admin/orders/$id", params: { id: o.id } })}
              className="w-full text-left p-4 flex flex-wrap items-center justify-between gap-3"
              style={{ borderTop: `1px solid ${dark.border}` }}
            >
              <div>
                <div className="text-[13px] font-semibold">{o.order_number ?? o.id}</div>
                <div className="text-[12px]" style={{ color: dark.mute }}>
                  {o.customer_name || o.delivery_name || "—"} · {o.created_at ? formatDate(o.created_at) : "—"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[13px]" style={{ color: dark.accent }}>{formatINR(Number(o.total) || 0)}</div>
                <div className="text-[11px]" style={{ color: dark.mute }}>
                  {String(o.status ?? "").replace(/_/g, " ")}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
