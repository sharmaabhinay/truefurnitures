import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { COL, fsListSorted, fsList, fsUpdate } from "@/lib/db/firestore";
import { formatDate } from "@/lib/format";
import { ACard, AEmpty, ASelect, AInput, AButton, dark } from "@/components/admin/ui";
import { FiPhone, FiMail, FiTool, FiMessageCircle, FiBell, FiCheck, FiX } from "react-icons/fi";
import type { Carpenter } from "@/components/admin/carpenter-manager";

type Request = {
  id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  city?: string | null;
  address_line?: string | null;
  pincode?: string | null;
  work_type?: string | null;
  preferred_date?: string | null;
  duration?: string | null;
  budget_range?: string | null;
  details?: string | null;
  status: string;
  created_at: string;
  carpenter_id?: string | null;
  assigned_carpenter?: string | null;
  assigned_at?: string | null;
  accepted_at?: string | null;
  declined_at?: string | null;
  decline_reason?: string | null;
  reminder_count?: number;
  last_reminder_at?: string | null;
};

const STATUSES = ["new", "contacted", "assigned", "accepted", "declined", "scheduled", "completed", "cancelled"];

/** Leads submitted through the public "Hire a Carpenter" form. */
export function CarpenterRequests() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-carpenter-requests"],
    queryFn: () => fsListSorted<Request>(COL.carpenterRequests, "created_at", "desc"),
  });

  const { data: carpenters } = useQuery({
    queryKey: ["admin-carpenters-lite"],
    queryFn: () => fsListSorted<Carpenter>(COL.carpenters, "full_name", "asc"),
  });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (!term ||
          `${r.full_name} ${r.phone} ${r.city ?? ""} ${r.work_type ?? ""}`.toLowerCase().includes(term)),
    );
  }, [data, status, q]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-carpenter-requests"] });

  const patch = async (id: string, data: Record<string, unknown>, ok?: string) => {
    try {
      await fsUpdate(COL.carpenterRequests, id, data);
      await refresh();
      if (ok) toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  /** Assigning stores both the stable id and a readable label. */
  const assign = async (r: Request, carpenterId: string) => {
    if (!carpenterId) {
      await patch(r.id, { carpenter_id: null, assigned_carpenter: null, assigned_at: null }, "Assignment cleared");
      return;
    }
    const c = (carpenters ?? []).find((x) => x.id === carpenterId);
    await patch(
      r.id,
      {
        carpenter_id: carpenterId,
        assigned_carpenter: c ? `${c.full_name}${c.city ? ` · ${c.city}` : ""}` : null,
        assigned_at: new Date().toISOString(),
        accepted_at: null,
        declined_at: null,
        decline_reason: null,
        status: "assigned",
      },
      `Assigned to ${c?.full_name ?? "carpenter"}`,
    );
  };

  const accept = (r: Request) =>
    patch(r.id, { status: "accepted", accepted_at: new Date().toISOString(), declined_at: null }, "Marked as accepted");

  const decline = (r: Request) => {
    const reason = window.prompt("Reason for declining (optional)") ?? "";
    return patch(
      r.id,
      { status: "declined", declined_at: new Date().toISOString(), decline_reason: reason || null },
      "Marked as declined",
    );
  };

  /** Nudge the assigned carpenter on WhatsApp and record the reminder. */
  const remind = async (r: Request) => {
    const c = (carpenters ?? []).find((x) => x.id === r.carpenter_id);
    if (!c) {
      toast.error("Assign a carpenter first.");
      return;
    }
    const digits = (c.phone ?? "").replace(/\D/g, "").slice(-10);
    const text = encodeURIComponent(
      `Reminder: carpentry job for ${r.full_name} (${r.work_type ?? "general work"}) at ${[r.address_line, r.city].filter(Boolean).join(", ")}. Please confirm.`,
    );
    window.open(`https://wa.me/91${digits}?text=${text}`, "_blank", "noopener");
    await patch(
      r.id,
      { reminder_count: (r.reminder_count ?? 0) + 1, last_reminder_at: new Date().toISOString() },
      "Reminder sent",
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-[13px]" style={{ color: dark.mute }}>
          <b style={{ color: dark.text }}>{rows.length}</b> request{rows.length === 1 ? "" : "s"}
        </div>
        <div className="w-44">
          <ASelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s[0]!.toUpperCase() + s.slice(1)}</option>
            ))}
          </ASelect>
        </div>
        <div className="w-60">
          <AInput placeholder="Search name, phone, city…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {isLoading && <ACard><div className="text-[13px]" style={{ color: dark.mute }}>Loading…</div></ACard>}

      {!isLoading && rows.length === 0 && (
        <ACard><AEmpty icon={<FiTool />} text="No carpenter requests yet." /></ACard>
      )}

      {rows.map((r) => (
        <ACard key={r.id}>
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex-1 min-w-[240px]">
              <div className="font-semibold text-[14px]">
                {r.full_name} <span className="text-[11px]" style={{ color: dark.mute }}>· {r.work_type ?? "General work"}</span>
              </div>
              <div className="text-[12px] mt-0.5" style={{ color: dark.mute }}>
                {[r.city, r.address_line, r.pincode].filter(Boolean).join(", ") || "No address given"}
              </div>
              <div className="text-[11px] mt-1" style={{ color: dark.mute }}>
                {[r.preferred_date && `Preferred ${r.preferred_date}`, r.duration, r.budget_range]
                  .filter(Boolean)
                  .join(" · ") || "No schedule preference"}
              </div>
              {r.details && (
                <div className="text-[11px] italic mt-1" style={{ color: dark.mute }}>"{r.details}"</div>
              )}
              <div className="text-[11px] mt-1" style={{ color: "#5f5f70" }}>
                Received {formatDate(r.created_at)}
              </div>

              <div className="text-[11px] mt-2 space-y-0.5" style={{ color: dark.mute }}>
                <div>
                  Carpenter:{" "}
                  <span style={{ color: dark.text }}>{r.assigned_carpenter || "Unassigned"}</span>
                  {r.assigned_at ? ` · assigned ${formatDate(r.assigned_at)}` : ""}
                </div>
                {r.accepted_at && <div style={{ color: "#4CAF82" }}>Accepted {formatDate(r.accepted_at)}</div>}
                {r.declined_at && (
                  <div style={{ color: "#E2585A" }}>
                    Declined {formatDate(r.declined_at)}{r.decline_reason ? ` — ${r.decline_reason}` : ""}
                  </div>
                )}
                {(r.reminder_count ?? 0) > 0 && (
                  <div>
                    {r.reminder_count} reminder{r.reminder_count === 1 ? "" : "s"}
                    {r.last_reminder_at ? ` · last ${formatDate(r.last_reminder_at)}` : ""}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-44">
                  <ASelect value={r.carpenter_id ?? ""} onChange={(e) => assign(r, e.target.value)}>
                    <option value="">Assign carpenter…</option>
                    {(carpenters ?? []).filter((c) => c.active !== false).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}{c.city ? ` · ${c.city}` : ""}
                      </option>
                    ))}
                  </ASelect>
                </div>
                <div className="w-36">
                  <ASelect value={r.status} onChange={(e) => patch(r.id, { status: e.target.value })}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s[0]!.toUpperCase() + s.slice(1)}</option>
                    ))}
                  </ASelect>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <AButton variant="ghost" onClick={() => accept(r)}><FiCheck /> Accept</AButton>
                <AButton variant="ghost" onClick={() => decline(r)}><FiX /> Decline</AButton>
                <AButton variant="ghost" onClick={() => remind(r)}><FiBell /> Remind</AButton>
                <a href={`tel:${r.phone}`} className="cursor-pointer rounded-md px-2.5 py-2 text-[13px]" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${dark.border}`, color: dark.text }} aria-label="Call"><FiPhone /></a>
                <a href={`https://wa.me/91${(r.phone ?? "").replace(/\D/g, "").slice(-10)}`} target="_blank" rel="noreferrer" className="cursor-pointer rounded-md px-2.5 py-2 text-[13px]" style={{ background: dark.accent, color: "#1a1a1a" }} aria-label="WhatsApp"><FiMessageCircle /></a>
                {r.email && (
                  <a href={`mailto:${r.email}`} className="cursor-pointer rounded-md px-2.5 py-2 text-[13px]" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${dark.border}`, color: dark.text }} aria-label="Email"><FiMail /></a>
                )}
              </div>
            </div>
          </div>
        </ACard>
      ))}
    </div>
  );
}
