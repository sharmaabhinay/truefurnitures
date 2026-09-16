import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FiPlus, FiTruck } from "react-icons/fi";
import { useServerFn } from "@tanstack/react-start";
import { listAdminManufacturers, saveAdminManufacturer } from "@/lib/admin-data.functions";
import { formatINR } from "@/lib/format";
import { ACard, AButton, AField, AInput, AModal, ASelect, ATextarea, AEmpty, dark } from "@/components/admin/ui";

export type Payment = { amount: number; date: string; note?: string };
export type Deal = { title: string; value: number; start?: string; end?: string };

export type Manufacturer = {
  id: string;
  company: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  location?: string;
  specialities?: string;
  notes?: string;
  partner_since?: string;
  status?: "active" | "ended";
  ended_at?: string;
  end_reason?: string;
  products_delivered?: number;
  payout_agreed?: number;
  deals?: Deal[];
  payments?: Payment[];
  deleted_at?: string | null;
};

export const emptyManufacturer: Partial<Manufacturer> = {
  company: "",
  status: "active",
  payout_agreed: 0,
  deals: [],
  payments: [],
};

export function paidTotal(m: Manufacturer) {
  return (m.payments ?? []).reduce((n, p) => n + (Number(p.amount) || 0), 0);
}

export function lastPaymentDate(m: Manufacturer) {
  return (m.payments ?? []).map((p) => p.date).filter(Boolean).sort().at(-1) ?? null;
}

export function ManufacturerManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<Manufacturer> | null>(null);

  const loadList = useServerFn(listAdminManufacturers);
  const saveOne = useServerFn(saveAdminManufacturer);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-manufacturers"],
    queryFn: async () => (await loadList()) as unknown as Manufacturer[],
    staleTime: 0,
  });

  const rows = useMemo(() => {
    const list = (data ?? []).filter((m) => !m.deleted_at);
    const needle = search.trim().toLowerCase();
    return list
      .filter((m) => (needle ? [m.company, m.contact_name, m.location].some((v) => (v ?? "").toLowerCase().includes(needle)) : true))
      .sort((a, b) => (a.company ?? "").localeCompare(b.company ?? ""));
  }, [data, search]);

  const save = async (m: Partial<Manufacturer>) => {
    if (!m.company?.trim()) return toast.error("Company name is required");
    if (m.status === "ended" && !m.end_reason?.trim()) return toast.error("Add a reason for ending the partnership");
    const payload = {
      company: m.company.trim(),
      contact_name: m.contact_name ?? "",
      phone: m.phone ?? "",
      email: m.email ?? "",
      location: m.location ?? "",
      specialities: m.specialities ?? "",
      notes: m.notes ?? "",
      partner_since: m.partner_since ?? "",
      status: m.status ?? "active",
      ended_at: m.status === "ended" ? (m.ended_at || new Date().toISOString().slice(0, 10)) : "",
      end_reason: m.status === "ended" ? (m.end_reason ?? "") : "",
      products_delivered: Number(m.products_delivered ?? 0) || 0,
      payout_agreed: Number(m.payout_agreed ?? 0) || 0,
      deals: m.deals ?? [],
      payments: m.payments ?? [],
      updated_at: new Date().toISOString(),
    };
    try {
      await saveOne({ data: { ...(m.id ? { id: m.id } : {}), data: payload } });
    } catch (e) {
      return toast.error(e instanceof Error ? e.message : "Could not save");
    }
    toast.success("Saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-manufacturers"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <AInput placeholder="Search manufacturers…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <AButton onClick={() => setEditing({ ...emptyManufacturer })}>
          <span className="inline-flex items-center gap-2"><FiPlus /> Add manufacturer</span>
        </AButton>
      </div>

      {isLoading && <div className="text-[12px]" style={{ color: dark.mute }}>Loading…</div>}
      {!isLoading && rows.length === 0 && <AEmpty icon={<FiTruck />} text="No manufacturers added yet." />}

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {rows.map((m) => {
          const paid = paidTotal(m);
          const balance = Math.max(0, (Number(m.payout_agreed) || 0) - paid);
          return (
            <ACard key={m.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold">{m.company}</div>
                  <div className="text-[11px]" style={{ color: dark.mute }}>
                    {m.contact_name || "—"} · {m.location || "—"}
                  </div>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    background: m.status === "ended" ? "#E0505022" : "#6FCF9722",
                    color: m.status === "ended" ? "#E05050" : "#6FCF97",
                  }}
                >
                  {m.status === "ended" ? "Ended" : "Active"}
                </span>
              </div>
              <div className="mt-3 space-y-1 text-[12px]" style={{ color: dark.mute }}>
                <div>Partner since: {m.partner_since || "—"}</div>
                <div>Delivered: {m.products_delivered ?? 0} products</div>
                <div>Payout agreed: {formatINR(Number(m.payout_agreed ?? 0))}</div>
                <div>Paid: {formatINR(paid)} · Balance: <span style={{ color: balance ? "#E0A050" : "#6FCF97" }}>{formatINR(balance)}</span></div>
                <div>Last payment: {lastPaymentDate(m) ?? "—"}</div>
              </div>
              <div className="mt-3 flex gap-2">
                <Link
                  to="/admin/manufacturers/$id"
                  params={{ id: m.id }}
                  className="flex-1 rounded-md py-1.5 text-center text-[12px]"
                  style={{ border: `1px solid ${dark.border}`, color: dark.accent }}
                >
                  Open
                </Link>
                <button
                  type="button"
                  onClick={() => setEditing(m)}
                  className="flex-1 rounded-md py-1.5 text-[12px]"
                  style={{ border: `1px solid ${dark.border}`, color: dark.text }}
                >
                  Edit
                </button>
              </div>
            </ACard>
          );
        })}
      </div>

      <ManufacturerModal value={editing} onClose={() => setEditing(null)} onSave={async (m) => { await save(m); }} />
    </div>
  );
}

