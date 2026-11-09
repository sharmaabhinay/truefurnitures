import { useId, useState } from "react";
import { Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { uploadToCloudinary } from "@/lib/upload";
import { isDirectVideo, parseVideoSource } from "@/lib/video-media";
import { ProductVideo } from "@/components/product-video";
import { toast } from "sonner";

export function VideoInput({ value, onChange, label, folder, social = false, onBusyChange }: { value: string; onChange: (url: string) => void; label: string; folder: string; social?: boolean; onBusyChange?: (busy: boolean) => void }) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const valid = !value.trim() || (social ? Boolean(parseVideoSource(value)) : isDirectVideo(value));
  async function upload(file?: File) {
    if (!file) return;
    if (!["video/mp4", "video/webm", "video/ogg"].includes(file.type)) { toast.error("Choose an MP4, WebM or Ogg video."); return; }
    setBusy(true); onBusyChange?.(true); setProgress(0);
    try { const result = await uploadToCloudinary(file, folder, "video", setProgress); onChange(result.url); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Video upload failed"); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  return <div className="space-y-3 min-w-0">
    <label htmlFor={id} className="text-sm text-muted-foreground">{label}</label>
    <div className="flex items-center gap-2"><Input id={id} type="url" value={value} disabled={busy} onChange={e => onChange(e.target.value)} placeholder={social ? "YouTube Shorts or Instagram Reel URL" : "https://…/product.mp4"} className="min-w-0" />{value && <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${label}`} disabled={busy} onClick={() => onChange("")}><X className="size-4" /></Button>}</div>
    {!valid && <p role="alert" className="text-sm text-destructive">{social ? "Use a public YouTube, Instagram Reel, or direct video link." : "Use a direct HTTPS MP4, WebM or Ogg video link."}</p>}
    {!social && <><label className="inline-flex cursor-pointer items-center gap-2 border border-input rounded-md px-3 py-2 text-sm"><Upload className="size-4" />{busy ? `Uploading ${progress}%` : "Upload video"}<input aria-label={`Upload ${label}`} type="file" accept="video/mp4,video/webm,video/ogg" disabled={busy} className="sr-only" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }} /></label>{busy && <progress aria-label="Video upload progress" value={progress} max={100} className="w-full accent-primary" />}</>}
    {value && valid && <ProductVideo key={value} url={value} vertical={social} title={label} />}
  </div>;
}