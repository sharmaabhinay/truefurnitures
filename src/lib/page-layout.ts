export type PageKind = "home" | "product";

export type SectionButton = { id: string; label: string; url: string };
export type HeroSlideContent = {
  eyebrow?: string;
  title?: string;
  italic?: string;
  body?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  alt?: string;
};
export type SectionStyle = {
  spacing: "compact" | "default" | "spacious";
  background: "default" | "surface" | "muted";
  alignment: "left" | "center";
};
export type PageSection = {
  id: string;
  type: string;
  enabled: boolean;
  eyebrow?: string;
  title?: string;
  body?: string;
  image?: string;
  alt?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  secondaryButtonLabel?: string;
  secondaryButtonUrl?: string;
  buttons?: SectionButton[];
  images?: Record<string, string>;
  imageAlts?: Record<string, string>;
  heroSlides?: HeroSlideContent[];
  style?: SectionStyle;
};

export const SECTION_LABELS: Record<string, string> = {
  hero: "Hero slideshow", featured: "Featured sofas", video: "Video showcase", journey: "Customer journey",
  design: "3D design invitation", materials: "Materials", showrooms: "Showrooms", testimonial: "Testimonial",
  faqs: "Customer FAQs", main: "Product photos & purchase", features: "Product features", reviews: "Customer reviews",
  related: "Related sofas", text: "Text & buttons", image: "Image & caption",
};

export const defaults = (page: PageKind): PageSection[] =>
  (page === "home" ? ["hero", "featured", "video", "journey", "design", "materials", "showrooms", "testimonial", "faqs"] : ["main", "features", "reviews", "faqs", "related"])
    .map(type => ({ id: type, type, enabled: true }));

export function safeImage(url?: string) {
  return url && (url.startsWith("https://") || (url.startsWith("/") && !url.startsWith("//"))) ? url : undefined;
}

export function safeHref(url?: string) {
  return safeImage(url);
}

const text = (value: unknown, max = 5000) => typeof value === "string" ? value.slice(0, max) : undefined;
const id = (value: unknown) => typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value) ? value : undefined;
const imageKey = (value: string) => /^[a-zA-Z0-9:_-]{1,100}$/.test(value);

function stringField(source: Record<string, unknown>, key: string, max = 5000) {
  const value = text(source[key], max);
  return value === undefined ? {} : { [key]: value };
}

function normalizeButtons(value: unknown): SectionButton[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.slice(0, 8).flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const label = text(row.label, 100)?.trim();
    const url = safeHref(text(row.url, 2000));
    if (!label || !url) return [];
    return [{ id: id(row.id) ?? `button-${index + 1}`, label, url }];
  });
}

function normalizeImages(value: unknown, max = 2000) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return Object.fromEntries(Object.entries(value).slice(0, 40).flatMap(([key, entry]) => {
    if (!imageKey(key)) return [];
    const url = max === 2000 ? safeImage(text(entry, max)) : text(entry, max);
    return url ? [[key, url]] : [];
  }));
}

function normalizeStyle(value: unknown): SectionStyle | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  return {
    spacing: row.spacing === "compact" || row.spacing === "spacious" ? row.spacing : "default",
    background: row.background === "surface" || row.background === "muted" ? row.background : "default",
    alignment: row.alignment === "center" ? "center" : "left",
  };
}

function normalizeHeroSlides(value: unknown): HeroSlideContent[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.slice(0, 4).map(entry => {
    const row = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
    return {
      ...stringField(row, "eyebrow", 180), ...stringField(row, "title", 180),
      ...stringField(row, "italic", 180), ...stringField(row, "body", 1200),
      ...stringField(row, "buttonLabel", 100), ...stringField(row, "alt", 240),
      ...(safeHref(text(row.buttonUrl, 2000)) ? { buttonUrl: safeHref(text(row.buttonUrl, 2000)) } : {}),
    };
  });
}

export function normalizeLayout(value: unknown, page: PageKind): PageSection[] {
  if (!Array.isArray(value)) return defaults(page);
  const allowed = new Set([...defaults(page).map(s => s.type), "text", "image", "journey", "faqs"]);
  const seen = new Set<string>();
  const rows: PageSection[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const v = entry as Record<string, unknown>;
    const sectionId = id(v.id);
    if (!sectionId || typeof v.type !== "string" || !allowed.has(v.type) || seen.has(sectionId)) continue;
    seen.add(sectionId);
    const buttonUrl = safeHref(text(v.buttonUrl, 2000));
    const secondaryButtonUrl = safeHref(text(v.secondaryButtonUrl, 2000));
    rows.push({
      id: sectionId, type: v.type, enabled: v.enabled !== false,
      ...stringField(v, "eyebrow", 180), ...stringField(v, "title", 300), ...stringField(v, "body", 8000),
      ...stringField(v, "alt", 240), ...stringField(v, "buttonLabel", 100), ...stringField(v, "secondaryButtonLabel", 100),
      ...(safeImage(text(v.image, 2000)) ? { image: safeImage(text(v.image, 2000)) } : {}),
      ...(buttonUrl ? { buttonUrl } : {}), ...(secondaryButtonUrl ? { secondaryButtonUrl } : {}),
      ...(normalizeButtons(v.buttons) ? { buttons: normalizeButtons(v.buttons) } : {}),
      ...(normalizeImages(v.images) ? { images: normalizeImages(v.images) } : {}),
      ...(normalizeImages(v.imageAlts, 240) ? { imageAlts: normalizeImages(v.imageAlts, 240) } : {}),
      ...(normalizeHeroSlides(v.heroSlides) ? { heroSlides: normalizeHeroSlides(v.heroSlides) } : {}),
      ...(normalizeStyle(v.style) ? { style: normalizeStyle(v.style) } : {}),
    });
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
