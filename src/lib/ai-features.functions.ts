import { createServerFn } from "@tanstack/react-start";
import { requireFirebaseAuth } from "./auth/firebase-auth-middleware";
import { aiFeatureUpdate } from "./ai-features";

export const getAiFeatures = createServerFn({ method: "GET" }).handler(async () => {
  const { readAiFeatures } = await import("./ai-features.server");
  return readAiFeatures();
});

export const setAiFeature = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((value: unknown) => aiFeatureUpdate.parse(value))
  .handler(async ({ data, context }) => {
    const { staffOnly } = await import("./admin-data.functions");
    await staffOnly(context.role, context.userId);
    const { adminSetDoc } = await import("./firebase-admin.server");
    await adminSetDoc("site_settings", "ai-features", { [data.task]: data.enabled });
    const { readAiFeatures } = await import("./ai-features.server");
    return readAiFeatures();
  });