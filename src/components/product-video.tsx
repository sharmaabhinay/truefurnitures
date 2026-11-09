import { useState } from "react";
import { Play, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseVideoSource } from "@/lib/video-media";

export function ProductVideo({ url, vertical = false, title = "Product video" }: { url: string; vertical?: boolean; title?: string }) {
  const [opened, setOpened] = useState(false);
  const [failed, setFailed] = useState(false);
  const source = parseVideoSource(url);
  if (!source) return <p role="alert" className="text-sm text-muted-foreground">Video unavailable.</p>;
  return <div className={`space-y-2 ${vertical ? "w-full max-w-[340px]" : "w-full"}`}>
    <div className={`relative overflow-hidden rounded-md bg-muted ${vertical ? "aspect-[9/16]" : "aspect-video"}`}>
      {failed ? <p role="alert" className="absolute inset-0 grid place-items-center p-6 text-center text-muted-foreground">This video could not be played.</p>
        : source.kind === "file" ? <video key={source.url} src={source.url} controls playsInline preload="none" aria-label={title} onError={() => setFailed(true)} className="h-full w-full object-contain" />
        : opened ? <iframe src={source.embedUrl} title={title} loading="lazy" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" onError={() => setFailed(true)} className="h-full w-full border-0" />
        : <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-5"><span className="text-sm text-muted-foreground">{source.kind === "youtube" ? "YouTube" : "Instagram"}</span><Button variant="outline" onClick={() => setOpened(true)}><Play className="size-4" />Play video</Button></div>}
    </div>
    <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-muted-foreground underline underline-offset-4">Open {source.kind === "file" ? "video" : source.kind === "youtube" ? "on YouTube" : "on Instagram"}<ExternalLink className="size-3" /></a>
  </div>;
}