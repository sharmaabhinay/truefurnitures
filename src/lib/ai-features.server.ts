import { adminGetDoc } from "./firebase-admin.server";
import { normalizeAiFeatures } from "./ai-features";
import type { AiInput } from "./ai-contract";

export async function readAiFeatures() {
  return normalizeAiFeatures(await adminGetDoc("site_settings", "ai-features"));
}

export async function isAiFeatureEnabled(task: AiInput["task"]) {
  return (await readAiFeatures())[task];
}