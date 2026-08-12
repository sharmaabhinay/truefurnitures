import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FiUsers, FiMousePointer, FiCheckCircle, FiInbox, FiExternalLink, FiPlus, FiTrash2 } from "react-icons/fi";
import { ACard, AButton, ASelect, AInput, ATextarea, AField, AToggle, AEmpty, dark } from "@/components/admin/ui";
import { COL, fsAdd, fsDelete, fsList, fsUpdate, sortRows } from "@/lib/db/firestore";
import { getVisitors } from "@/lib/visitor-tracker";
import type { JobOpening } from "@/lib/openings";

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
  const [tab, setTab] = useState<"applications" | "openings">("applications");

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
      <div className="flex gap-2">
        {([["applications", "Applications"], ["openings", "Job openings"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="rounded-md px-4 py-2 text-[12px] font-semibold"
            style={{
              background: tab === key ? dark.accent : "rgba(255,255,255,0.04)",
              color: tab === key ? "#1a1a1a" : dark.text,
              border: `1px solid ${dark.border}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "openings" ? (
        <OpeningsPanel />
      ) : (
      <>
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
      </>
      )}
    </div>
  );
}

const BLANK: Omit<JobOpening, "id"> = {
  title: "",
  city: "Indore",
  type: "Full-time",
  description: "",
  is_published: true,
  sort_order: 0,
};

/** Publish, edit and retire the roles shown on the public /careers page. */
function OpeningsPanel() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Partial<JobOpening> | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-job-openings"],
    queryFn: async () => sortRows(await fsList<JobOpening>(COL.jobOpenings), "sort_order"),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-job-openings"] });
    qc.invalidateQueries({ queryKey: ["job-openings"] });
  };

  const save = async () => {
    if (!draft?.title?.trim()) return toast.error("Title is required");
    try {
      const payload = {
        title: draft.title.trim(),
        city: draft.city ?? "Indore",
        type: draft.type ?? "Full-time",
        description: draft.description ?? "",
        is_published: draft.is_published ?? true,
        sort_order: Number(draft.sort_order ?? 0),
      };
      if (draft.id) await fsUpdate(COL.jobOpenings, draft.id, payload);
      else await fsAdd(COL.jobOpenings, payload);
      setDraft(null);
      refresh();
      toast.success("Role saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this role?")) return;
    await fsDelete(COL.jobOpenings, id).catch((e) => toast.error(e.message));
    refresh();
  };

  const togglePublish = async (r: JobOpening) => {
    await fsUpdate(COL.jobOpenings, r.id, { is_published: !r.is_published }).catch((e) => toast.error(e.message));
    refresh();
  };

  return (
    <div className="space-y-4">
      <ACard>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[13px] font-semibold">Open roles</div>
            <div className="text-[11px]" style={{ color: dark.mute }}>
              Published roles appear on the public careers page with an Apply button.
            </div>
          </div>
          <AButton onClick={() => setDraft({ ...BLANK })}>
            <span className="inline-flex items-center gap-1.5"><FiPlus /> New role</span>
          </AButton>
        </div>
      </ACard>

      {draft && (
        <ACard className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <AField label="Title">
              <AInput value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </AField>
            <AField label="City">
              <AInput value={draft.city ?? ""} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
            </AField>
            <AField label="Type">
              <AInput value={draft.type ?? ""} onChange={(e) => setDraft({ ...draft, type: e.target.value })} />
            </AField>
          </div>
          <AField label="Description">
            <ATextarea rows={3} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </AField>
          <div className="flex flex-wrap items-center gap-4">
            <AToggle checked={draft.is_published ?? true} onChange={(v) => setDraft({ ...draft, is_published: v })} label="Published" />
            <div className="w-28">
              <AInput
                type="number"
                value={String(draft.sort_order ?? 0)}
                onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
              />
            </div>
            <div className="ml-auto flex gap-2">
              <AButton variant="ghost" onClick={() => setDraft(null)}>Cancel</AButton>
              <AButton onClick={save}>Save role</AButton>
            </div>
          </div>
        </ACard>
      )}

      <ACard className="space-y-2">
        {isLoading ? (
          <div className="tf-skeleton h-20" />
        ) : rows.length === 0 ? (
          <AEmpty icon="" text="No roles yet — the site shows our default openings until you add one." />
        ) : (
          rows.map((r) => (
            <div key={r.id} className="rounded-lg p-3 grid gap-2 sm:grid-cols-[1fr_auto] items-start" style={{ border: `1px solid ${dark.border}` }}>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold">{r.title}</div>
                <div className="text-[11px] mt-0.5" style={{ color: dark.mute }}>{r.city} · {r.type}</div>
                <p className="text-[12px] mt-1.5">{r.description}</p>
              </div>
              <div className="flex gap-2 justify-end">
                <AButton variant="ghost" onClick={() => togglePublish(r)}>{r.is_published ? "Unpublish" : "Publish"}</AButton>
                <AButton variant="ghost" onClick={() => setDraft(r)}>Edit</AButton>
                <AButton variant="danger" onClick={() => remove(r.id)}><FiTrash2 /></AButton>
              </div>
            </div>
          ))
        )}
      </ACard>
    </div>
  );
}
