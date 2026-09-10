import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { COL, fsGet, fsList } from "@/lib/db/firestore";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/products/$id/carts")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "In customers' carts — Admin · True Furniture's" },
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

  const { data: product } = useQuery({
    queryKey: ["product-carts-sofa", id],
    queryFn: () => fsGet<any>(COL.sofas, id),
  });

  const { data: holders, isLoading } = useQuery({
    queryKey: ["product-carts", id, product?.slug ?? ""],
    queryFn: async (): Promise<Holder[]> => {
      const [carts, profiles] = await Promise.all([
        fsList<any>(COL.carts),
        fsList<any>(COL.profiles).catch(() => []),
      ]);
      const byUid = new Map<string, any>((profiles ?? []).map((p: any) => [p.id, p]));
      const slug = product?.slug;
      const out: Holder[] = [];
      for (const c of carts ?? []) {
        if (c.deleted_at) continue;
        const items: any[] = Array.isArray(c.items) ? c.items : [];
        const lines = items
          .filter((it) => it && (it.sofaId === id || (slug && it.slug === slug)))
          .map((it) => ({
            quantity: Math.max(0, Number(it.quantity) || 0),
            fabric: it.fabric,
            size: it.size,
            color: it.color,
            addedAt: typeof it.addedAt === "string" ? it.addedAt : undefined,
          }))
          .filter((l) => l.quantity > 0);
        if (!lines.length) continue;
        const prof = byUid.get(c.id) ?? {};
        const times = lines.map((l) => l.addedAt).filter(Boolean) as string[];
        out.push({
          uid: c.id,
          name: prof.full_name || prof.name || "Guest customer",
          email: prof.email || "—",
          phone: prof.phone || "—",
          quantity: lines.reduce((n, l) => n + l.quantity, 0),
          lastAdded: times.length ? times.sort().at(-1)! : (c.updated_at ?? null),
          lines,
        });
      }
      return out.sort((a, b) => (b.lastAdded ?? "").localeCompare(a.lastAdded ?? ""));
    },
    enabled: !!product || product === null,
  });

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
            {units} item(s) held by {holders?.length ?? 0} customer(s)
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ background: dark.card, border: `1px solid ${dark.border}` }}>
          {isLoading && <div className="p-5 text-[13px]" style={{ color: dark.mute }}>Loading…</div>}
          {!isLoading && (holders ?? []).length === 0 && (
            <div className="p-5 text-[13px]" style={{ color: dark.mute }}>
              Nobody has this product in their cart right now.
            </div>
          )}
          {(holders ?? []).map((h) => (
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
