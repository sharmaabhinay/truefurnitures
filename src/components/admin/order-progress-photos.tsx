import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
import { COL, fsAdd, fsUpdate } from "@/lib/db/firestore";
import { uploadToCloudinary } from "@/lib/upload";
import { sendOrderProgressEmail } from "@/lib/email.functions";

export type ProgressPhoto = { url: string; caption?: string; created_at: string };

const dark = { border: "#2A2A38", mute: "#888899", accent: "#C8A86B", bg: "#0F0F13" };

type PendingFile = { file: File; preview: string; kind: "image" | "video" };

/** Admin: post workshop photos/videos on an order; the customer gets an in-app message and an email. */
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [dragging, setDragging] = useState(false);
  const photos = order.progress_photos ?? [];

  function addFiles(list: FileList | File[] | null) {
    if (!list) return;
    const next: PendingFile[] = [];
    for (const file of Array.from(list)) {
      const kind = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : null;
      if (!kind) {
        toast.error(`${file.name} is not an image or video`);
        continue;
      }
      next.push({ file, preview: URL.createObjectURL(file), kind });
    }
    if (next.length) setPending((cur) => [...cur, ...next]);
  }

  function removeFile(index: number) {
    setPending((cur) => {
      const item = cur[index];
      if (item) URL.revokeObjectURL(item.preview);
      return cur.filter((_, i) => i !== index);
    });
  }

  function clearPending() {
    pending.forEach((p) => URL.revokeObjectURL(p.preview));
    setPending([]);
  }

  async function post() {
    if (pending.length === 0) return toast.error("Choose a photo or video first");
    setBusy(true);
    try {
      const num = order.order_number ?? order.id.slice(0, 8).toUpperCase();
      const entries: ProgressPhoto[] = [];
      for (let i = 0; i < pending.length; i++) {
        const item = pending[i]!;
        const { url } = await uploadToCloudinary(item.file, "orders/progress", item.kind, setPct);
        const entry: ProgressPhoto = { url, caption: caption.trim() || undefined, created_at: new Date().toISOString() };
        if (!entry.caption) delete entry.caption;
        entries.push(entry);
        if (order.user_id) {
          await fsAdd(COL.customerMessages, {
            customer_id: order.user_id,
            sender_id: senderId ?? null,
            sender_role: senderRole,
            body: `Workshop update for order #${num}${entry.caption ? `: ${entry.caption}` : " — here's your sofa being made."}`,
            image_url: url,
            read_at: null,
          });
        }
        await sendOrderProgressEmail({ data: { orderId: order.id, imageUrl: url, caption: entry.caption ?? null } }).catch(
          () => ({ sent: false as const }),
        );
      }
      await fsUpdate(COL.orders, order.id, { progress_photos: [...photos, ...entries] });
      toast.success(
        entries.length === 1
          ? "Update posted — customer notified by message and email"
          : `${entries.length} updates posted — customer notified by message and email`,
      );
      clearPending();
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
              {/\.(mp4|webm|mov)(\?|$)/i.test(p.url) || p.url.includes("/video/") ? (
                <video src={p.url} muted playsInline preload="metadata" className="w-full aspect-[4/3] object-cover rounded" />
              ) : (
                <img src={p.url} alt={p.caption ?? "Workshop photo"} loading="lazy" className="w-full aspect-[4/3] object-cover rounded" />
              )}
              <p className="text-[10px] mt-1" style={{ color: dark.mute }}>{new Date(p.created_at).toLocaleString("en-IN")}</p>
              {p.caption && <p className="text-[12px] line-clamp-2">{p.caption}</p>}
            </a>
          ))}
        </div>
      )}
      <div className="grid gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          aria-label="Workshop photos or videos"
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          className="w-full rounded-lg py-8 px-4 grid place-items-center gap-2 text-sm transition-all duration-200"
          style={{
            border: `2px dashed ${dragging ? dark.accent : dark.border}`,
            background: dragging ? "rgba(200,168,107,0.08)" : "transparent",
            transform: dragging ? "scale(1.01)" : "scale(1)",
          }}
        >
          <ImagePlus
            size={28}
            style={{
              color: dragging ? dark.accent : dark.mute,
              transition: "color 200ms, transform 200ms",
              transform: dragging ? "scale(1.15)" : "scale(1)",
            }}
          />
          <span style={{ color: dragging ? dark.accent : dark.mute }}>
            {dragging ? "Drop to add" : "Drag & drop photos or videos here, or tap to choose"}
          </span>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: dark.mute }}>
            Multiple files supported
          </span>
        </button>

        {pending.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {pending.map((p, i) => (
              <div key={p.preview} className="relative group">
                {p.kind === "video" ? (
                  <video src={p.preview} muted playsInline className="w-full aspect-square object-cover rounded" />
                ) : (
                  <img src={p.preview} alt={p.file.name} className="w-full aspect-square object-cover rounded" />
                )}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label={`Remove ${p.file.name}`}
                  className="absolute top-1 right-1 rounded-full p-1 opacity-80 hover:opacity-100 transition-opacity"
                  style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

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
          disabled={busy || pending.length === 0}
          className="justify-self-start px-4 py-2 text-[11px] font-bold uppercase tracking-widest rounded disabled:opacity-50"
          style={{ background: dark.accent, color: dark.bg }}
        >
          {busy
            ? `Uploading… ${pct}%`
            : pending.length > 1
              ? `Post ${pending.length} updates & notify customer`
              : "Post update & notify customer"}
        </button>
      </div>
    </div>
  );
}
