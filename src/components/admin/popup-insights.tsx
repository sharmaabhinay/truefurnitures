import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listPopupEvents, type PopupEvent } from "@/lib/popup-analytics";
import { ACard, AButton } from "@/components/admin/ui";

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "—");

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      className="rounded-lg px-4 py-3"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #2A2A38" }}
    >
      <div className="text-[11px] uppercase tracking-widest" style={{ color: "#888899" }}>{label}</div>
      <div className="text-[22px] font-semibold mt-1" style={{ color: "#E8E8F0" }}>{value}</div>
      {sub && <div className="text-[11px] mt-0.5" style={{ color: "#888899" }}>{sub}</div>}
    </div>
  );
}

function Bars({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <ACard>
      <div className="text-[13px] font-semibold mb-3" style={{ color: "#E8E8F0" }}>{title}</div>
      {rows.length === 0 ? (
        <div className="text-[12px]" style={{ color: "#888899" }}>No data yet.</div>
      ) : (
        rows.map(([k, n]) => (
          <div key={k} className="flex items-center gap-3 py-1.5">
            <span className="flex-1 text-[12px] truncate" style={{ color: "#E8E8F0" }}>{k}</span>
            <div className="w-32 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{ width: `${(n / max) * 100}%`, background: "#C8A86B" }} />
            </div>
            <span className="text-[12px] w-8 text-right" style={{ color: "#888899" }}>{n}</span>
          </div>
        ))
      )}
    </ACard>
  );
}

/** Funnel report for the storefront welcome popup. */
export function PopupInsights() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-popup-events"],
    queryFn: listPopupEvents,
    staleTime: 0,
    refetchInterval: 60_000,
  });
  const events: PopupEvent[] = data ?? [];

  const s = useMemo(() => {
    const count = (t: string) => events.filter((e) => e.type === t).length;
    const uniq = (t: string) => new Set(events.filter((e) => e.type === t).map((e) => e.session ?? e.id)).size;
    const shown = count("popup_shown");
    const subscribed = count("popup_subscribed");
    const dismissed = count("popup_dismissed");
    const allowed = count("popup_location_allowed");
    const denied = count("popup_location_denied");
    const tally = (key: keyof PopupEvent, types?: string[]) => {
      const m: Record<string, number> = {};
      for (const e of events) {
        if (types && !types.includes(e.type)) continue;
        const v = e[key];
        if (!v) continue;
        const k = String(v);
        m[k] = (m[k] ?? 0) + 1;
      }
      return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8);
    };
    const device = () => {
      const m: Record<string, number> = { Mobile: 0, Desktop: 0 };
      for (const e of events) {
        if (e.type !== "popup_shown" || !e.ua) continue;
        const key = /Mobi|Android|iPhone|iPad/i.test(e.ua) ? "Mobile" : "Desktop";
        m[key] = (m[key] ?? 0) + 1;
      }
      return Object.entries(m).filter(([, n]) => n > 0);
    };
    return {
      shown,
      uniqueViewers: uniq("popup_shown"),
      subscribed,
      dismissed,
      ignored: Math.max(0, shown - subscribed - dismissed),
      allowed,
      denied,
      cities: tally("city", ["popup_subscribed", "popup_location_allowed"]),
      pages: tally("page", ["popup_shown"]),
      device: device(),
    };
  }, [events]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[12px]" style={{ color: "#888899" }}>
          {isLoading ? "Loading popup activity…" : `${events.length} tracked event${events.length === 1 ? "" : "s"}`}
        </div>
        <AButton variant="ghost" onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? "Refreshing…" : "Refresh"}
        </AButton>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Popup views" value={s.shown} sub={`${s.uniqueViewers} unique visitor${s.uniqueViewers === 1 ? "" : "s"}`} />
        <Stat label="Subscribed" value={s.subscribed} sub={`${pct(s.subscribed, s.shown)} conversion`} />
        <Stat label="Closed without subscribing" value={s.dismissed} sub={`${pct(s.dismissed, s.shown)} of views`} />
        <Stat label="Left without acting" value={s.ignored} sub="no click, no close" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Location allowed" value={s.allowed} sub={`${pct(s.allowed, s.allowed + s.denied)} of prompts`} />
        <Stat label="Location denied" value={s.denied} />
        <Stat label="Subscribers per 100 views" value={s.shown ? Math.round((s.subscribed / s.shown) * 100) : 0} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Bars title="Top cities" rows={s.cities} />
        <Bars title="Pages where it appeared" rows={s.pages} />
        <Bars title="Device" rows={s.device} />
      </div>
    </div>
  );
}
