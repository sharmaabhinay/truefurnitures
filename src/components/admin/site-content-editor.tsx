import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { COL, fsSet } from "@/lib/db/firestore";
import { brandQueryKey, fetchBrand, DEFAULT_BRAND, FEATURE_LABELS, type BrandSettings } from "@/lib/brand";
import { toast } from "sonner";
import { VideoInput } from "@/components/admin/video-input";
import { isDirectVideo } from "@/lib/video-media";

function Card({ children }: { children: React.ReactNode }) { return <section className="space-y-4">{children}</section>; }
function CardTitle({ children }: { children: React.ReactNode; right?: React.ReactNode }) { return <h2 className="text-xl font-semibold">{children}</h2>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm space-y-2"><span className="text-muted-foreground">{label}</span>{children}</label>; }

export function SiteContentEditor({ section, onDirtyChange }: { section: "hero" | "brand"; onDirtyChange?: (dirty: boolean) => void }) {
  const qc = useQueryClient();

  // Single source of truth: site_settings row drives the storefront, emails, SEO and receipts.
  const { data: brandRow, isPending, error } = useQuery({ queryKey: brandQueryKey, queryFn: fetchBrand });
  const [brand, setBrand] = useState<BrandSettings>(DEFAULT_BRAND);
  const [brandLoaded, setBrandLoaded] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  useEffect(() => {
    if (brandRow && !brandLoaded) { setBrand(brandRow); setBrandLoaded(true); }
  }, [brandRow, brandLoaded]);
  const brandPatch = <K extends keyof BrandSettings>(k: K, v: BrandSettings[K]) => { onDirtyChange?.(true); setBrand((p) => ({ ...p, [k]: v })); };
  const saveBrand = async () => {
    if (brand.hero_video?.trim() && !isDirectVideo(brand.hero_video)) { toast.error("Use a direct HTTPS video link for the homepage."); return; }
    setSavingBrand(true);
    try {
      await fsSet(COL.siteSettings, "default", {
        brand_name: brand.brand_name,
        tagline: brand.tagline,
        cities: brand.cities,
        established: brand.established,
        phone: brand.phone,
        whatsapp: brand.whatsapp.replace(/\D/g, ""),
        email: brand.email,
        address: brand.address,
        meta_title: brand.meta_title,
        meta_description: brand.meta_description,
        deposit_rate: Number(brand.deposit_rate) || 20,
        free_delivery_above: Number(brand.free_delivery_above) || 0,
        delivery_note: brand.delivery_note,
        announcement: brand.announcement,
        announcement_on: brand.announcement_on,
        require_phone_verification: brand.require_phone_verification,
        require_email_verification: brand.require_email_verification,
        hero_badge: brand.hero_badge,
        hero_headline: brand.hero_headline,
        hero_italic: brand.hero_italic,
        hero_subtext: brand.hero_subtext,
        hero_cta: brand.hero_cta,
        hero_image: brand.hero_image,
        hero_video: brand.hero_video?.trim() || "",
        features: brand.features,

      });
    } catch (e) {
      setSavingBrand(false);
      toast.error(e instanceof Error ? e.message : "Save failed");
      return;
    }
    setSavingBrand(false);
    await qc.invalidateQueries({ queryKey: brandQueryKey });
    onDirtyChange?.(false);
    toast.success("Website details saved");
  };

  if (error) return <p role="alert">Website details could not be loaded.</p>;
  if (isPending || !brandLoaded) return <p>Loading website details…</p>;
  return <div className="bg-background text-foreground p-4 sm:p-6 space-y-5 rounded-md">
      {section === "hero" && (
        <Card>
          <CardTitle right="Controls the storefront">Site CMS</CardTitle>
          <div className="grid gap-x-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="text-[11px] uppercase tracking-[0.14em]">
                Hero Section
              </div>
              <Field label="Hero Headline">
                <Input value={brand.hero_headline} onChange={(e) => brandPatch("hero_headline", e.target.value)} />
              </Field>
              <Field label="Hero Headline (italic line)">
                <Input value={brand.hero_italic} onChange={(e) => brandPatch("hero_italic", e.target.value)} />
              </Field>
              <Field label="Hero Sub-text">
                <Textarea rows={3} value={brand.hero_subtext} onChange={(e) => brandPatch("hero_subtext", e.target.value)} />
              </Field>
              <Field label="Hero Badge">
                <Input value={brand.hero_badge} onChange={(e) => brandPatch("hero_badge", e.target.value)} />
              </Field>
              <Field label="Primary CTA Label">
                <Input value={brand.hero_cta} onChange={(e) => brandPatch("hero_cta", e.target.value)} />
              </Field>
            </div>
            <div className="space-y-4">
              <div className="text-[11px] uppercase tracking-[0.14em]">
                Media & SEO
              </div>
              <Field label="Hero Image URL">
                <Input value={brand.hero_image} onChange={(e) => brandPatch("hero_image", e.target.value)} placeholder="https://…" />
                {brand.hero_image && (
                  <img src={brand.hero_image} alt="" className="mt-3 w-full h-32 object-cover rounded-md opacity-70" />
                )}
              </Field>
              <div className="rounded-md p-3 text-[12px]">
                <VideoInput value={brand.hero_video ?? ""} onChange={url => brandPatch("hero_video", url)} label="Homepage background video" folder="page-sections/hero-video" onBusyChange={setUploadingVideo} />
              </div>
              <div className="rounded-md p-3 text-[12px]">
                SEO meta, announcement bar, WhatsApp number and the delivery note now live in the
                <strong> Brand &amp; Store </strong> tab, so one edit updates the site,
                emails and receipts together.
              </div>
            </div>
          </div>
          <Button
            onClick={saveBrand}
            disabled={savingBrand || uploadingVideo}
            className="mt-6 rounded-md px-6 py-2.5 text-[13px] font-semibold disabled:opacity-60"
           
          >
            {savingBrand ? "Saving…" : "Save homepage"}
          </Button>
        </Card>
      )}

      {section === "brand" && (
        <Card>
          <CardTitle right="One place — applies everywhere">Brand & Store</CardTitle>
          <p className="text-[12px] mb-4">
            These details are the single source of truth. Changing them updates the storefront, page titles &amp; social
            previews, every Resend email, and order receipts automatically.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Brand Name">
              <Input value={brand.brand_name} onChange={(e) => brandPatch("brand_name", e.target.value)} />
            </Field>
            <Field label="Tagline">
              <Input value={brand.tagline} onChange={(e) => brandPatch("tagline", e.target.value)} />
            </Field>
            <Field label="Cities">
              <Input value={brand.cities} onChange={(e) => brandPatch("cities", e.target.value)} />
            </Field>
            <Field label="Established">
              <Input value={brand.established} onChange={(e) => brandPatch("established", e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={brand.phone} onChange={(e) => brandPatch("phone", e.target.value)} />
            </Field>
            <Field label="WhatsApp (digits, with country code)">
              <Input value={brand.whatsapp} onChange={(e) => brandPatch("whatsapp", e.target.value)} />
            </Field>
            <Field label="Email">
              <Input value={brand.email} onChange={(e) => brandPatch("email", e.target.value)} />
            </Field>
            <Field label="Address">
              <Input value={brand.address} onChange={(e) => brandPatch("address", e.target.value)} />
            </Field>
            <Field label="Advance Deposit (%)">
              <Input type="number" value={brand.deposit_rate} onChange={(e) => brandPatch("deposit_rate", Number(e.target.value))} />
            </Field>
            <Field label="Free Delivery Above (₹)">
              <Input type="number" value={brand.free_delivery_above} onChange={(e) => brandPatch("free_delivery_above", Number(e.target.value))} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Delivery Note">
                <Input value={brand.delivery_note} onChange={(e) => brandPatch("delivery_note", e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Meta Title (SEO)">
                <Input value={brand.meta_title} onChange={(e) => brandPatch("meta_title", e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Meta Description (SEO)">
                <Textarea rows={2} value={brand.meta_description} onChange={(e) => brandPatch("meta_description", e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2 flex items-center justify-between py-1">
              <div className="text-[13px]">Show announcement bar</div>
              <Switch checked={brand.announcement_on} onCheckedChange={v => brandPatch("announcement_on", v)} aria-label="Toggle announcement bar" />
            </div>
            <div className="sm:col-span-2 grid gap-2 rounded-lg p-3">
              <div className="text-[11px] uppercase tracking-[0.14em] mb-1">Customer verification</div>
              <div className="flex items-center justify-between py-1">
                <div className="text-[13px]">
                  Require phone OTP verification
                  <div className="text-[11px]">Customers must verify their mobile before an order is placed.</div>
                </div>
                <Switch checked={brand.require_phone_verification} onCheckedChange={v => brandPatch("require_phone_verification", v)} aria-label="Toggle phone verification" />
              </div>
              <div className="flex items-center justify-between py-1">
                <div className="text-[13px]">
                  Require email verification
                  <div className="text-[11px]">Blocks checkout until the customer's email is confirmed.</div>
                </div>
                <Switch checked={brand.require_email_verification} onCheckedChange={v => brandPatch("require_email_verification", v)} aria-label="Toggle email verification" />
              </div>
            </div>
            <div className="sm:col-span-2 grid gap-2 rounded-lg p-3">
              <div className="text-[11px] uppercase tracking-[0.14em] mb-1">Storefront sections</div>
              <div className="text-[11px] mb-1">
                Switch a section off to hide its buttons, nav links and the page itself.
              </div>
              {FEATURE_LABELS.map((f) => {
                const on = brand.features?.[f.key] ?? true;
                return (
                  <div key={f.key} className="flex items-center justify-between py-1">
                    <div className="text-[13px]">
                      {f.label}
                      <div className="text-[11px]">{f.hint}</div>
                    </div>
                    <Switch checked={on} onCheckedChange={v => brandPatch("features", { ...(brand.features ?? DEFAULT_BRAND.features), [f.key]: v })} aria-label={`Toggle ${f.label}`} />
                  </div>
                );
              })}
            </div>

            <div className="sm:col-span-2">
              <Field label="Announcement Text">
                <Input value={brand.announcement ?? ""} onChange={(e) => brandPatch("announcement", e.target.value)} placeholder='e.g. "🎉 Sale — 20% off recliners"' />
              </Field>
            </div>
          </div>
          <Button
            onClick={saveBrand}
            disabled={savingBrand || uploadingVideo}
            className="mt-6 rounded-md px-6 py-2.5 text-[13px] font-semibold disabled:opacity-60"
           
          >
            {savingBrand ? "Saving…" : "Save brand details"}
          </Button>
        </Card>
      )}

  </div>;
}
