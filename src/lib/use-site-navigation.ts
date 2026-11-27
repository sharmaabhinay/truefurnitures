import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchLayouts, layoutKey, type LayoutDocument } from "@/components/page-sections";
import { normalizeHeaderCta, navigationForFeatures } from "./site-navigation";
import type { FeatureFlags } from "./brand";

export function useSiteNavigation(features: FeatureFlags) {
  const { data } = useQuery({ queryKey: layoutKey, queryFn: fetchLayouts, staleTime: 30_000 });
  const [preview, setPreview] = useState<LayoutDocument | null>(null);
  useEffect(() => {
    if (window.parent === window || new URLSearchParams(window.location.search).get("sectionPreview") !== "1") return;
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.kind !== "tf-page-preview") return;
      setPreview({ navigation: event.data.navigation, headerCta: event.data.headerCta });
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ kind: "tf-page-ready" }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, []);
  const value = preview ?? data;
  return { navigation: navigationForFeatures(value?.navigation, features), cta: normalizeHeaderCta(value?.headerCta) };
}