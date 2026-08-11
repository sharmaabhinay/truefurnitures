import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FiPlus, FiPlay, FiPause, FiTrash2, FiTrendingUp } from "react-icons/fi";
import { ACard, AButton, AInput, ASelect, AField, AModal, AEmpty, ATextarea, dark } from "@/components/admin/ui";
import { COL, fsAdd, fsDelete, fsList, fsUpdate, sortRows } from "@/lib/db/firestore";
import { formatINR } from "@/lib/format";

type Campaign = {
  id: string;
  name: string;
  platform: string;
  objective?: string;
  status: "active" | "paused" | "ended";
  budget_total?: number;
  daily_budget?: number;
  spend?: number;
  clicks?: number;
  impressions?: number;
  leads?: number;
  start_date?: string;
  end_date?: string | null;
  landing_url?: string;
  notes?: string;
  created_at: string;
};

const PLATFORMS = ["Google Ads", "Meta Ads", "Instagram", "YouTube", "WhatsApp", "Local print", "Other"];
const empty = {
  name: "", platform: "Google Ads", objective: "Leads", status: "active" as Campaign["status"],
  budget_total: "", daily_budget: "", spend: "", clicks: "", impressions: "", leads: "",
  start_date: new Date().toISOString().slice(0, 10), end_date: "", landing_url: "", notes: "",
};

function daysRunning(c: Campaign) {
  if (!c.start_date) return "—";
  const end = c.status === "ended" && c.end_date ? new Date(c.end_date) : new Date();
  const d = Math.max(0, Math.round((end.getTime() - new Date(c.start_date).getTime()) / 86_400_000));
  return `${d} day${d === 1 ? "" : "s"}`;
}

