import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { FiSend, FiSearch, FiUser, FiPhone, FiMail, FiExternalLink, FiZap } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { ACard, AInput, ATextarea, AButton, AEmpty, dark } from "@/components/admin/ui";
import { COL, fsAdd, fsList, fsUpdate, where } from "@/lib/db/firestore";
import { useAuth } from "@/lib/auth/auth-context";
import { sendMessageReplyEmail } from "@/lib/email.functions";

type Msg = {
  id: string;
  customer_id: string;
  body: string;
  sender_role: string;
  read_at?: string | null;
  created_at: string;
  product_slug?: string | null;
  product_name?: string | null;
  product_image?: string | null;
  product_price?: number | null;
};
type Profile = { id: string; full_name?: string | null; email?: string | null; phone?: string | null };
type Sofa = { id: string; slug: string; name: string; base_price?: number; images?: string[]; image_url?: string | null };

/** Canned replies surfaced by typing "/" in the reply box. */
const QUICK_REPLIES = [
  { key: "order", label: "Order status", text: "Hi! Your order is currently in production. We'll share tracking as soon as it ships." },
  { key: "delivery", label: "Delivery timeline", text: "Custom sofas are hand-tailored in 18–21 working days, plus 2–3 days for delivery in Indore & Ujjain." },
  { key: "fabric", label: "Fabric help", text: "Happy to help with fabric! Tell us your room's light and usage, and we'll suggest 2–3 options with swatches." },
  { key: "visit", label: "Invite to showroom", text: "You're welcome to visit our Indore studio to feel the fabrics in person. Which day suits you?" },
  { key: "payment", label: "Payment / deposit", text: "We reserve your build with a 20% deposit; the balance is due before dispatch." },
  { key: "thanks", label: "Thank you", text: "Thank you for choosing True Furniture's — we truly appreciate it!" },
];

