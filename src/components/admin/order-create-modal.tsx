import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { COL, fsList, fsListSorted, fsAdd, fsUpdate, orderBy } from "@/lib/db/firestore";
import { formatINR, ORDER_STATUS_STEPS } from "@/lib/format";
import { useCarpenters } from "./carpenter-manager";
import { AButton, AField, AInput, AModal, ASelect, ATextarea, dark } from "./ui";

type Profile = { id: string; full_name?: string | null; phone?: string | null; email?: string | null; city?: string | null };
type Sofa = { id: string; name: string; slug: string; base_price: number; hero_image?: string | null };

/** Admin-created order — can also create the customer record on the fly. */
export function OrderCreateModal({ open, onClose, onCreated, adminId }: { open: boolean; onClose: () => void; onCreated: () => void; adminId: string }) {
  const { data: customers } = useQuery({
    queryKey: ["admin-customers-lite"],
    queryFn: async () => fsListSorted<Profile>(COL.profiles, "created_at", "desc"),
    enabled: open,
  });
  const { data: sofas } = useQuery({
    queryKey: ["admin-sofas-lite"],
    queryFn: async () => fsList<Sofa>(COL.sofas),
    enabled: open,
  });
  const { data: carpenters } = useCarpenters();

  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [customerId, setCustomerId] = useState("");
  const [search, setSearch] = useState("");
  const [nc, setNc] = useState({ full_name: "", phone: "", email: "", city: "Indore" });

  const [sofaId, setSofaId] = useState("");
  const [productName, setProductName] = useState("");
  const [fabric, setFabric] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [depositPaid, setDepositPaid] = useState(0);
  const [status, setStatus] = useState("pending_deposit");
  const [source, setSource] = useState("showroom");
  const [craftsman, setCraftsman] = useState("");
  const [city, setCity] = useState("Indore");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [eta, setEta] = useState(new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredCustomers = useMemo(() => {
    const list = customers ?? [];
    if (!search.trim()) return list.slice(0, 50);
    const s = search.toLowerCase();
    return list.filter((c) => (c.full_name ?? "").toLowerCase().includes(s) || (c.phone ?? "").includes(s) || (c.email ?? "").toLowerCase().includes(s)).slice(0, 50);
  }, [customers, search]);

  const subtotal = Math.max(0, Number(unitPrice) || 0) * Math.max(1, Number(qty) || 1);
  const total = Math.max(0, subtotal - (Number(discount) || 0));
  const balance = Math.max(0, total - (Number(depositPaid) || 0));

  const pickSofa = (id: string) => {
    setSofaId(id);
    const s = (sofas ?? []).find((x) => x.id === id);
    if (s) {
      setProductName(s.name);
      if (!unitPrice) setUnitPrice(Number(s.base_price) || 0);
    }
  };

  const pickCustomer = (id: string) => {
    setCustomerId(id);
    const c = (customers ?? []).find((x) => x.id === id);
    if (c) {
      if (c.phone) setPhone(c.phone);
      if (c.city) setCity(c.city);
    }
  };

  const submit = async () => {
    if (mode === "existing" && !customerId) return toast.error("Pick a customer");
    if (mode === "new" && (!nc.full_name.trim() || !nc.phone.trim())) return toast.error("New customer needs a name and phone");
    if (!productName.trim()) return toast.error("Choose or name the product");
    if (total <= 0) return toast.error("Order total must be greater than zero");

    setSaving(true);
    try {
      let uid = customerId;
      if (mode === "new") {
        uid = await fsAdd(COL.profiles, {
          full_name: nc.full_name.trim(),
          phone: nc.phone.trim(),
          email: nc.email.trim() || null,
          city: nc.city,
          phone_verified: false,
          created_by_admin: true,
          created_at: new Date().toISOString(),
        });
      }

      const sofa = (sofas ?? []).find((s) => s.id === sofaId);
      const nowIso = new Date().toISOString();
      const orderNumber = `TF-${String(Date.now() % 100000).padStart(5, "0")}`;
      const orderId = await fsAdd(COL.orders, {
        user_id: uid,
        order_number: orderNumber,
        sofa_id: sofaId || null,
        sofa_snapshot: {
          name: productName,
          slug: sofa?.slug ?? null,
          image: sofa?.hero_image ?? null,
          unit_price: Number(unitPrice) || 0,
          quantity: Number(qty) || 1,
        },
        fabric_snapshot: fabric ? { name: fabric } : null,
        size_snapshot: { label: size || null, color: color || null },
        addons_snapshot: [],
        subtotal,
        discount: Number(discount) || 0,
        total,
        deposit_paid: Number(depositPaid) || 0,
        balance_due: balance,
        status,
        order_source: source,
        assigned_craftsman: craftsman || null,
        delivery_city: city,
        delivery_address: address || null,
        phone: phone || (mode === "new" ? nc.phone : null),
        customer_notes: notes || null,
        admin_notes: adminNotes || null,
        expected_delivery_date: eta || null,
        created_by: adminId || null,
        created_at: nowIso,
      });

      await fsAdd(COL.orderStatusHistory, {
        order_id: orderId,
        user_id: uid,
        status,
        note: "Order created by admin",
        changed_by: adminId || null,
        created_at: nowIso,
      });

      if (mode === "existing" && phone) {
        try { await fsUpdate(COL.profiles, uid, { phone, city }); } catch { /* non-fatal */ }
      }

      toast.success(`Order ${orderNumber} created`);
      onCreated();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AModal
      open={open}
      wide
      onClose={onClose}
      title="Create a new order"
      subtitle="For walk-in, phone and WhatsApp orders taken by the team."
      footer={
        <>
          <AButton variant="ghost" onClick={onClose}>Cancel</AButton>
          <AButton disabled={saving} onClick={submit}>{saving ? "Creating…" : `Create order · ${formatINR(total)}`}</AButton>
        </>
      }
    >
      <Box title="Customer">
        <div className="flex gap-2 mb-3">
          {(["existing", "new"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="text-[11px] px-3 py-1.5 rounded-full"
              style={{
                background: mode === m ? dark.accent : "transparent",
                color: mode === m ? "#1a1a1a" : dark.mute,
                border: `1px solid ${mode === m ? dark.accent : dark.border}`,
              }}
            >
              {m === "existing" ? "Existing customer" : "New customer"}
            </button>
          ))}
        </div>
        {mode === "existing" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <AField label="Search"><AInput placeholder="Name, phone or email" value={search} onChange={(e) => setSearch(e.target.value)} /></AField>
            <AField label="Customer">
              <ASelect value={customerId} onChange={(e) => pickCustomer(e.target.value)}>
                <option value="">— Select —</option>
                {filteredCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(c.full_name ?? "Unnamed")} {c.phone ? `· ${c.phone}` : ""} {c.city ? `· ${c.city}` : ""}
                  </option>
                ))}
              </ASelect>
            </AField>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <AField label="Full name"><AInput value={nc.full_name} onChange={(e) => setNc({ ...nc, full_name: e.target.value })} /></AField>
            <AField label="Phone"><AInput value={nc.phone} onChange={(e) => { setNc({ ...nc, phone: e.target.value }); setPhone(e.target.value); }} /></AField>
            <AField label="Email" hint="optional"><AInput value={nc.email} onChange={(e) => setNc({ ...nc, email: e.target.value })} /></AField>
            <AField label="City">
              <ASelect value={nc.city} onChange={(e) => { setNc({ ...nc, city: e.target.value }); setCity(e.target.value); }}>
                <option>Indore</option><option>Ujjain</option><option>Dewas</option><option>Other</option>
              </ASelect>
            </AField>
          </div>
        )}
      </Box>

      <Box title="Product & pricing">
        <div className="grid gap-3 sm:grid-cols-2">
          <AField label="Catalogue product">
            <ASelect value={sofaId} onChange={(e) => pickSofa(e.target.value)}>
              <option value="">— Custom / not in catalogue —</option>
              {(sofas ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </ASelect>
          </AField>
          <AField label="Product name on the order"><AInput value={productName} onChange={(e) => setProductName(e.target.value)} /></AField>
          <AField label="Fabric"><AInput value={fabric} onChange={(e) => setFabric(e.target.value)} placeholder="Boucle / Velvet…" /></AField>
          <AField label="Size"><AInput value={size} onChange={(e) => setSize(e.target.value)} placeholder="3 seater" /></AField>
          <AField label="Colour"><AInput value={color} onChange={(e) => setColor(e.target.value)} /></AField>
          <AField label="Quantity"><AInput type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} /></AField>
          <AField label="Unit price (₹)"><AInput type="number" min={0} value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} /></AField>
          <AField label="Discount (₹)"><AInput type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></AField>
          <AField label="Advance / deposit received (₹)"><AInput type="number" min={0} value={depositPaid} onChange={(e) => setDepositPaid(Number(e.target.value))} /></AField>
        </div>
        <div className="mt-3 flex flex-wrap gap-5 text-[12px]" style={{ color: dark.mute }}>
          <span>Subtotal <b style={{ color: dark.text }}>{formatINR(subtotal)}</b></span>
          <span>Total <b style={{ color: dark.accent }}>{formatINR(total)}</b></span>
          <span>Balance due <b style={{ color: dark.text }}>{formatINR(balance)}</b></span>
        </div>
      </Box>

      <Box title="Fulfilment">
        <div className="grid gap-3 sm:grid-cols-2">
          <AField label="Status">
            <ASelect value={status} onChange={(e) => setStatus(e.target.value)}>
              {ORDER_STATUS_STEPS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </ASelect>
          </AField>
          <AField label="Order source">
            <ASelect value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="showroom">Showroom walk-in</option>
              <option value="phone">Phone call</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="referral">Referral</option>
              <option value="website">Website</option>
              <option value="other">Other</option>
            </ASelect>
          </AField>
          <AField label="Assigned carpenter">
            <ASelect value={craftsman} onChange={(e) => setCraftsman(e.target.value)}>
              <option value="">— Unassigned —</option>
              {(carpenters ?? []).filter((c) => c.active).map((c) => (
                <option key={c.id} value={c.full_name}>{c.full_name} · {c.city}</option>
              ))}
            </ASelect>
          </AField>
          <AField label="Expected delivery"><AInput type="date" value={eta} onChange={(e) => setEta(e.target.value)} /></AField>
          <AField label="Delivery city"><AInput value={city} onChange={(e) => setCity(e.target.value)} /></AField>
          <AField label="Contact phone"><AInput value={phone} onChange={(e) => setPhone(e.target.value)} /></AField>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 mt-3">
          <AField label="Delivery address"><ATextarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} /></AField>
          <AField label="Customer notes"><ATextarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></AField>
        </div>
        <div className="mt-3">
          <AField label="Internal notes"><ATextarea rows={2} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} /></AField>
        </div>
      </Box>
    </AModal>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${dark.border}` }}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-3" style={{ color: dark.accent }}>{title}</div>
      {children}
    </div>
  );
}
