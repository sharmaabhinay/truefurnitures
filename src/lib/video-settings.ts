import { z } from "zod";
import { parseVideoSource } from "./video-media";

export const videoUrlSchema = z.string().max(2048).refine(v => !v || Boolean(parseVideoSource(v)), "Use a valid HTTPS video, YouTube or Instagram link.");
export const videoSettingsSchema = z.object({
  heroDesktop: videoUrlSchema.optional(), heroTablet: videoUrlSchema.optional(), heroMobile: videoUrlSchema.optional(),
  disabled: z.array(z.string().regex(/^[a-f0-9]{1,8}$/)).max(500).default([]),
});
export type VideoSettings = z.infer<typeof videoSettingsSchema>;
export function videoId(url: string): string {
  let hash = 2166136261;
  for (const char of parseVideoSource(url)?.url ?? url) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16);
}
export function videoEnabled(settings: VideoSettings, url: string): boolean { return !settings.disabled.includes(videoId(url)); }
export function selectHeroVideo(settings: VideoSettings, screen: "desktop" | "tablet" | "mobile", legacy: { hero_video?: string; hero_video_tablet?: string; hero_video_mobile?: string }): string {
  const desktop = settings.heroDesktop ?? legacy.hero_video ?? "";
  const tablet = settings.heroTablet ?? legacy.hero_video_tablet ?? "";
  const mobile = settings.heroMobile ?? legacy.hero_video_mobile ?? "";
  const candidates = screen === "mobile" ? [mobile, tablet, desktop] : screen === "tablet" ? [tablet, desktop] : [desktop];
  // A disabled assigned video must stay disabled rather than playing a fallback.
  const first = candidates.find(v => v && parseVideoSource(v));
  return first && videoEnabled(settings, first) ? first : "";
}