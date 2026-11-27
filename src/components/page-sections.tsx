import { createContext, useContext, useEffect, useState, type ImgHTMLAttributes, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { COL, fsGet } from "@/lib/db/firestore";
import { normalizeLayout, safeImage, type PageKind, type PageSection } from "@/lib/page-layout";
import type { HeaderCta, NavigationItem } from "@/lib/site-navigation";
import { CustomerFaqs } from "@/components/customer-faqs";
import { CustomerJourney } from "@/components/customer-journey";
import { EditorialLink } from "@/components/editorial-link";

export const layoutKey = ["page-layouts"] as const;
export type LayoutDocument = Partial<Record<PageKind, PageSection[]>> & {
  navigation?: NavigationItem[];
  headerCta?: HeaderCta;
};
export const fetchLayouts = () => fsGet<LayoutDocument>(COL.siteSettings, "page-layouts");

type SectionContextValue = {
  section: PageSection | null;
  image: (key: string, fallback: string) => string;
  imageAlt: (key: string, fallback: string) => string;
};
const SectionContext = createContext<SectionContextValue>({ section: null, image: (_key, fallback) => fallback, imageAlt: (_key, fallback) => fallback });

export function usePageSectionContent() {
  return useContext(SectionContext);
}

export function EditableCopy({ field, fallback }: { field: "eyebrow" | "title" | "body"; fallback: ReactNode }) {
  const { section } = usePageSectionContent();
  const value = section?.[field];
  return <>{typeof value === "string" && value.trim() ? value : fallback}</>;
}

export function EditableSectionLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const { section } = usePageSectionContent();
  return <EditorialLink href={section?.buttonUrl || href} {...(className ? { className } : {})}>{section?.buttonLabel || children}</EditorialLink>;
}

export function EditableImage({ imageKey, src, alt, ...props }: ImgHTMLAttributes<HTMLImageElement> & { imageKey: string; src: string; alt: string }) {
  const { section, image, imageAlt } = usePageSectionContent();
  const customSource = section?.type === "image" && imageKey === "main" ? safeImage(section.image) : undefined;
  return <img
    {...props}
    src={customSource ?? image(imageKey, src)}
    alt={imageAlt(imageKey, section?.type === "image" && imageKey === "main" ? section.alt ?? alt : alt)}
    data-editor-image={imageKey}
    data-editor-section={section?.id}
  />;
}

function CustomSection({ section }: { section: PageSection }) {
  return <section className="max-w-6xl mx-auto px-6 py-16 sm:py-24">
    {section.type === "image" && <EditableImage imageKey="main" src={safeImage(section.image) ?? "/favicon.png"} alt={section.alt ?? ""} loading="lazy" className="w-full max-h-[600px] object-contain mb-8" />}
    {section.eyebrow && <p className="tf-chip mb-4">{section.eyebrow}</p>}
    {section.title && <h2 className="font-display text-3xl sm:text-4xl mb-5">{section.title}</h2>}
    {section.body && <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap max-w-3xl">{section.body}</p>}
    {section.buttonLabel && section.buttonUrl && <div className="mt-6"><EditableSectionLink href={section.buttonUrl} className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 text-xs font-semibold text-primary-foreground">{section.buttonLabel}</EditableSectionLink></div>}
  </section>;
}

const spacingClass = { compact: "py-3", default: "py-0", spacious: "py-10 sm:py-16" } as const;
const backgroundClass = { default: "bg-transparent", surface: "bg-card", muted: "bg-muted/30" } as const;

export function PageSections({ page, sections }: { page: PageKind; sections: Record<string, ReactNode> }) {
  const { data } = useQuery({ queryKey: layoutKey, queryFn: fetchLayouts, staleTime: 30_000 });
  const [preview, setPreview] = useState<PageSection[] | null>(null);
  useEffect(() => {
    if (window.parent === window) return;
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.kind !== "tf-page-preview" || event.data.page !== page) return;
      setPreview(normalizeLayout(event.data.sections, page));
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ kind: "tf-page-ready", page }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, [page]);
  const rows = preview ?? normalizeLayout(data?.[page], page);
  return <>{rows.filter(s => s.enabled).map(s => {
    let content = sections[s.type];
    if (s.type === "faqs") content = <CustomerFaqs />;
    if (s.type === "journey") content = <CustomerJourney />;
    if (s.type === "text" || s.type === "image") content = <CustomSection section={s} />;
    if (!content) return null;
    const style = s.style ?? { spacing: "default", background: "default", alignment: "left" };
    const value: SectionContextValue = {
      section: s,
      image: (key, fallback) => safeImage(s.images?.[key]) ?? fallback,
      imageAlt: (key, fallback) => s.imageAlts?.[key] ?? fallback,
    };
    return <SectionContext.Provider key={s.id} value={value}>
      <div
        data-page-section={s.id}
        data-section-type={s.type}
        className={`${spacingClass[style.spacing]} ${backgroundClass[style.background]} ${style.alignment === "center" ? "text-center" : ""}`}
      >{content}{!!s.buttons?.length && <div className="max-w-6xl mx-auto px-6 pb-8 flex flex-wrap gap-3">{s.buttons.map(button => <EditorialLink key={button.id} href={button.url} className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground break-words">{button.label}</EditorialLink>)}</div>}</div>
    </SectionContext.Provider>;
  })}</>;
}
