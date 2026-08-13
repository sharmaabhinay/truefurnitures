import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { COL, fsListSorted, fsUpdate } from "@/lib/db/firestore";
import { formatDate } from "@/lib/format";
import { ACard, AEmpty, ASelect, AInput, dark } from "@/components/admin/ui";
import { FiPhone, FiMail, FiTool, FiMessageCircle } from "react-icons/fi";

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
};

const STATUSES = ["new", "contacted", "scheduled", "completed", "cancelled"];

/** Leads submitted through the public "Hire a Carpenter" form. */
export function CarpenterRequests() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-carpenter-requests"],
    queryFn: () => fsListSorted<Request>(COL.carpenterRequests, "created_at", "desc"),
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

  const setRequestStatus = async (id: string, next: string) => {
    try {
      await fsUpdate(COL.carpenterRequests, id, { status: next });
      qc.invalidateQueries({ queryKey: ["admin-carpenter-requests"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
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
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-36">
                <ASelect value={r.status} onChange={(e) => setRequestStatus(r.id, e.target.value)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s[0]!.toUpperCase() + s.slice(1)}</option>
                  ))}
                </ASelect>
              </div>
              <a href={`tel:${r.phone}`} className="cursor-pointer rounded-md px-2.5 py-2 text-[13px]" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${dark.border}`, color: dark.text }} aria-label="Call"><FiPhone /></a>
              <a href={`https://wa.me/91${(r.phone ?? "").replace(/\D/g, "").slice(-10)}`} target="_blank" rel="noreferrer" className="cursor-pointer rounded-md px-2.5 py-2 text-[13px]" style={{ background: dark.accent, color: "#1a1a1a" }} aria-label="WhatsApp"><FiMessageCircle /></a>
              {r.email && (
                <a href={`mailto:${r.email}`} className="cursor-pointer rounded-md px-2.5 py-2 text-[13px]" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${dark.border}`, color: dark.text }} aria-label="Email"><FiMail /></a>
              )}
            </div>
          </div>
        </ACard>
      ))}
    </div>
  );
}