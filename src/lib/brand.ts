import { useQuery } from "@tanstack/react-query";
import { COL, fsGet } from "@/lib/db/firestore";

export type BrandSettings = {
  brand_name: string;
  tagline: string;
  cities: string;
  established: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  meta_title: string;
  meta_description: string;
  deposit_rate: number;
  free_delivery_above: number;
  delivery_note: string;
  announcement: string | null;
  announcement_on: boolean;
  require_phone_verification: boolean;
  require_email_verification: boolean;
  hero_badge: string;
  hero_headline: string;
  hero_italic: string;
  hero_subtext: string;
  hero_cta: string;
  hero_image: string;
};

/** Fallbacks used before the CMS row loads (and during SSR). */
export const DEFAULT_BRAND: BrandSettings = {
  brand_name: "True Furniture's",
  tagline: "Fully Customizable Furniture",
  cities: "Indore & Ujjain",
  established: "2007",
  phone: "+91 77738 96496",
  whatsapp: "917773896496",
  email: "hello@truefurnitures.in",
  address: "Vijay Nagar, Indore — 452010",
  meta_title: "True Furniture's — Fully Customizable Furniture | Indore & Ujjain",
  meta_description:
    "True Furniture's — fully customizable sofas designed in 3D. Choose fabric, colour, size and finish. Hand-tailored in Indore & Ujjain.",
  deposit_rate: 20,
  free_delivery_above: 15000,
  delivery_note: "Free delivery in Indore & MP above ₹15,000",
  announcement: null,
  announcement_on: false,
  require_phone_verification: true,
  require_email_verification: false,
  hero_badge: "Fully Customizable Furniture · Indore & Ujjain",
  hero_headline: "Every Inch,",
  hero_italic: "Yours to Design.",
  hero_subtext:
    "Bespoke sofas — fabric, colour, size, legs, add-ons. Every stitch, every curve, strictly by your rules.",
  hero_cta: "Start 3D Design",
  hero_image: "",
};

export const brandQueryKey = ["site-settings"] as const;

export async function fetchBrand(): Promise<BrandSettings> {
  const data = await fsGet<Partial<BrandSettings>>(COL.siteSettings, "default");
  return { ...DEFAULT_BRAND, ...(data ?? {}) } as BrandSettings;
}

/** Single source of truth for brand details across the storefront + admin. */
export function useBrand(): BrandSettings {
  const { data } = useQuery({
    queryKey: brandQueryKey,
    queryFn: fetchBrand,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
  return data ?? DEFAULT_BRAND;
}

/** e.g. "True Furniture's · Indore & Ujjain" */
export function brandLine(b: BrandSettings) {
  return `${b.brand_name} · ${b.cities}`;
}