/** WhatsApp-style inbox: every customer thread in one place. */
export function InboxManager() {
  const qc = useQueryClient();
  const { user, role } = useAuth();
  const [active, setActive] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [slash, setSlash] = useState(false);
  const [picker, setPicker] = useState(false);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  const { data: sofas } = useQuery({
    queryKey: ["inbox-sofas"],
    enabled: picker,
    queryFn: () => fsList<Sofa>(COL.sofas),
  });

  const { data } = useQuery({
    queryKey: ["admin-inbox"],
    refetchInterval: 15000,
    queryFn: async () => {
      const [msgs, profiles] = await Promise.all([
        fsList<Msg>(COL.customerMessages),
        fsList<Profile>(COL.profiles),
      ]);
      const byId = new Map(profiles.map((p) => [p.id, p]));
      const threads = new Map<string, { id: string; profile?: Profile; last: Msg; unread: number; all: Msg[] }>();
      for (const m of msgs) {
        const t = threads.get(m.customer_id) ?? {
          id: m.customer_id,
          profile: byId.get(m.customer_id),
          last: m,
          unread: 0,
          all: [] as Msg[],
        };
        t.all.push(m);
        if (new Date(m.created_at) > new Date(t.last.created_at)) t.last = m;
        if (m.sender_role === "customer" && !m.read_at) t.unread += 1;
        threads.set(m.customer_id, t);
      }
      return [...threads.values()]
        .map((t) => ({ ...t, all: t.all.sort((a, b) => (a.created_at > b.created_at ? 1 : -1)) }))
        .sort((a, b) => (a.last.created_at > b.last.created_at ? -1 : 1));
    },
  });

  const threads = useMemo(() => {
    const rows = data ?? [];
    if (!q.trim()) return rows;
    const s = q.toLowerCase();
    return rows.filter(
      (t) =>
        (t.profile?.full_name ?? "").toLowerCase().includes(s) ||
        (t.profile?.email ?? "").toLowerCase().includes(s) ||
        (t.profile?.phone ?? "").includes(s),
    );
  }, [data, q]);

  const thread = threads.find((t) => t.id === active) ?? null;

  // Opening a thread clears the admin unread badge for it.
  useEffect(() => {
    if (!thread) return;
    const unread = thread.all.filter((m) => m.sender_role === "customer" && !m.read_at);
    if (unread.length === 0) return;
    const now = new Date().toISOString();
    void Promise.all(unread.map((m) => fsUpdate(COL.customerMessages, m.id, { read_at: now }).catch(() => {}))).then(
      () => {
        qc.invalidateQueries({ queryKey: ["admin-inbox"] });
        qc.invalidateQueries({ queryKey: ["unread-admin"] });
      },
    );
  }, [thread?.id, thread?.all.length]);

  const send = async (extra?: Partial<Msg>, override?: string) => {
    const text = (override ?? body).trim();
    if ((!text && !extra?.product_slug) || !thread) return;
    setBody("");
    setSlash(false);
    setSending(true);
    try {
      await fsAdd(COL.customerMessages, {
        customer_id: thread.id,
        sender_id: user?.uid ?? null,
        sender_role: role === "admin" ? "admin" : "staff",
        body: text,
        read_at: null,
        ...(extra ?? {}),
      });
      void sendMessageReplyEmail({ data: { customerId: thread.id, body: text } }).catch(() => {});
      qc.invalidateQueries({ queryKey: ["admin-inbox"] });
    } catch (e) {
      setBody(text);
      toast.error(e instanceof Error ? e.message : "Could not send");
    } finally {
      setSending(false);
    }
  };

  const shareProduct = (s: Sofa) => {
    setPicker(false);
    void send(
      {
        product_slug: s.slug,
        product_name: s.name,
        product_image: s.images?.[0] ?? s.image_url ?? null,
        product_price: s.base_price ?? null,
      },
      `Take a look at the ${s.name} →`,
    );
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[300px_1fr]">
      <ACard className="!p-0 overflow-hidden">
        <div className="p-3 border-b" style={{ borderColor: dark.border }}>
          <div className="relative">
            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: dark.mute }} />
            <AInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customers…" className="!pl-8" />
          </div>
        </div>
        <div className="max-h-[65vh] overflow-y-auto admin-scroll">
          {threads.length === 0 && <AEmpty text="No conversations yet." />}
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className="w-full text-left px-3 py-3 border-b flex gap-3 items-start"
              style={{
                borderColor: "rgba(42,42,56,0.6)",
                background: active === t.id ? "rgba(200,168,107,0.07)" : "transparent",
              }}
            >
              <span
                className="mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[12px]"
                style={{ background: "rgba(200,168,107,0.15)", color: dark.accent }}
              >
                <FiUser />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium truncate">{t.profile?.full_name || "Customer"}</span>
                  {t.unread > 0 && (
                    <span className="text-[10px] rounded-full px-1.5 py-0.5" style={{ background: dark.accent, color: "#1a1a1a" }}>
                      {t.unread}
                    </span>
                  )}
                </span>
                <span className="block text-[11px] truncate" style={{ color: dark.mute }}>{t.last.body}</span>
              </span>
            </button>
          ))}
        </div>
      </ACard>

      <ACard className="!p-0 flex flex-col" >
        {!thread ? (
          <AEmpty icon="" text="Pick a conversation to reply." />
        ) : (
          <>
            <div className="px-4 py-3 border-b" style={{ borderColor: dark.border }}>
              <div className="text-[14px] font-semibold">{thread.profile?.full_name || "Customer"}</div>
              <div className="text-[11px]" style={{ color: dark.mute }}>
                {[thread.profile?.email, thread.profile?.phone].filter(Boolean).join(" · ") || thread.id}
              </div>
            </div>
            <div className="flex-1 max-h-[52vh] overflow-y-auto admin-scroll p-4 space-y-2">
              {thread.all.map((m) => {
                const mine = m.sender_role !== "customer";
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[80%] rounded-xl px-3 py-2 text-[13px] whitespace-pre-wrap"
                      style={{
                        background: mine ? "rgba(200,168,107,0.16)" : dark.field,
                        border: `1px solid ${dark.border}`,
                      }}
                    >
                      {m.body}
                      <div className="text-[10px] mt-1" style={{ color: dark.mute }}>
                        {new Date(m.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-3 border-t flex gap-2 items-end" style={{ borderColor: dark.border }}>
              <ATextarea
                rows={2}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Write a reply…"
              />
              <AButton onClick={send} disabled={sending || !body.trim()} className="!px-3 !py-2.5">
                <FiSend />
              </AButton>
            </div>
          </>
        )}
      </ACard>
    </div>
  );
}
