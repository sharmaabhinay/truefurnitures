export type PageKind = "home" | "product";
export type PageSection = { id: string; type: string; enabled: boolean; title?: string; body?: string; image?: string; alt?: string };
export const SECTION_LABELS: Record<string, string> = {
  hero: "Hero slideshow", featured: "Featured sofas", video: "Video showcase", journey: "Customer journey",
  design: "3D design invitation", materials: "Materials", showrooms: "Showrooms", testimonial: "Testimonial",
  faqs: "Customer FAQs", main: "Product photos & purchase", features: "Product features", reviews: "Customer reviews",
  related: "Related sofas", text: "Text section", image: "Image & caption",
};
export const defaults = (page: PageKind): PageSection[] =>
  (page === "home" ? ["hero", "featured", "video", "journey", "design", "materials", "showrooms", "testimonial", "faqs"] : ["main", "features", "reviews", "faqs", "related"])
    .map(type => ({ id: type, type, enabled: true }));
export function normalizeLayout(value: unknown, page: PageKind): PageSection[] {
  if (!Array.isArray(value)) return defaults(page);
  const allowed = new Set([...defaults(page).map(s => s.type), "text", "image", "journey", "faqs"]);
  const seen = new Set<string>();
  const rows: PageSection[] = [];
  for (const v of value) {
    if (!v || typeof v !== "object" || typeof v.id !== "string" || typeof v.type !== "string" || !allowed.has(v.type) || seen.has(v.id)) continue;
    seen.add(v.id);
    rows.push({ id: v.id, type: v.type, enabled: v.enabled !== false,
      ...Object.fromEntries(["title", "body", "image", "alt"].filter(k => typeof v[k] === "string").map(k => [k, v[k]])) });
  }
  return rows;
}
export function moveSection(rows: PageSection[], from: string, to: string): PageSection[] {
  const a = rows.findIndex(s => s.id === from), b = rows.findIndex(s => s.id === to);
  if (a < 0 || b < 0 || a === b) return rows;
  const next = [...rows]; const [item] = next.splice(a, 1);
  if (item) next.splice(b, 0, item);
  return next;
}
export function safeImage(url?: string) {
  return url && (url.startsWith("https://") || (url.startsWith("/") && !url.startsWith("//"))) ? url : undefined;
}