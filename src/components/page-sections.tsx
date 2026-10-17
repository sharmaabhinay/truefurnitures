import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { COL, fsGet } from "@/lib/db/firestore";
import { normalizeLayout, safeImage, type PageKind, type PageSection } from "@/lib/page-layout";
import { CustomerFaqs } from "@/components/customer-faqs";
import { CustomerJourney } from "@/components/customer-journey";

export const layoutKey = ["page-layouts"] as const;
export type LayoutDocument = Partial<Record<PageKind, PageSection[]>>;
export const fetchLayouts = () => fsGet<LayoutDocument>(COL.siteSettings, "page-layouts");
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
    if (s.type === "text" || s.type === "image") content = <section className="max-w-6xl mx-auto px-6 py-16 sm:py-24">
      {s.type === "image" && safeImage(s.image) && <img src={safeImage(s.image)} alt={s.alt ?? ""} loading="lazy" className="w-full max-h-[600px] object-contain mb-8" />}
      {s.title && <h2 className="font-display text-3xl sm:text-4xl mb-5">{s.title}</h2>}
      {s.body && <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap max-w-3xl">{s.body}</p>}
    </section>;
    return content ? <div key={s.id} data-page-section={s.id}>{content}</div> : null;
  })}</>;
}