export function ManufacturerModal({
  value,
  onClose,
  onSave,
}: {
  value: Partial<Manufacturer> | null;
  onClose: () => void;
  onSave: (m: Partial<Manufacturer>) => void | Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Manufacturer>>(value ?? {});
  const [key, setKey] = useState("");
  if (value && key !== (value.id ?? "new")) {
    setKey(value.id ?? "new");
    setForm(value);
  }
  const set = (patch: Partial<Manufacturer>) => setForm((s) => ({ ...s, ...patch }));

  return (
    <AModal open={!!value} onClose={onClose} wide title={form.id ? "Edit manufacturer" : "Add manufacturer"}>
      <div className="grid gap-3 sm:grid-cols-2">
        <AField label="Company"><AInput value={form.company ?? ""} onChange={(e) => set({ company: e.target.value })} /></AField>
        <AField label="Contact person"><AInput value={form.contact_name ?? ""} onChange={(e) => set({ contact_name: e.target.value })} /></AField>
        <AField label="Phone"><AInput value={form.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} /></AField>
        <AField label="Email"><AInput value={form.email ?? ""} onChange={(e) => set({ email: e.target.value })} /></AField>
        <AField label="Location"><AInput value={form.location ?? ""} onChange={(e) => set({ location: e.target.value })} /></AField>
        <AField label="Partner since"><AInput type="date" value={form.partner_since ?? ""} onChange={(e) => set({ partner_since: e.target.value })} /></AField>
        <AField label="Products delivered"><AInput type="number" value={String(form.products_delivered ?? 0)} onChange={(e) => set({ products_delivered: Number(e.target.value) })} /></AField>
        <AField label="Total payout agreed (₹)"><AInput type="number" value={String(form.payout_agreed ?? 0)} onChange={(e) => set({ payout_agreed: Number(e.target.value) })} /></AField>
        <AField label="Status">
          <ASelect value={form.status ?? "active"} onChange={(e) => set({ status: e.target.value as "active" | "ended" })}>
            <option value="active">Active</option>
            <option value="ended">Partnership ended</option>
          </ASelect>
        </AField>
        {form.status === "ended" && (
          <AField label="End date"><AInput type="date" value={form.ended_at ?? ""} onChange={(e) => set({ ended_at: e.target.value })} /></AField>
        )}
      </div>
      {form.status === "ended" && (
        <AField label="Reason for ending"><ATextarea rows={2} value={form.end_reason ?? ""} onChange={(e) => set({ end_reason: e.target.value })} /></AField>
      )}
      <AField label="Specialities"><AInput value={form.specialities ?? ""} onChange={(e) => set({ specialities: e.target.value })} /></AField>
      <AField label="Notes"><ATextarea rows={3} value={form.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} /></AField>
      <div className="flex justify-end gap-2 pt-2">
        <AButton variant="ghost" onClick={onClose}>Cancel</AButton>
        <AButton onClick={() => void onSave(form)}>Save</AButton>
      </div>
    </AModal>
  );
}
