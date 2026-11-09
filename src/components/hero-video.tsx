import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroVideo({ url, poster }: { url: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const counted = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && !paused && !reduced.matches) void video.play().catch(() => setPlaying(false));
      else video.pause();
    });
    observer.observe(video);
    return () => { observer.disconnect(); video.pause(); };
  }, [url, paused]);
  if (failed) return <img src={poster} alt="" aria-hidden className="h-full w-full object-cover" />;
  return <><video ref={ref} src={url} poster={poster} muted loop playsInline preload="metadata" aria-label="Homepage sofa video" onError={() => setFailed(true)} onPlay={() => setPlaying(true)} onPlaying={() => {
    const video = ref.current;
    if (!video || counted.current === url || document.visibilityState !== "visible") return;
    const rect = video.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) return;
    counted.current = url;
    let hash = 2166136261;
    for (const char of url) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    window.__lovableEvents?.track?.("project.homepage_video_viewed", { video_id: (hash >>> 0).toString(16), placement: "homepage" });
  }} onPause={() => setPlaying(false)} className="h-full w-full object-cover" /><Button type="button" variant="secondary" size="icon" className="absolute bottom-6 right-6 z-20" aria-label={playing ? "Pause homepage video" : "Play homepage video"} onClick={() => { const video = ref.current; if (!video) return; if (playing) { setPaused(true); video.pause(); } else { setPaused(false); void video.play().catch(() => setPlaying(false)); } }}>{playing ? <Pause className="size-4" /> : <Play className="size-4" />}</Button></>;
}