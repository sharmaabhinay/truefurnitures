import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listProductCartHolders } from "@/lib/admin-data.functions";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/products/$id/carts")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "In customers' carts — Admin · True Furniture's" },
      { name: "description", content: "View customers holding this True Furniture's product in their carts." },
      { property: "og:title", content: "Product Cart Customers — True Furniture's Admin" },
      { property: "og:description", content: "View customers holding a selected product in their carts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProductCarts,
});

const dark = {
  bg: "#0F0F13",
  card: "#16161D",
  border: "#2A2A38",
  text: "#E8E8F0",
  mute: "#888899",
  accent: "#C8A86B",
};

type Holder = {
  uid: string;
  name: string;
  email: string;
  phone: string;
  quantity: number;
  lastAdded: string | null;
  lines: Array<{ quantity: number; fabric?: string; size?: string; color?: string }>;
};

function ProductCarts() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const loadHolders = useServerFn(listProductCartHolders);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["product-carts", id],
    queryFn: () => loadHolders({ data: { productId: id } }),
    staleTime: 0,
  });
  const product = data?.product;
  const holders = (data?.holders ?? []) as Holder[];

  const units = (holders ?? []).reduce((n, h) => n + h.quantity, 0);

  return (
    <div className="min-h-screen p-5" style={{ background: dark.bg, color: dark.text }}>
      <div className="mx-auto max-w-4xl space-y-4">
        <Link to="/admin" className="text-[12px]" style={{ color: dark.accent }}>
          ← Back to admin
        </Link>

        <div className="rounded-xl p-4" style={{ background: dark.card, border: `1px solid ${dark.border}` }}>
          <div className="text-[11px] uppercase tracking-[0.08em]" style={{ color: dark.mute }}>
            In customers' carts
          </div>
          <h1 className="text-[20px] font-semibold">{product?.name ?? "Product"}</h1>
          <div className="mt-2 text-[13px]" style={{ color: dark.mute }}>
            {units} item(s) held by {holders.length} customer(s)
          </div>
        </div>

        {error && (
          <div className="rounded-xl p-4 text-[13px] flex items-center justify-between gap-3" style={{ background: dark.card, border: `1px solid ${dark.border}`, color: "#E05050" }}>
            <span>Cart customer data could not be loaded.</span>
            <button type="button" onClick={() => void refetch()} style={{ color: dark.accent }}>Try again</button>
          </div>
        )}

        <div className="rounded-xl overflow-hidden" style={{ background: dark.card, border: `1px solid ${dark.border}` }}>
          {isLoading && <div className="p-5 text-[13px]" style={{ color: dark.mute }}>Loading…</div>}
          {!isLoading && !error && holders.length === 0 && (
            <div className="p-5 text-[13px]" style={{ color: dark.mute }}>
              Nobody has this product in their cart right now.
            </div>
          )}
          {holders.map((h) => (
            <button
              key={h.uid}
              type="button"
              onClick={() =>
                navigate({ to: "/admin/customers/$id", params: { id: h.uid }, search: { product: id } })
              }
              className="w-full text-left p-4 flex flex-wrap items-center justify-between gap-3"
              style={{ borderTop: `1px solid ${dark.border}` }}
            >
              <div>
                <div className="text-[13px] font-semibold">{h.name}</div>
                <div className="text-[12px]" style={{ color: dark.mute }}>
                  {h.email} · {h.phone}
                </div>
                <div className="text-[11px] mt-1" style={{ color: dark.mute }}>
                  {h.lines
                    .map((l) => [l.fabric, l.size, l.color].filter(Boolean).join(" · ") || "Standard")
                    .join(" | ")}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[13px]" style={{ color: dark.accent }}>{h.quantity} in cart</div>
                <div className="text-[11px]" style={{ color: dark.mute }}>
                  {h.lastAdded ? formatDate(h.lastAdded) : "—"}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
