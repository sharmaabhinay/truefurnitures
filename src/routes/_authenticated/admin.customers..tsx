import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { COL, fsList, fsGet, fsAdd, where, orderBy } from "@/lib/db/firestore";
import { useAuth } from "@/lib/auth/auth-context";
import { formatINR, formatDate, ORDER_STATUS_STEPS } from "@/lib/format";
import { getAuthUserDetails } from "@/lib/admin-users.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/customers/")({
  ssr: false,
  head: () => ({ meta: [{ title: "Customer — Admin · True Furniture's" }, { name: "robots", content: "noindex" }] }),
  component: CustomerDetail,
});

const dark = {
  bg: "#0F0F13",
  card: "#16161D",
  border: "#2A2A38",
  text: "#E8E8F0",
  mute: "#888899",
  accent: "#C8A86B",
};

function CustomerDetail() {
  const { id } = Route.useParams();
  const { user, isStaff, loading: authLoading } = useAuth();
  const adminUserId = user?.uid ?? "";
  const qc = useQueryClient();
  const getAuth = useServerFn(getAuthUserDetails);

  const { data: profile } = useQuery({
    queryKey: ["cust-profile", id],
    queryFn: () => fsGet<any>(COL.profiles, id),
  });

  const { data: auth } = useQuery({
    queryKey: ["cust-auth", id],
    queryFn: () => getAuth({ data: { userId: id } }),
    retry: false,
  });

  const { data: orders } = useQuery({
    queryKey: ["cust-orders", id],
    queryFn: async () => {
      const rows = await fsList<any>(COL.orders, where("user_id", "==", id));
      return rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
  });

  const { data: designs } = useQuery({
    queryKey: ["cust-designs", id],
    queryFn: async () => {
      const rows = await fsList<any>(COL.savedDesigns, where("user_id", "==", id));
      const sorted = rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const sofas = await Promise.all(
        sorted.map((d) => (d.sofa_id ? fsGet<any>(COL.sofas, d.sofa_id) : Promise.resolve(null))),
      );
      return sorted.map((d, i) => ({
        ...d,
        sofa: sofas[i] ? { name: sofas[i].name, slug: sofas[i].slug, hero_image: sofas[i].hero_image } : null,
      }));
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["cust-roles", id],
    queryFn: async () => {
      const rows = await fsList<any>(COL.userRoles, where("user_id", "==", id));
      const set = new Set<string>();
      for (const r of rows) {
        if (r.role) set.add(r.role);
        for (const rr of r.roles ?? []) set.add(rr);
      }
      return Array.from(set);
    },
  });

  const { data: notes } = useQuery({
    queryKey: ["cust-notes", id],
    queryFn: async () => {
      const rows = await fsList<any>(COL.customerAdminNotes, where("customer_id", "==", id));
      return rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["cust-msgs", id],
    queryFn: async () => {
      const rows = await fsList<any>(COL.customerMessages, where("customer_id", "==", id));
      return rows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    },
    refetchInterval: 10000,
  });

  const { data: bookings } = useQuery({
    queryKey: ["cust-bookings", id],
    queryFn: async () => {
      const rows = await fsList<any>(COL.showroomBookings, where("user_id", "==", id));
      return rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["cust-reviews", id],
    queryFn: async () => {
      const rows = await fsList<any>(COL.reviews, where("user_id", "==", id));
      return rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
  });

  const [noteBody, setNoteBody] = useState("");
  const addNote = useMutation({
    mutationFn: async () => {
      const body = noteBody.trim();
      if (!body) throw new Error("Empty note");
      await fsAdd(COL.customerAdminNotes, { customer_id: id, author_id: adminUserId, body });
    },
    onSuccess: () => {
      setNoteBody("");
      toast.success("Note added");
      qc.invalidateQueries({ queryKey: ["cust-notes", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [msgBody, setMsgBody] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMsg = useMutation({
    mutationFn: async () => {
      const body = msgBody.trim();
      if (!body) throw new Error("Empty message");
      const role = roles?.includes("admin") ? "admin" : "staff";
      await fsAdd(COL.customerMessages, {
        customer_id: id,
        sender_id: adminUserId,
        sender_role: role,
        body,
      });
    },
    onSuccess: () => {
      setMsgBody("");
      qc.invalidateQueries({ queryKey: ["cust-msgs", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const spent = (orders ?? []).reduce((s, o) => s + Number(o.total), 0);
  const active = (orders ?? []).filter((o) => !["delivered", "cancelled"].includes(o.status)).length;

  if (!authLoading && !isStaff) {
    return <div style={{ background: dark.bg, color: dark.text, minHeight: "100vh" }} className="p-10 text-center">Not authorized. <Link to="/dashboard" style={{ color: dark.accent }}>Back</Link></div>;
  }

  return (
    <div style={{ background: dark.bg, color: dark.text, minHeight: "100vh" }} className="pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Link to="/admin" className="text-xs uppercase tracking-widest" style={{ color: dark.mute }}>← Back to Admin</Link>

        <header className="mt-4 flex flex-wrap gap-6 items-start justify-between pb-6 border-b" style={{ borderColor: dark.border }}>
          <div className="flex gap-4 items-center min-w-0">
            <div className="size-16 rounded-full flex items-center justify-center text-2xl font-bold" style={{ background: dark.accent, color: dark.bg }}>
              {(profile?.full_name ?? auth?.email ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-semibold truncate">{profile?.full_name ?? "Unnamed customer"}</h1>
              <p className="text-sm mt-1 truncate" style={{ color: dark.mute }}>{auth?.email ?? "—"}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {(roles ?? []).map((r) => (
                  <span key={r} className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded" style={{ background: dark.card, border: `1px solid ${dark.border}` }}>{r}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <Stat label="Orders" value={(orders ?? []).length} />
            <Stat label="Active" value={active} />
            <Stat label="Lifetime" value={formatINR(spent)} />
          </div>
        </header>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6 mt-6">
          {/* LEFT: Identity + contact */}
          <aside className="space-y-4">
            <Panel title="Contact">
              <Field label="Email" value={auth?.email ?? "—"} copy />
              <Field
                label="Phone"
                value={profile?.phone ?? auth?.phone ?? "—"}
                extra={profile?.phone ? (
                  <a href={`https://wa.me/91${profile.phone}`} target="_blank" rel="noreferrer" className="text-[11px]" style={{ color: dark.accent }}>WhatsApp ↗</a>
                ) : null}
              />
              <Field label="City" value={profile?.city ?? "—"} />
            </Panel>

            <Panel title="Account">
              <Field label="Signed up" value={auth?.created_at ? formatDate(auth.created_at) : "—"} />
              <Field label="Last login" value={auth?.last_sign_in_at ? new Date(auth.last_sign_in_at).toLocaleString("en-IN") : "Never"} />
              <Field label="Email verified" value={auth?.email_confirmed_at ? "Yes" : "No"} />
              <Field label="Provider" value={auth?.provider ?? "email"} />
              <Field label="User ID" value={id} mono />
            </Panel>

            <Panel title="Activity">
              <Field label="Saved designs" value={(designs ?? []).length} />
              <Field label="Bookings" value={(bookings ?? []).length} />
              <Field label="Reviews written" value={(reviews ?? []).length} />
              <Field label="Profile updated" value={profile?.updated_at ? formatDate(profile.updated_at) : "—"} />
            </Panel>
          </aside>

          {/* RIGHT: main content */}
          <div className="space-y-6 min-w-0">
            {/* Orders */}
            <Panel title={`Order history (${(orders ?? []).length})`}>
              {(orders ?? []).length === 0 ? (
                <Empty text="No orders yet." />
              ) : (
                <div className="space-y-2">
                  {(orders ?? []).map((o) => {
                    const snap = (o.sofa_snapshot ?? {}) as { name?: string };
                    return (
                      <Link
                        key={o.id}
                        to="/admin/orders/$id"
                        params={{ id: o.id }}
                        className="grid grid-cols-[1fr_auto] gap-3 p-3 rounded-md hover:opacity-90 transition"
                        style={{ background: dark.bg, border: `1px solid ${dark.border}` }}
                      >
                        <div className="min-w-0">
                          <div className="flex gap-2 items-center">
                            <span className="font-semibold">{o.order_number}</span>
                            <StatusPill status={o.status} />
                          </div>
                          <div className="text-[11px] mt-1" style={{ color: dark.mute }}>
                            {snap.name ?? "Custom"} · {o.delivery_city ?? "—"} · {formatDate(o.created_at)}
                            {o.assigned_craftsman && ` · Craftsman: ${o.assigned_craftsman}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatINR(Number(o.total))}</div>
                          <div className="text-[10px]" style={{ color: dark.mute }}>Bal {formatINR(Number(o.balance_due))}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Panel>

            {/* Saved designs */}
            <Panel title={`Saved designs (${(designs ?? []).length})`}>
              {(designs ?? []).length === 0 ? (
                <Empty text="No saved designs." />
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {(designs ?? []).map((d: any) => (
                    <div key={d.id} className="p-3 rounded-md flex gap-3" style={{ background: dark.bg, border: `1px solid ${dark.border}` }}>
                      {d.sofa?.hero_image && <img src={d.sofa.hero_image} alt="" className="size-16 object-cover rounded" />}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{d.name}</div>
                        <div className="text-[11px]" style={{ color: dark.mute }}>{d.sofa?.name ?? "Custom"} · {formatDate(d.created_at)}</div>
                        <div className="text-[11px] mt-1" style={{ color: dark.mute }}>
                          {d.config?.sizeLabel} · {d.config?.fabricLabel} · {d.config?.colorLabel}
                        </div>
                        <a href={`/shared-design/${d.share_token}`} target="_blank" rel="noreferrer" className="text-[11px]" style={{ color: dark.accent }}>Open share link ↗</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* Bookings */}
            {(bookings ?? []).length > 0 && (
              <Panel title={`Showroom bookings (${bookings!.length})`}>
                <div className="space-y-2 text-sm">
                  {bookings!.map((b: any) => (
                    <div key={b.id} className="p-3 rounded-md" style={{ background: dark.bg, border: `1px solid ${dark.border}` }}>
                      <div className="flex justify-between gap-2">
                        <span className="font-semibold">{b.preferred_date ? formatDate(b.preferred_date) : "—"} · {b.preferred_time ?? ""}</span>
                        <span className="text-[11px]" style={{ color: dark.mute }}>{b.status}</span>
                      </div>
                      <div className="text-[11px]" style={{ color: dark.mute }}>{b.name} · {b.phone}</div>
                      {b.message && <p className="text-[12px] mt-1">{b.message}</p>}
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {/* Internal notes */}
            <Panel title={`Internal notes (${(notes ?? []).length})`}>
              <div className="flex gap-2 mb-3">
                <textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Internal note (customer never sees this)…"
                  rows={2}
                  className="flex-1 rounded-md px-3 py-2 text-sm"
                  style={{ background: dark.bg, border: `1px solid ${dark.border}`, color: dark.text }}
                />
                <button
                  onClick={() => addNote.mutate()}
                  disabled={addNote.isPending || !noteBody.trim()}
                  className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                  style={{ background: dark.accent, color: dark.bg }}
                >Save</button>
              </div>
              {(notes ?? []).length === 0 ? (
                <Empty text="No notes yet." />
              ) : (
                <ul className="space-y-2">
                  {(notes ?? []).map((n) => (
                    <li key={n.id} className="p-3 rounded-md" style={{ background: dark.bg, border: `1px solid ${dark.border}` }}>
                      <p className="text-sm whitespace-pre-wrap">{n.body}</p>
                      <p className="text-[10px] mt-1" style={{ color: dark.mute }}>{new Date(n.created_at).toLocaleString("en-IN")}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {/* Messaging thread */}
            <Panel title="Messages with customer">
              <div
                ref={listRef}
                className="h-80 overflow-y-auto p-3 rounded-md mb-3 space-y-2"
                style={{ background: dark.bg, border: `1px solid ${dark.border}` }}
              >
                {(messages ?? []).length === 0 ? (
                  <p className="text-center text-sm py-10" style={{ color: dark.mute }}>Start the conversation.</p>
                ) : (
                  (messages ?? []).map((m) => {
                    const fromAdmin = m.sender_role !== "customer";
                    return (
                      <div key={m.id} className={`flex ${fromAdmin ? "justify-end" : "justify-start"}`}>
                        <div
                          className="max-w-[75%] px-3 py-2 rounded-lg text-sm"
                          style={{
                            background: fromAdmin ? dark.accent : dark.card,
                            color: fromAdmin ? dark.bg : dark.text,
                            border: fromAdmin ? "none" : `1px solid ${dark.border}`,
                          }}
                        >
                          <div className="whitespace-pre-wrap">{m.body}</div>
                          <div className="text-[10px] opacity-70 mt-1 text-right">
                            {m.sender_role} · {new Date(m.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMsg.mutate())}
                  placeholder="Type a message to the customer…"
                  className="flex-1 rounded-md px-3 py-2 text-sm"
                  style={{ background: dark.bg, border: `1px solid ${dark.border}`, color: dark.text }}
                />
                <button
                  onClick={() => sendMsg.mutate()}
                  disabled={sendMsg.isPending || !msgBody.trim()}
                  className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                  style={{ background: dark.accent, color: dark.bg }}
                >Send</button>
              </div>
            </Panel>

            {/* Status timeline (last 8 status events) */}
            <Panel title="Recent activity">
              <RecentActivity customerId={id} />
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentActivity({ customerId }: { customerId: string }) {
  const { data } = useQuery({
    queryKey: ["cust-recent", customerId],
    queryFn: async () => {
      const os = await fsList<any>(COL.orders, where("user_id", "==", customerId));
      const ids = new Set(os.map((o) => o.id));
      if (ids.size === 0) return [] as any[];
      const hist = await fsList<any>(COL.orderStatusHistory);
      const nameById = new Map(os.map((o) => [o.id, o.order_number]));
      return hist
        .filter((h) => ids.has(h.order_id))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 12)
        .map((h) => ({ ...h, order_number: nameById.get(h.order_id) }));
    },
  });
  if (!data || data.length === 0) return <Empty text="No status changes yet." />;
  return (
    <ul className="space-y-2">
      {data.map((h: any) => (
        <li key={h.id} className="text-sm flex justify-between gap-3">
          <span>
            <span className="font-semibold">{h.order_number}</span> → {String(h.status).replaceAll("_", " ")}
            {h.note && <span className="italic" style={{ color: dark.mute }}> · "{h.note}"</span>}
          </span>
          <span className="text-[11px] shrink-0" style={{ color: dark.mute }}>
            {new Date(h.created_at).toLocaleString("en-IN")}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg p-5" style={{ background: dark.card, border: `1px solid ${dark.border}` }}>
      <h2 className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: dark.mute }}>{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label, value, extra, mono, copy,
}: { label: string; value: React.ReactNode; extra?: React.ReactNode; mono?: boolean; copy?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b last:border-b-0" style={{ borderColor: "rgba(42,42,56,0.4)" }}>
      <span className="text-[11px] uppercase tracking-widest" style={{ color: dark.mute }}>{label}</span>
      <span className={`text-sm text-right truncate max-w-[190px] ${mono ? "font-mono text-[10px]" : ""}`}>
        {value}
        {copy && typeof value === "string" && value !== "—" && (
          <button
            onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }}
            className="ml-2 text-[10px]"
            style={{ color: dark.accent }}
          >copy</button>
        )}
        {extra && <span className="ml-2">{extra}</span>}
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-4 py-2 rounded-md" style={{ background: dark.card, border: `1px solid ${dark.border}` }}>
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-widest" style={{ color: dark.mute }}>{label}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-center text-sm py-6" style={{ color: dark.mute }}>{text}</p>;
}

function StatusPill({ status }: { status: string }) {
  const label = ORDER_STATUS_STEPS.find((s) => s.key === status)?.label ?? status.replaceAll("_", " ");
  const done = status === "delivered";
  const bad = status === "cancelled";
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
      style={{
        background: bad ? "#3a1414" : done ? "#14331e" : "#1f1f2b",
        color: bad ? "#ff9a9a" : done ? "#98e5b3" : dark.accent,
      }}
    >{label}</span>
  );
}
