export type VideoSource = { kind: "file" | "youtube" | "instagram"; url: string; embedUrl?: string };

export function parseVideoSource(value: string): VideoSource | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(host)) {
      const id = host === "youtu.be" ? url.pathname.split("/")[1] : url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1] ?? (url.pathname === "/watch" ? url.searchParams.get("v") : null);
      if (!id || !/^[\w-]{11}$/.test(id)) return null;
      return { kind: "youtube", url: `https://www.youtube.com/watch?v=${id}`, embedUrl: `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0` };
    }
    if (["instagram.com", "www.instagram.com"].includes(host)) {
      const match = url.pathname.match(/^\/(reel|reels|p)\/([\w-]+)\/?$/);
      if (!match) return null;
      const path = match[1] === "reels" ? "reel" : match[1];
      const canonical = `https://www.instagram.com/${path}/${match[2]}/`;
      return { kind: "instagram", url: canonical, embedUrl: `${canonical}embed/` };
    }
    if (/\.(mp4|webm|ogv|ogg)$/i.test(url.pathname)) return { kind: "file", url: url.href };
    return null;
  } catch { return null; }
}

export function isDirectVideo(value: string): boolean {
  return parseVideoSource(value)?.kind === "file";
}