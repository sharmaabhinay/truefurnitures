import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { COL, fsList, fsAdd, fsUpdate, fsDelete, orderBy } from "@/lib/db/firestore";
import { formatINR, formatDate } from "@/lib/format";
import { ACard, AButton, AEmpty, AField, AInput, AModal, ASelect, ATextarea, AToggle, dark } from "./ui";

export type Carpenter = {
  id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  photo_url?: string | null;
  city: string;
  area?: string | null;
  specialities?: string[];
  experience_years?: number;
  daily_rate?: number | null;
  availability?: "available" | "on_job" | "leave";
  max_parallel_jobs?: number;
  rating?: number;
  id_proof?: string | null;
  joined_on?: string | null;
  notes?: string | null;
  active: boolean;
  created_at?: string;
};

const BLANK: Omit<Carpenter, "id"> = {
  full_name: "",
  phone: "",
  email: "",
  photo_url: "",
  city: "Indore",
  area: "",
  specialities: [],
  experience_years: 1,
  daily_rate: null,
  availability: "available",
  max_parallel_jobs: 2,
  rating: 5,
  id_proof: "",
  joined_on: new Date().toISOString().slice(0, 10),
  notes: "",
  active: true,
};

const SPECIALITIES = ["Sofa frame", "Upholstery", "Foam & cushioning", "Polish & finish", "Recliner mechanism", "Wardrobe / modular", "On-site repair", "Delivery & install"];

const AVAIL: Record<string, { label: string; color: string }> = {
  available: { label: "Available", color: "#4CAF82" },
  on_job: { label: "On a job", color: "#C8A86B" },
  leave: { label: "On leave", color: "#E05050" },
};

/** Fetch the assignable craftsman list (used by order management). */
export function useCarpenters() {
  return useQuery({
    queryKey: ["admin-carpenters"],
    queryFn: async () => fsList<Carpenter>(COL.carpenters, orderBy("created_at", "desc")),
  });
}

