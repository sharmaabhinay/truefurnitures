import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FiUsers, FiMousePointer, FiCheckCircle, FiInbox, FiExternalLink } from "react-icons/fi";
import { ACard, AButton, ASelect, AEmpty, dark } from "@/components/admin/ui";
import { COL, fsList, fsUpdate, sortRows } from "@/lib/db/firestore";
import { getVisitors } from "@/lib/visitor-tracker";

type Application = {
  id: string;
  role: string;
  city?: string;
  status: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  experience?: string | null;
  portfolio?: string | null;
  note?: string | null;
  created_at: string;
};

const STATUSES = ["new", "shortlisted", "interviewing", "hired", "rejected"] as const;
const PAGE = 10;

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <ACard className="p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest" style={{ color: dark.mute }}>
        {icon} {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </ACard>
  );
}

/** Careers CRM: applications, funnel stats and status pipeline. */
export function CareersManager() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-career-applications"],
    queryFn: async () => sortRows(await fsList<Application>(COL.careerApplications), "created_at", "desc"),
  });

  // "Apply" clicks are tracked as page views on /careers/apply/*
  const applyClicks = useMemo(
    () => getVisitors().filter((v) => v.page?.startsWith("/careers/apply/")).length,
    [],
  );

  const filtered = status === "all" ? rows : rows.filter((r) => r.status === status);
  const pageRows = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));

  const setStatusFor = async (id: string, next: string) => {
    try {
      await fsUpdate(COL.careerApplications, id, { status: next });
      qc.invalidateQueries({ queryKey: ["admin-career-applications"] });
      toast.success(`Marked ${next}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<FiUsers />} label="Applications" value={rows.length} />
        <Stat icon={<FiInbox />} label="New" value={rows.filter((r) => r.status === "new").length} />
        <Stat icon={<FiCheckCircle />} label="Hired" value={rows.filter((r) => r.status === "hired").length} />
        <Stat icon={<FiMousePointer />} label="Apply clicks" value={applyClicks} />
      </div>

      <ACard className="p-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="text-[13px] font-semibold">Applications</div>
          <ASelect value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="max-w-44">
            <option value="all">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </ASelect>
        </div>

        {isLoading ? (
          <div className="tf-skeleton h-24" />
        ) : pageRows.length === 0 ? (
          <AEmpty text="No applications yet." />
        ) : (
          <div className="space-y-2">
            {pageRows.map((a) => (
              <div key={a.id} className="rounded-lg p-3 grid gap-2 sm:grid-cols-[1fr_auto] items-start" style={{ border: `1px solid ${dark.border}` }}>
                <div>
                  <div className="text-[13px] font-semibold">{a.full_name} · <span style={{ color: dark.mute }}>{a.role}</span></div>
                  <div className="text-[11px] mt-1" style={{ color: dark.mute }}>
                    {[a.city, a.email, a.phone, a.experience && `${a.experience} yrs`].filter(Boolean).join(" · ")}
                  </div>
                  {a.note && <p className="text-[12px] mt-2 whitespace-pre-wrap">{a.note}</p>}
                  {a.portfolio && (
                    <a href={a.portfolio} target="_blank" rel="noreferrer" className="text-[11px] mt-1 inline-flex items-center gap-1" style={{ color: dark.accent }}>
                      Portfolio <FiExternalLink />
                    </a>
                  )}
                  <div className="text-[10px] mt-1" style={{ color: dark.mute }}>
                    {new Date(a.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                </div>
                <ASelect value={a.status} onChange={(e) => setStatusFor(a.id, e.target.value)} className="sm:w-40">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </ASelect>
              </div>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between mt-4 text-[12px]">
            <AButton variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</AButton>
            <span style={{ color: dark.mute }}>Page {page + 1} of {pages}</span>
            <AButton variant="ghost" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</AButton>
          </div>
        )}
      </ACard>
    </div>
  );
}
