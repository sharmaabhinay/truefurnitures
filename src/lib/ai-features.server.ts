import { adminGetDoc } from "./firebase-admin.server";
import { normalizeAiFeatures } from "./ai-features";
import type { AiFeatureTask } from "./ai-features";

export async function readAiFeatures() {
  return normalizeAiFeatures(await adminGetDoc("site_settings", "ai-features"));
}

export async function isAiFeatureEnabled(task: AiFeatureTask) {
  return (await readAiFeatures())[task];
}