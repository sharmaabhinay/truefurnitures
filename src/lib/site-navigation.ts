import type { FeatureFlags } from "@/lib/brand";
import { safeHref } from "@/lib/page-layout";

export type NavigationItem = {
  id: string;
  label: string;
  url: string;
  enabled: boolean;
  feature?: keyof FeatureFlags;
};
export type HeaderCta = { label: string; url: string; enabled: boolean };

export const DEFAULT_NAVIGATION: NavigationItem[] = [
  { id: "collections", label: "Collections", url: "/collections", enabled: true },
  { id: "room-advisor", label: "Room advisor", url: "/room-advisor", enabled: true },
  { id: "hire-carpenter", label: "Hire a Carpenter", url: "/hire-carpenter", enabled: true, feature: "hireCarpenter" },
  { id: "contact", label: "Contact", url: "/contact", enabled: true },
];
export const DEFAULT_HEADER_CTA: HeaderCta = { label: "Design Yours", url: "/design", enabled: true };

export const HEADER_ROTATION_MS = 3_000;
const ROTATING_PATHS = new Set(["/room-advisor", "/hire-carpenter", "/contact", "/design"]);

export function splitHeaderNavigation(navigation: NavigationItem[], cta: HeaderCta, features: FeatureFlags) {
  const links = navigation.filter(item => item.enabled && (!item.feature || features[item.feature]) && (item.url !== "/design" || features.design3d) && (item.url !== "/hire-carpenter" || features.hireCarpenter));
  const rotating = links.filter(item => ROTATING_PATHS.has(item.url));
  if (cta.enabled && cta.url === "/design" && features.design3d && !rotating.some(item => item.url === cta.url)) {
    rotating.push({ id: "header-design", ...cta });
  }
  return { primary: links.filter(item => !ROTATING_PATHS.has(item.url)), rotating };
}

export function normalizeNavigation(value: unknown): NavigationItem[] {
  if (!Array.isArray(value)) return DEFAULT_NAVIGATION.map(item => ({ ...item }));
  const seen = new Set<string>();
  return value.slice(0, 12).flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const label = typeof row.label === "string" ? row.label.trim().slice(0, 80) : "";
    const url = safeHref(typeof row.url === "string" ? row.url.slice(0, 2000) : undefined);
    const candidate = typeof row.id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(row.id) ? row.id : `link-${index + 1}`;
    if (!label || !url || seen.has(candidate)) return [];
    seen.add(candidate);
    const feature = row.feature === "hireCarpenter" || row.feature === "design3d" || row.feature === "gallery" || row.feature === "blog" || row.feature === "careers" || row.feature === "showrooms" || row.feature === "bookVisit" ? row.feature : undefined;
    return [{ id: candidate, label, url, enabled: row.enabled !== false, ...(feature ? { feature } : {}) }];
  });
}

export function navigationForFeatures(value: unknown, features: FeatureFlags): NavigationItem[] {
  return normalizeNavigation(value).filter(item => item.enabled && (!item.feature || features[item.feature]));
}

export function normalizeHeaderCta(value: unknown): HeaderCta {
  if (!value || typeof value !== "object") return { ...DEFAULT_HEADER_CTA };
  const row = value as Record<string, unknown>;
  return {
    label: typeof row.label === "string" ? row.label.slice(0, 80) : DEFAULT_HEADER_CTA.label,
    url: safeHref(typeof row.url === "string" ? row.url : undefined) ?? DEFAULT_HEADER_CTA.url,
    enabled: row.enabled !== false,
  };
}
