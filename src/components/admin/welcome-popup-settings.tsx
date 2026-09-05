import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { COL, fsSet } from "@/lib/db/firestore";
import {
  brandQueryKey,
  fetchBrand,
  DEFAULT_WELCOME_POPUP,
  type WelcomePopup,
} from "@/lib/brand";
import { ACard, AField, AInput, ATextarea, AButton, AToggle } from "@/components/admin/ui";

/**
 * Admin controls for the storefront welcome / discount popup.
 * Everything lives on the single `site_settings/default` doc so the change is
 * live on the storefront as soon as the brand query refetches.
 */
export function WelcomePopupSettings() {
  const qc = useQueryClient();
  const { data: brand } = useQuery({ queryKey: brandQueryKey, queryFn: fetchBrand });
  const [form, setForm] = useState<WelcomePopup>(DEFAULT_WELCOME_POPUP);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (brand && !loaded) {
      setForm({ ...DEFAULT_WELCOME_POPUP, ...(brand.welcome_popup ?? {}) });
      setLoaded(true);
    }
  }, [brand, loaded]);

  const patch = <K extends keyof WelcomePopup>(k: K, v: WelcomePopup[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const save = async (next: WelcomePopup = form) => {
    setSaving(true);
    try {
      await fsSet(COL.siteSettings, "default", {
        welcome_popup: {
          ...next,
          delay_seconds: Number(next.delay_seconds) || 0,
          reshow_after_days: Number(next.reshow_after_days) || 0,
          discount_percent: Number(next.discount_percent) || 0,
          version: Number(next.version) || 1,
          discount_code: next.discount_code.trim().toUpperCase(),
        },
      });
      await qc.invalidateQueries({ queryKey: brandQueryKey });
      toast.success("Welcome popup updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <ACard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[14px] font-semibold" style={{ color: "#E8E8F0" }}>
              Welcome popup
            </div>
            <div className="text-[12px]" style={{ color: "#888899" }}>
              {form.enabled ? "Live on the storefront" : "Hidden from all visitors"}
            </div>
          </div>
          <AToggle
            checked={form.enabled}
            onChange={(v) => {
              patch("enabled", v);
              void save({ ...form, enabled: v });
            }}
            label={form.enabled ? "Enabled" : "Disabled"}
          />
        </div>
      </ACard>

      <ACard>
        <div className="grid gap-3 sm:grid-cols-3">
          <AField label="Show after (seconds)" hint="Delay before the popup appears.">
            <AInput
              type="number"
              min={0}
              value={form.delay_seconds}
              onChange={(e) => patch("delay_seconds", Number(e.target.value))}
            />
          </AField>
          <AField label="Show again after (days)" hint="0 = never show again once dismissed.">
            <AInput
              type="number"
              min={0}
              value={form.reshow_after_days}
              onChange={(e) => patch("reshow_after_days", Number(e.target.value))}
            />
          </AField>
          <AField label="Campaign version" hint="Increase to show it again to everyone.">
            <div className="flex gap-2">
              <AInput
                type="number"
                min={1}
                value={form.version}
                onChange={(e) => patch("version", Number(e.target.value))}
              />
              <AButton variant="ghost" onClick={() => patch("version", Number(form.version || 1) + 1)}>
                Reset for all
              </AButton>
            </div>
          </AField>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <AField label="Badge">
            <AInput value={form.badge} onChange={(e) => patch("badge", e.target.value)} />
          </AField>
          <AField label="Highlighted words" hint="Shown in italics before the headline.">
            <AInput value={form.italic} onChange={(e) => patch("italic", e.target.value)} />
          </AField>
          <AField label="Headline">
            <AInput value={form.title} onChange={(e) => patch("title", e.target.value)} />
          </AField>
          <AField label="Button label">
            <AInput value={form.cta} onChange={(e) => patch("cta", e.target.value)} />
          </AField>
        </div>

        <div className="mt-3">
          <AField label="Body text">
            <ATextarea rows={3} value={form.body} onChange={(e) => patch("body", e.target.value)} />
          </AField>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <AField label="Discount code">
            <AInput
              value={form.discount_code}
              onChange={(e) => patch("discount_code", e.target.value)}
            />
          </AField>
          <AField label="Discount %">
            <AInput
              type="number"
              min={0}
              value={form.discount_percent}
              onChange={(e) => patch("discount_percent", Number(e.target.value))}
            />
          </AField>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <AToggle checked={form.ask_city} onChange={(v) => patch("ask_city", v)} label="Ask nearest city" />
          <AToggle
            checked={form.ask_location}
            onChange={(v) => patch("ask_location", v)}
            label="Auto-detect location"
          />
        </div>

        <div className="mt-4 flex gap-2">
          <AButton onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </AButton>
          <AButton
            variant="ghost"
            onClick={() => {
              setForm({ ...DEFAULT_WELCOME_POPUP, version: Number(form.version || 1) + 1 });
            }}
          >
            Restore defaults
          </AButton>
        </div>
      </ACard>
    </div>
  );
}
