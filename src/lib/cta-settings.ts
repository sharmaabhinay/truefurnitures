import { z } from "zod";

export const CTA_SETTINGS_KEY = ["cta-settings"] as const;

export const ctaSettingsSchema = z.object({
  enabled: z.boolean(),
  /** Empty = use the brand WhatsApp number. */
  phone: z.string().trim().max(20),
  message: z.string().trim().min(1).max(500),
  /** Seconds the text stays visible before collapsing to the icon. */
  showSeconds: z.number().int().min(2).max(60),
  /** Seconds between each new suggested question. */
  intervalSeconds: z.number().int().min(4).max(120),
  /** Delay before the first message appears. */
  initialDelaySeconds: z.number().int().min(0).max(60),
  questions: z.array(z.string().trim().min(1).max(80)).min(1).max(12),
});
export type CtaSettings = z.infer<typeof ctaSettingsSchema>;

export const DEFAULT_CTA_SETTINGS: CtaSettings = {
  enabled: true,
  phone: "",
  message: "Hello! I'd like help choosing a custom sofa.",
  showSeconds: 5,
  intervalSeconds: 10,
  initialDelaySeconds: 1,
  questions: [
    "Let’s talk sofas",
    "Need help picking a fabric?",
    "Which size fits your room?",
    "Want a price for your design?",
    "Book a free home visit?",
  ],
};

export function normalizeCtaSettings(value: unknown): CtaSettings {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const merged = { ...DEFAULT_CTA_SETTINGS, ...row };
  const parsed = ctaSettingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_CTA_SETTINGS;
}
