import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { COL, fsList, fsListSorted, fsAdd, fsUpdate, fsDelete, orderBy } from "@/lib/db/firestore";
import { formatINR, formatDate } from "@/lib/format";
import { ACard, AButton, AEmpty, AField, AInput, AModal, ASelect, ATextarea, AToggle, dark } from "./ui";

export type Coupon = {
  id: string;
  code: string;
  description?: string | null;
  discount_type: "percent" | "flat";
  discount_value: number;
  max_discount_amount?: number | null;
  min_order_amount: number;
  max_order_amount?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  applies_to?: "all" | "products";
  product_ids?: string[];
  include_cities?: string[];
  exclude_cities?: string[];
  new_customers_only?: boolean;
  min_orders_count?: number;
  max_uses?: number | null;
  max_uses_per_user?: number | null;
  uses_count: number;
  stackable?: boolean;
  first_order_free_delivery?: boolean;
  active: boolean;
  created_at?: string;
};

const BLANK: Omit<Coupon, "id"> = {
  code: "",
  description: "",
  discount_type: "percent",
  discount_value: 10,
  max_discount_amount: null,
  min_order_amount: 0,
  max_order_amount: null,
  valid_from: new Date().toISOString().slice(0, 10),
  valid_until: null,
  applies_to: "all",
  product_ids: [],
  include_cities: [],
  exclude_cities: [],
  new_customers_only: false,
  min_orders_count: 0,
  max_uses: null,
  max_uses_per_user: 1,
  uses_count: 0,
  stackable: false,
  first_order_free_delivery: false,
  active: true,
};

const csv = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

