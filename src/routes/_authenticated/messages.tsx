import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FiSend, FiCheck } from "react-icons/fi";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth/auth-context";
import { COL, fsAdd } from "@/lib/db/firestore";
import { fetchThread, markRead, type ChatMessage as Msg } from "@/lib/messages";

export const Route = createFileRoute("/_authenticated/messages")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Messages — True Furniture's" },
      { name: "description", content: "Chat with the True Furniture's team about your custom sofa order." },
      { property: "og:title", content: "Messages — True Furniture's" },
      { property: "og:description", content: "Chat with our design team about your order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Messages,
});

function Messages() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["my-messages", user?.uid],
    enabled: !!user,
    refetchInterval: 10000,
    queryFn: () => fetchThread(user!.uid),
  });

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Opening the thread clears the customer's unread badge.
  useEffect(() => {
    const incoming = (messages ?? []).filter((m) => m.sender_role !== "customer" && !m.read_at);
    if (incoming.length === 0) return;
    void markRead(incoming).then(() => qc.invalidateQueries({ queryKey: ["unread-customer", user?.uid] }));
  }, [messages, qc, user?.uid]);

  const send = useMutation({
    mutationFn: async (text: string) => {
      await fsAdd(COL.customerMessages, {
        customer_id: user!.uid,
        sender_id: user!.uid,
        sender_role: "customer",
        body: text,
        read_at: null,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-messages", user?.uid] }),
    onError: (e: Error, text) => { setBody(text); toast.error(e.message); },
  });

  const submit = () => {
    const text = body.trim();
    if (!text || send.isPending) return;
    setBody(""); // clear immediately — the send happens in the background
    send.mutate(text);
  };

  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)] flex flex-col">
      <SiteHeader />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <span className="tf-chip mb-4">Support</span>
        <h1 className="text-3xl sm:text-4xl font-display mt-4 mb-2">Messages</h1>
        <p className="text-[color:var(--brand-dark)]/60 mb-8">Talk to our design team about fabrics, timelines or an existing order.</p>

        <div className="bg-white border border-[color:var(--brand-dark)]/10">
          <div ref={listRef} className="h-[420px] overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="tf-skeleton h-20" />
            ) : (messages ?? []).length === 0 ? (
              <p className="text-center text-sm text-[color:var(--brand-dark)]/50 py-16">
                No messages yet — say hello and our team will reply within working hours.
              </p>
            ) : (
              (messages ?? []).map((m) => {
                const mine = m.sender_role === "customer";
                return (
                  <div key={m.id} className={`flex animate-fade-up ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] px-4 py-2.5 text-sm ${mine ? "bg-[color:var(--brand-dark)] text-white" : "bg-[color:var(--brand-muted)]"}`}>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className="text-[10px] opacity-60 mt-1 text-right flex items-center justify-end gap-1">
                        {mine ? "You" : "True Furniture's"} · {new Date(m.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        {mine && m.read_at && <FiCheck aria-label="Read" />}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            {send.isPending && (
              <div className="flex justify-end">
                <div className="max-w-[78%] px-4 py-2.5 text-sm bg-[color:var(--brand-dark)]/60 text-white animate-pulse">Sending…</div>
              </div>
            )}
          </div>
          <div className="flex gap-2 border-t border-[color:var(--brand-dark)]/10 p-3">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="Type your message…"
              className="flex-1 px-4 py-3 border border-[color:var(--brand-dark)]/15 text-sm focus:outline-none focus:border-[color:var(--brand-dark)]"
            />
            <button
              onClick={submit}
              disabled={!body.trim()}
              className="px-6 py-3 bg-[color:var(--brand-dark)] text-white text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 hover:bg-[color:var(--brand-accent)] transition-colors flex items-center gap-2 active:scale-95"
            >
              <FiSend /> Send
            </button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
