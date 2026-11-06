import { createServerFn } from "@tanstack/react-start";
import { requireFirebaseAuth } from "./auth/firebase-auth-middleware";
import { ctaSettingsSchema, normalizeCtaSettings } from "./cta-settings";

export const getCtaSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { adminGetDoc } = await import("./firebase-admin.server");
  return normalizeCtaSettings(await adminGetDoc("site_settings", "whatsapp-cta"));
});

export const saveCtaSettings = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((value: unknown) => ctaSettingsSchema.parse(value))
  .handler(async ({ data, context }) => {
    const { staffOnly } = await import("./admin-data.functions");
    await staffOnly(context.role, context.userId);
    const { adminSetDoc, adminGetDoc } = await import("./firebase-admin.server");
    await adminSetDoc("site_settings", "whatsapp-cta", data);
    return normalizeCtaSettings(await adminGetDoc("site_settings", "whatsapp-cta"));
  });