export function CouponManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => fsListSorted<Coupon>(COL.coupons, "created_at", "desc"),
  });
  const { data: sofas } = useQuery({
    queryKey: ["admin-coupon-sofas"],
    queryFn: async () => fsList<{ id: string; name: string }>(COL.sofas),
  });

  const rows = useMemo(() => {
    const list = data ?? [];
    if (!q.trim()) return list;
    return list.filter((c) => c.code?.toLowerCase().includes(q.toLowerCase()));
  }, [data, q]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-coupons"] });

  const toggle = async (c: Coupon) => {
    await fsUpdate(COL.coupons, c.id, { active: !c.active });
    refresh();
  };
  const remove = async (c: Coupon) => {
    if (!confirm(`Delete coupon ${c.code}?`)) return;
    await fsDelete(COL.coupons, c.id);
    toast.success("Coupon deleted");
    refresh();
  };

  const statusOf = (c: Coupon) => {
    const now = Date.now();
    if (!c.active) return { label: "Paused", color: dark.mute };
    if (c.valid_until && new Date(c.valid_until).getTime() < now) return { label: "Expired", color: dark.danger };
    if (c.valid_from && new Date(c.valid_from).getTime() > now) return { label: "Scheduled", color: "#5090E0" };
    if (c.max_uses && c.uses_count >= c.max_uses) return { label: "Exhausted", color: dark.danger };
    return { label: "Live", color: dark.good };
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <AButton onClick={() => setEditing({ id: "", ...BLANK } as Coupon)}>🏷️ Create coupon</AButton>
        <div className="flex-1" />
        <AInput placeholder="Search code…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 200 }} />
      </div>

      {isLoading ? (
        <ACard><AEmpty icon="⏳" text="Loading coupons…" /></ACard>
      ) : rows.length === 0 ? (
        <ACard><AEmpty icon="🏷️" text="No coupons yet. Create your first offer." /></ACard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => {
            const st = statusOf(c);
            return (
              <ACard key={c.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-[15px] font-bold" style={{ color: dark.accent }}>{c.code}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: dark.mute }}>
                      {c.discount_type === "percent"
                        ? `${c.discount_value}% off${c.max_discount_amount ? ` (max ${formatINR(Number(c.max_discount_amount))})` : ""}`
                        : `${formatINR(Number(c.discount_value))} off`}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${st.color}22`, color: st.color }}>{st.label}</span>
                </div>

                {c.description && <p className="text-[12px] mt-2 opacity-80">{c.description}</p>}

                <ul className="mt-3 space-y-1 text-[11px]" style={{ color: dark.mute }}>
                  <li>Order value: {formatINR(Number(c.min_order_amount || 0))}{c.max_order_amount ? ` – ${formatINR(Number(c.max_order_amount))}` : "+"}</li>
                  <li>
                    Window: {c.valid_from ? formatDate(c.valid_from) : "anytime"} → {c.valid_until ? formatDate(c.valid_until) : "no end"}
                  </li>
                  <li>Products: {c.applies_to === "products" ? `${c.product_ids?.length ?? 0} selected` : "all products"}</li>
                  {!!c.include_cities?.length && <li>Only in: {c.include_cities.join(", ")}</li>}
                  {!!c.exclude_cities?.length && <li>Not in: {c.exclude_cities.join(", ")}</li>}
                  {c.new_customers_only && <li>New customers only</li>}
                  {!!c.min_orders_count && <li>Needs {c.min_orders_count}+ past orders</li>}
                  <li>Used {c.uses_count ?? 0}{c.max_uses ? ` / ${c.max_uses}` : ""} times</li>
                </ul>

                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <AToggle checked={!!c.active} onChange={() => toggle(c)} label={c.active ? "Active" : "Paused"} />
                  <div className="flex-1" />
                  <AButton variant="ghost" onClick={() => navigator.clipboard?.writeText(c.code).then(() => toast.success("Code copied"))}>Copy</AButton>
                  <AButton variant="ghost" onClick={() => setEditing(c)}>Edit</AButton>
                  <AButton variant="danger" onClick={() => remove(c)}>Delete</AButton>
                </div>
              </ACard>
            );
          })}
        </div>
      )}

      {editing && (
        <CouponEditor
          coupon={editing}
          sofas={sofas ?? []}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

function CouponEditor({
  coupon,
  sofas,
  onClose,
  onSaved,
}: {
  coupon: Coupon;
  sofas: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !coupon.id;
  const [f, setF] = useState<Coupon>({ ...coupon });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Coupon>(k: K, v: Coupon[K]) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    const code = (f.code ?? "").toUpperCase().trim();
    if (!code) return toast.error("Coupon code is required");
    if (!f.discount_value || Number(f.discount_value) <= 0) return toast.error("Discount value must be greater than zero");
    if (f.discount_type === "percent" && Number(f.discount_value) > 100) return toast.error("Percent discount cannot exceed 100");
    if (f.valid_from && f.valid_until && new Date(f.valid_until) < new Date(f.valid_from)) return toast.error("End date is before the start date");

    const payload = {
      code,
      description: f.description ?? "",
      discount_type: f.discount_type,
      discount_value: Number(f.discount_value),
      max_discount_amount: f.max_discount_amount ? Number(f.max_discount_amount) : null,
      min_order_amount: Number(f.min_order_amount) || 0,
      max_order_amount: f.max_order_amount ? Number(f.max_order_amount) : null,
      valid_from: f.valid_from || null,
      valid_until: f.valid_until || null,
      applies_to: f.applies_to ?? "all",
      product_ids: f.applies_to === "products" ? f.product_ids ?? [] : [],
      include_cities: f.include_cities ?? [],
      exclude_cities: f.exclude_cities ?? [],
      new_customers_only: !!f.new_customers_only,
      min_orders_count: Number(f.min_orders_count) || 0,
      max_uses: f.max_uses ? Number(f.max_uses) : null,
      max_uses_per_user: f.max_uses_per_user ? Number(f.max_uses_per_user) : null,
      stackable: !!f.stackable,
      first_order_free_delivery: !!f.first_order_free_delivery,
      active: !!f.active,
    };
    setSaving(true);
    try {
      if (isNew) await fsAdd(COL.coupons, { ...payload, uses_count: 0, created_at: new Date().toISOString() });
      else await fsUpdate(COL.coupons, coupon.id, payload);
      toast.success(isNew ? "Coupon created" : "Coupon updated");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AModal
      open
      wide
      onClose={onClose}
      title={isNew ? "Create coupon" : `Edit ${coupon.code}`}
      subtitle="Set the discount, then narrow down who can use it and where."
      footer={
        <>
          <AButton variant="ghost" onClick={onClose}>Cancel</AButton>
          <AButton disabled={saving} onClick={save}>{saving ? "Saving…" : isNew ? "Create coupon" : "Save changes"}</AButton>
        </>
      }
    >
      <Section title="The offer">
        <div className="grid gap-3 sm:grid-cols-3">
          <AField label="Coupon code">
            <AInput value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="DIWALI10" style={{ fontFamily: "monospace", letterSpacing: "0.08em" }} />
          </AField>
          <AField label="Discount type">
            <ASelect value={f.discount_type} onChange={(e) => set("discount_type", e.target.value as Coupon["discount_type"])}>
              <option value="percent">Percent off</option>
              <option value="flat">Flat ₹ off</option>
            </ASelect>
          </AField>
          <AField label={f.discount_type === "percent" ? "Percent (1–100)" : "Amount (₹)"}>
            <AInput type="number" min={1} value={f.discount_value} onChange={(e) => set("discount_value", Number(e.target.value))} />
          </AField>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 mt-3">
          {f.discount_type === "percent" && (
            <AField label="Max discount (₹)" hint="optional cap">
              <AInput type="number" value={f.max_discount_amount ?? ""} onChange={(e) => set("max_discount_amount", e.target.value ? Number(e.target.value) : null)} />
            </AField>
          )}
          <AField label="Minimum order (₹)">
            <AInput type="number" value={f.min_order_amount ?? 0} onChange={(e) => set("min_order_amount", Number(e.target.value))} />
          </AField>
          <AField label="Maximum order (₹)" hint="optional">
            <AInput type="number" value={f.max_order_amount ?? ""} onChange={(e) => set("max_order_amount", e.target.value ? Number(e.target.value) : null)} />
          </AField>
        </div>
        <div className="mt-3">
          <AField label="Internal description">
            <ATextarea rows={2} value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Festive offer for Indore walk-ins" />
          </AField>
        </div>
      </Section>

      <Section title="Validity window">
        <div className="grid gap-3 sm:grid-cols-2">
          <AField label="Valid from"><AInput type="date" value={(f.valid_from ?? "").slice(0, 10)} onChange={(e) => set("valid_from", e.target.value || null)} /></AField>
          <AField label="Valid till" hint="leave empty for no expiry"><AInput type="date" value={(f.valid_until ?? "").slice(0, 10)} onChange={(e) => set("valid_until", e.target.value || null)} /></AField>
        </div>
      </Section>

      <Section title="Where it applies">
        <div className="grid gap-3 sm:grid-cols-2">
          <AField label="Products">
            <ASelect value={f.applies_to ?? "all"} onChange={(e) => set("applies_to", e.target.value as "all" | "products")}>
              <option value="all">All products</option>
              <option value="products">Only selected products</option>
            </ASelect>
          </AField>
          <AField label="Usage cap (total)" hint="optional">
            <AInput type="number" value={f.max_uses ?? ""} onChange={(e) => set("max_uses", e.target.value ? Number(e.target.value) : null)} />
          </AField>
        </div>
        {f.applies_to === "products" && (
          <div className="mt-3 max-h-44 overflow-y-auto rounded-md p-3 grid gap-1.5 sm:grid-cols-2" style={{ background: dark.field, border: `1px solid ${dark.border}` }}>
            {sofas.map((s) => {
              const on = (f.product_ids ?? []).includes(s.id);
              return (
                <label key={s.id} className="flex items-center gap-2 text-[12px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      set("product_ids", on ? (f.product_ids ?? []).filter((i) => i !== s.id) : [...(f.product_ids ?? []), s.id])
                    }
                  />
                  {s.name}
                </label>
              );
            })}
            {sofas.length === 0 && <span className="text-[12px]" style={{ color: dark.mute }}>No products found.</span>}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 mt-3">
          <AField label="Valid only in cities" hint="comma separated, empty = everywhere">
            <AInput value={(f.include_cities ?? []).join(", ")} onChange={(e) => set("include_cities", csv(e.target.value))} placeholder="Indore, Ujjain" />
          </AField>
          <AField label="Not valid in cities" hint="comma separated">
            <AInput value={(f.exclude_cities ?? []).join(", ")} onChange={(e) => set("exclude_cities", csv(e.target.value))} placeholder="Bhopal" />
          </AField>
        </div>
      </Section>

      <Section title="Who can use it">
        <div className="grid gap-3 sm:grid-cols-2">
          <AField label="Minimum past orders" hint="0 = anyone">
            <AInput type="number" min={0} value={f.min_orders_count ?? 0} onChange={(e) => set("min_orders_count", Number(e.target.value))} />
          </AField>
          <AField label="Uses per customer">
            <AInput type="number" min={1} value={f.max_uses_per_user ?? 1} onChange={(e) => set("max_uses_per_user", Number(e.target.value))} />
          </AField>
        </div>
        <div className="flex flex-wrap gap-5 mt-4">
          <AToggle checked={!!f.new_customers_only} onChange={(v) => set("new_customers_only", v)} label="New customers only" />
          <AToggle checked={!!f.stackable} onChange={(v) => set("stackable", v)} label="Can stack with other offers" />
          <AToggle checked={!!f.first_order_free_delivery} onChange={(v) => set("first_order_free_delivery", v)} label="Also free delivery" />
          <AToggle checked={!!f.active} onChange={(v) => set("active", v)} label="Active" />
        </div>
      </Section>
    </AModal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${dark.border}` }}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-3" style={{ color: dark.accent }}>{title}</div>
      {children}
    </div>
  );
}
