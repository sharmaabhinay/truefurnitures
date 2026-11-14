import { createServerFn } from "@tanstack/react-start";
import { requireFirebaseAuth } from "./auth/firebase-auth-middleware";
import { videoSettingsSchema } from "./video-settings";

export const getVideoSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { adminGetDoc } = await import("./firebase-admin.server");
  return videoSettingsSchema.parse(await adminGetDoc("site_settings", "video-media") ?? {});
});
export const saveVideoSettings = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((value: unknown) => videoSettingsSchema.parse(value))
  .handler(async ({ data, context }) => {
    const { staffOnly } = await import("./admin-data.functions");
    await staffOnly(context.role, context.userId);
    const { adminSetDoc, adminGetDoc } = await import("./firebase-admin.server");
    await adminSetDoc("site_settings", "video-media", data);
    return videoSettingsSchema.parse(await adminGetDoc("site_settings", "video-media"));
  });