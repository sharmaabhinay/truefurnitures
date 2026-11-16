import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { useVideoSettings } from "@/lib/use-video-settings";
import { videoEnabled, videoId } from "@/lib/video-settings";
import { logVisitor } from "@/lib/visitor-tracker";
import { parseVideoSource } from "@/lib/video-media";

export function ProductVideo({ url, vertical = false, title = "Product video", productId }: { url: string; vertical?: boolean; title?: string; productId?: string }) {
  const [opened, setOpened] = useState(false);
  const [failed, setFailed] = useState(false);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const counted = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const settings = useVideoSettings();
  const enabled = !settings.error && videoEnabled(settings.data ?? { disabled: [] }, url);
  useEffect(() => {
    setDims(null);
    // Metadata can finish loading before React attaches its handlers, so read the clip
    // dimensions here as well and keep listening while the element is mounted.
    const clip = videoRef.current;
    if (!clip) return;
    const apply = () => { if (clip.videoWidth && clip.videoHeight) setDims({ w: clip.videoWidth, h: clip.videoHeight }); };
    apply();
    clip.addEventListener("loadedmetadata", apply);
    return () => clip.removeEventListener("loadedmetadata", apply);
  }, [url, enabled, failed]);
  useEffect(() => {
    if (!enabled) { videoRef.current?.pause(); setOpened(false); return; }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const update = () => {
      const play = visible && !reduced.matches && document.visibilityState === "visible";
      setOpened(play);
      if (play) void videoRef.current?.play().catch(() => {});
      else videoRef.current?.pause();
    };
    const observer = new IntersectionObserver(([entry]) => { visible = Boolean(entry?.isIntersecting); update(); }, { threshold: 0.15 });
    if (containerRef.current) observer.observe(containerRef.current);
    reduced.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); reduced.removeEventListener("change", update); document.removeEventListener("visibilitychange", update); videoRef.current?.pause(); };
  }, [url, enabled]);
  const source = parseVideoSource(url);
  if (!enabled) return null;
  if (!source) return <p role="alert" className="text-sm text-muted-foreground">Video unavailable.</p>;
  return <div className={`space-y-2 ${vertical ? "w-full max-w-[340px]" : "w-full"}`}>
    <div ref={containerRef} className="relative overflow-hidden rounded-md bg-muted" style={{ aspectRatio: ratio ?? (vertical ? "9 / 16" : "16 / 9") }}>
      {failed ? <p role="alert" className="absolute inset-0 grid place-items-center p-6 text-center text-muted-foreground">This video could not be played.</p>
        : source.kind === "file" ? <video ref={videoRef} key={source.url} src={source.url} loop muted playsInline preload="metadata" aria-label={title} onError={() => setFailed(true)} onLoadedMetadata={(event) => {
          // Fit the frame to the clip so nothing is cropped and no empty band is left around it.
          const clip = event.currentTarget;
          if (clip.videoWidth && clip.videoHeight) setRatio(`${clip.videoWidth} / ${clip.videoHeight}`);
        }} onPlaying={() => {
          if (!productId || counted.current === source.url) return;
          counted.current = source.url;
          let hash = 2166136261;
          for (const char of source.url) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
          window.__lovableEvents?.track?.("project.product_video_played", { product_id: productId, video_id: (hash >>> 0).toString(16), placement: vertical ? "vertical" : "product" });
          logVisitor({ type: "video_play", item: videoId(source.url), sofaId: productId, page: window.location.pathname });
        }} className="h-full w-full object-contain" />
        : opened ? <iframe src={source.embedUrl} title={title} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" onLoad={() => {
          if (!productId || counted.current === source.url) return;
          counted.current = source.url;
          window.__lovableEvents?.track?.("project.product_video_preview_opened", { product_id: productId, video_id: videoId(source.url), provider: source.kind, placement: vertical ? "vertical" : "product" });
          logVisitor({ type: "video_embed", item: videoId(source.url), sofaId: productId, page: window.location.pathname });
        }} onError={() => setFailed(true)} className="h-full w-full border-0" />
        : <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">{source.kind === "youtube" ? "YouTube" : "Instagram"}</div>}

    </div>
    <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-muted-foreground underline underline-offset-4">Open {source.kind === "file" ? "video" : source.kind === "youtube" ? "on YouTube" : "on Instagram"}<ExternalLink className="size-3" /></a>
  </div>;
}
