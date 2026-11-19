import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { COL, fsAdd, fsUpdate } from "@/lib/db/firestore";
import { uploadToCloudinary } from "@/lib/upload";
import { sendOrderProgressEmail } from "@/lib/email.functions";

export type ProgressPhoto = { url: string; caption?: string; created_at: string };

const dark = { border: "#2A2A38", mute: "#888899", accent: "#C8A86B", bg: "#0F0F13" };

/** Admin: post a workshop photo on an order; the customer gets an in-app message and an email. */
export function OrderProgressPhotos({
  order,
  senderId,
  senderRole,
}: {
  order: { id: string; user_id?: string; order_number?: string; progress_photos?: ProgressPhoto[] };
  senderId?: string;
  senderRole: string;
}) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const photos = order.progress_photos ?? [];

  async function post() {
    if (!file) return toast.error("Choose a photo first");
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    setBusy(true);
    try {
      const { url } = await uploadToCloudinary(file, "orders/progress", "image", setPct);
      const entry: ProgressPhoto = { url, caption: caption.trim() || undefined, created_at: new Date().toISOString() };
      if (!entry.caption) delete entry.caption;
      await fsUpdate(COL.orders, order.id, { progress_photos: [...photos, entry] });
      if (order.user_id) {
        const num = order.order_number ?? order.id.slice(0, 8).toUpperCase();
        await fsAdd(COL.customerMessages, {
          customer_id: order.user_id,
          sender_id: senderId ?? null,
          sender_role: senderRole,
          body: `Workshop update for order #${num}${entry.caption ? `: ${entry.caption}` : " — here's your sofa being made."}`,
          image_url: url,
          read_at: null,
        });
      }
      const res = await sendOrderProgressEmail({ data: { orderId: order.id, imageUrl: url, caption: entry.caption ?? null } }).catch(
        () => ({ sent: false as const }),
      );
      toast.success(res.sent ? "Photo posted — customer notified by message and email" : "Photo posted — customer notified in their messages (email not sent)");
      setFile(null);
      setCaption("");
      qc.invalidateQueries({ queryKey: ["admin-order", order.id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      setPct(0);
    }
  }

  return (
    <div className="space-y-4">
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...photos].reverse().map((p) => (
            <a key={p.created_at} href={p.url} target="_blank" rel="noreferrer" className="block">
              <img src={p.url} alt={p.caption ?? "Workshop photo"} loading="lazy" className="w-full aspect-[4/3] object-cover rounded" />
              <p className="text-[10px] mt-1" style={{ color: dark.mute }}>{new Date(p.created_at).toLocaleString("en-IN")}</p>
              {p.caption && <p className="text-[12px] line-clamp-2">{p.caption}</p>}
            </a>
          ))}
        </div>
      )}
      <div className="grid gap-2">
        <input
          type="file"
          accept="image/*"
          aria-label="Workshop photo"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Caption for the customer, e.g. Frame assembled, fabric cutting tomorrow"
          className="w-full rounded p-2 text-sm bg-transparent"
          style={{ border: `1px solid ${dark.border}` }}
        />
        <button
          type="button"
          onClick={post}
          disabled={busy || !file}
          className="justify-self-start px-4 py-2 text-[11px] font-bold uppercase tracking-widest rounded disabled:opacity-50"
          style={{ background: dark.accent, color: dark.bg }}
        >
          {busy ? `Uploading… ${pct}%` : "Post photo & notify customer"}
        </button>
      </div>
    </div>
  );
}