export function CarpenterManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Carpenter | null>(null);
  const [q, setQ] = useState("");
  const { data, isLoading } = useCarpenters();

  const rows = useMemo(() => {
    const list = data ?? [];
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter((c) => c.full_name?.toLowerCase().includes(s) || c.phone?.includes(s) || c.city?.toLowerCase().includes(s));
  }, [data, q]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-carpenters"] });

  const remove = async (c: Carpenter) => {
    if (!confirm(`Remove ${c.full_name} from the team?`)) return;
    await fsDelete(COL.carpenters, c.id);
    toast.success("Carpenter removed");
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <AButton onClick={() => setEditing({ id: "", ...BLANK } as Carpenter)}>🪚 Add carpenter</AButton>
        <div className="flex-1" />
        <AInput placeholder="Search name, phone, city…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 240 }} />
      </div>

      {isLoading ? (
        <ACard><AEmpty icon="⏳" text="Loading team…" /></ACard>
      ) : rows.length === 0 ? (
        <ACard><AEmpty icon="🪚" text="No carpenters yet. Add your first craftsman profile." /></ACard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => {
            const av = AVAIL[c.availability ?? "available"]!;
            return (
              <ACard key={c.id}>
                <div className="flex items-start gap-3">
                  <div
                    className="h-12 w-12 rounded-full bg-cover bg-center flex items-center justify-center text-[15px] font-bold flex-shrink-0"
                    style={{
                      backgroundImage: c.photo_url ? `url(${c.photo_url})` : undefined,
                      background: c.photo_url ? undefined : dark.accent,
                      color: "#1a1a1a",
                    }}
                  >
                    {!c.photo_url && (c.full_name?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[14px] truncate">{c.full_name}</div>
                    <div className="text-[11px]" style={{ color: dark.mute }}>
                      {c.city}{c.area ? ` · ${c.area}` : ""} · {c.experience_years ?? 0} yrs
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: `${av.color}22`, color: av.color }}>{av.label}</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(c.specialities ?? []).map((s) => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: dark.mute }}>{s}</span>
                  ))}
                </div>

                <ul className="mt-3 space-y-1 text-[11px]" style={{ color: dark.mute }}>
                  <li>📞 <a href={`tel:${c.phone}`} style={{ color: dark.text }}>{c.phone}</a>{c.email ? ` · ${c.email}` : ""}</li>
                  <li>{c.daily_rate ? `${formatINR(Number(c.daily_rate))} / day` : "Rate not set"} · up to {c.max_parallel_jobs ?? 1} jobs</li>
                  <li>⭐ {c.rating ?? 5}/5 · joined {c.joined_on ? formatDate(c.joined_on) : "—"}</li>
                </ul>

                <div className="flex items-center gap-2 mt-4">
                  <span className="text-[11px]" style={{ color: c.active ? dark.good : dark.mute }}>{c.active ? "Assignable" : "Inactive"}</span>
                  <div className="flex-1" />
                  <AButton variant="ghost" onClick={() => setEditing(c)}>Edit</AButton>
                  <AButton variant="danger" onClick={() => remove(c)}>Remove</AButton>
                </div>
              </ACard>
            );
          })}
        </div>
      )}

      {editing && <CarpenterEditor carpenter={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}

function CarpenterEditor({ carpenter, onClose, onSaved }: { carpenter: Carpenter; onClose: () => void; onSaved: () => void }) {
  const isNew = !carpenter.id;
  const [f, setF] = useState<Carpenter>({ ...carpenter });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Carpenter>(k: K, v: Carpenter[K]) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!f.full_name.trim()) return toast.error("Name is required");
    if (!/^\d{10}$/.test((f.phone ?? "").replace(/\D/g, "").slice(-10))) return toast.error("Enter a valid 10-digit phone");
    const payload = {
      full_name: f.full_name.trim(),
      phone: f.phone.trim(),
      email: f.email || null,
      photo_url: f.photo_url || null,
      city: f.city || "Indore",
      area: f.area || null,
      specialities: f.specialities ?? [],
      experience_years: Number(f.experience_years) || 0,
      daily_rate: f.daily_rate ? Number(f.daily_rate) : null,
      availability: f.availability ?? "available",
      max_parallel_jobs: Number(f.max_parallel_jobs) || 1,
      rating: Number(f.rating) || 5,
      id_proof: f.id_proof || null,
      joined_on: f.joined_on || null,
      notes: f.notes || null,
      active: !!f.active,
    };
    setSaving(true);
    try {
      if (isNew) await fsAdd(COL.carpenters, { ...payload, created_at: new Date().toISOString() });
      else await fsUpdate(COL.carpenters, carpenter.id, payload);
      toast.success(isNew ? "Carpenter added" : "Profile updated");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleSpec = (s: string) => {
    const on = (f.specialities ?? []).includes(s);
    set("specialities", on ? (f.specialities ?? []).filter((x) => x !== s) : [...(f.specialities ?? []), s]);
  };

  return (
    <AModal
      open
      wide
      onClose={onClose}
      title={isNew ? "Add carpenter" : `Edit ${carpenter.full_name}`}
      subtitle="These profiles appear in the craftsman dropdown on every order."
      footer={
        <>
          <AButton variant="ghost" onClick={onClose}>Cancel</AButton>
          <AButton disabled={saving} onClick={save}>{saving ? "Saving…" : isNew ? "Add to team" : "Save changes"}</AButton>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <AField label="Full name"><AInput value={f.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Ramesh Vishwakarma" /></AField>
        <AField label="Phone"><AInput value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="98XXXXXXXX" /></AField>
        <AField label="Email" hint="optional"><AInput value={f.email ?? ""} onChange={(e) => set("email", e.target.value)} /></AField>
        <AField label="Photo URL" hint="optional"><AInput value={f.photo_url ?? ""} onChange={(e) => set("photo_url", e.target.value)} /></AField>
        <AField label="City">
          <ASelect value={f.city} onChange={(e) => set("city", e.target.value)}>
            <option>Indore</option><option>Ujjain</option><option>Dewas</option><option>Other</option>
          </ASelect>
        </AField>
        <AField label="Area / locality"><AInput value={f.area ?? ""} onChange={(e) => set("area", e.target.value)} placeholder="Vijay Nagar" /></AField>
      </div>

      <AField label="Specialities">
        <div className="flex flex-wrap gap-1.5">
          {SPECIALITIES.map((s) => {
            const on = (f.specialities ?? []).includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSpec(s)}
                className="text-[11px] px-2.5 py-1 rounded-full"
                style={{
                  background: on ? dark.accent : "transparent",
                  color: on ? "#1a1a1a" : dark.mute,
                  border: `1px solid ${on ? dark.accent : dark.border}`,
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      </AField>

      <div className="grid gap-3 sm:grid-cols-3">
        <AField label="Experience (years)"><AInput type="number" min={0} value={f.experience_years ?? 0} onChange={(e) => set("experience_years", Number(e.target.value))} /></AField>
        <AField label="Daily rate (₹)"><AInput type="number" value={f.daily_rate ?? ""} onChange={(e) => set("daily_rate", e.target.value ? Number(e.target.value) : null)} /></AField>
        <AField label="Max parallel jobs"><AInput type="number" min={1} value={f.max_parallel_jobs ?? 1} onChange={(e) => set("max_parallel_jobs", Number(e.target.value))} /></AField>
        <AField label="Availability">
          <ASelect value={f.availability ?? "available"} onChange={(e) => set("availability", e.target.value as Carpenter["availability"])}>
            <option value="available">Available</option>
            <option value="on_job">On a job</option>
            <option value="leave">On leave</option>
          </ASelect>
        </AField>
        <AField label="Rating (1–5)"><AInput type="number" min={1} max={5} step="0.1" value={f.rating ?? 5} onChange={(e) => set("rating", Number(e.target.value))} /></AField>
        <AField label="Joined on"><AInput type="date" value={(f.joined_on ?? "").slice(0, 10)} onChange={(e) => set("joined_on", e.target.value || null)} /></AField>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <AField label="ID proof / Aadhaar ref" hint="optional"><AInput value={f.id_proof ?? ""} onChange={(e) => set("id_proof", e.target.value)} /></AField>
        <AField label="Internal notes"><ATextarea rows={2} value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></AField>
      </div>

      <AToggle checked={!!f.active} onChange={(v) => set("active", v)} label="Available for assignment" />
    </AModal>
  );
}