/** Ad campaign tracker across Google / Meta and offline channels. */
export function CampaignManager() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof empty, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: async () => sortRows(await fsList<Campaign>(COL.campaigns), "created_at", "desc"),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-campaigns"] });

  const save = async () => {
    if (!form.name.trim()) return toast.error("Campaign name is required");
    setSaving(true);
    try {
      await fsAdd(COL.campaigns, {
        name: form.name.trim(),
        platform: form.platform,
        objective: form.objective,
        status: form.status,
        budget_total: Number(form.budget_total) || 0,
        daily_budget: Number(form.daily_budget) || 0,
        spend: Number(form.spend) || 0,
        clicks: Number(form.clicks) || 0,
        impressions: Number(form.impressions) || 0,
        leads: Number(form.leads) || 0,
        start_date: form.start_date,
        end_date: form.end_date || null,
        landing_url: form.landing_url.trim() || null,
        notes: form.notes.trim() || null,
      });
      toast.success("Campaign created");
      setOpen(false);
      setForm(empty);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c: Campaign) => {
    const next = c.status === "active" ? "paused" : "active";
    await fsUpdate(COL.campaigns, c.id, { status: next });
    refresh();
    toast.success(next === "active" ? "Campaign resumed" : "Campaign paused");
  };

  const end = async (c: Campaign) => {
    await fsUpdate(COL.campaigns, c.id, { status: "ended", end_date: new Date().toISOString().slice(0, 10) });
    refresh();
  };

  const totalSpend = rows.reduce((n, c) => n + (c.spend ?? 0), 0);
  const totalLeads = rows.reduce((n, c) => n + (c.leads ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[13px]" style={{ color: dark.mute }}>
          <FiTrendingUp className="inline mr-1" /> {rows.filter((c) => c.status === "active").length} active · {formatINR(totalSpend)} spent · {totalLeads} leads
        </div>
        <AButton onClick={() => setOpen(true)} className="flex items-center gap-1.5"><FiPlus /> New campaign</AButton>
      </div>

      {isLoading ? (
        <div className="tf-skeleton h-24" />
      ) : rows.length === 0 ? (
        <ACard className="p-4"><AEmpty text="No campaigns tracked yet." /></ACard>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((c) => {
            const ctr = c.impressions ? ((c.clicks ?? 0) / c.impressions) * 100 : 0;
            return (
              <ACard key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[14px] font-semibold">{c.name}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: dark.mute }}>
                      {c.platform} · {c.objective} · running {daysRunning(c)}
                    </div>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
                    style={{
                      background: c.status === "active" ? "rgba(90,200,140,0.15)" : c.status === "paused" ? "rgba(230,190,90,0.15)" : "rgba(255,255,255,0.06)",
                      color: c.status === "active" ? "#5ac88c" : c.status === "paused" ? "#e6be5a" : dark.mute,
                    }}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                  {[
                    ["Spend", formatINR(c.spend ?? 0)],
                    ["Clicks", String(c.clicks ?? 0)],
                    ["CTR", `${ctr.toFixed(1)}%`],
                    ["Leads", String(c.leads ?? 0)],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-md py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <div className="text-[10px] uppercase tracking-wider" style={{ color: dark.mute }}>{k}</div>
                      <div className="text-[13px] font-semibold mt-0.5">{v}</div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {c.status !== "ended" && (
                    <AButton variant="ghost" onClick={() => toggle(c)} className="flex items-center gap-1.5">
                      {c.status === "active" ? <><FiPause /> Pause</> : <><FiPlay /> Resume</>}
                    </AButton>
                  )}
                  {c.status !== "ended" && <AButton variant="ghost" onClick={() => end(c)}>End</AButton>}
                  <AButton
                    variant="danger"
                    onClick={async () => { await fsDelete(COL.campaigns, c.id); refresh(); }}
                    className="flex items-center gap-1.5"
                  >
                    <FiTrash2 /> Delete
                  </AButton>
                </div>
              </ACard>
            );
          })}
        </div>
      )}

      <AModal
        open={open}
        onClose={() => setOpen(false)}
        title="New campaign"
        subtitle="Track an ad you are running on any platform"
        footer={<>
          <AButton variant="ghost" onClick={() => setOpen(false)}>Cancel</AButton>
          <AButton onClick={save} disabled={saving}>{saving ? "Saving…" : "Create campaign"}</AButton>
        </>}
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <AField label="Name"><AInput value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Diwali Sofa Sale" /></AField>
          <AField label="Platform">
            <ASelect value={form.platform} onChange={(e) => set("platform", e.target.value)}>
              {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
            </ASelect>
          </AField>
          <AField label="Objective">
            <ASelect value={form.objective} onChange={(e) => set("objective", e.target.value)}>
              {["Leads", "Traffic", "Awareness", "Sales", "Showroom visits"].map((o) => <option key={o}>{o}</option>)}
            </ASelect>
          </AField>
          <AField label="Status">
            <ASelect value={form.status} onChange={(e) => set("status", e.target.value)}>
              {["active", "paused", "ended"].map((s) => <option key={s}>{s}</option>)}
            </ASelect>
          </AField>
          <AField label="Total budget (₹)"><AInput type="number" value={form.budget_total} onChange={(e) => set("budget_total", e.target.value)} /></AField>
          <AField label="Daily budget (₹)"><AInput type="number" value={form.daily_budget} onChange={(e) => set("daily_budget", e.target.value)} /></AField>
          <AField label="Spend so far (₹)"><AInput type="number" value={form.spend} onChange={(e) => set("spend", e.target.value)} /></AField>
          <AField label="Impressions"><AInput type="number" value={form.impressions} onChange={(e) => set("impressions", e.target.value)} /></AField>
          <AField label="Clicks"><AInput type="number" value={form.clicks} onChange={(e) => set("clicks", e.target.value)} /></AField>
          <AField label="Leads"><AInput type="number" value={form.leads} onChange={(e) => set("leads", e.target.value)} /></AField>
          <AField label="Start date"><AInput type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} /></AField>
          <AField label="End date"><AInput type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} /></AField>
        </div>
        <AField label="Landing URL"><AInput value={form.landing_url} onChange={(e) => set("landing_url", e.target.value)} placeholder="https://truefurnitures.lovable.app/collections" /></AField>
        <AField label="Notes"><ATextarea value={form.notes} onChange={(e) => set("notes", e.target.value)} /></AField>
      </AModal>
    </div>
  );
}
