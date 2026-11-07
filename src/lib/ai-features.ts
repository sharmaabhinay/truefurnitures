import { z } from "zod";
import type { AiInput } from "./ai-contract";

export const aiFeatureUpdate = z.object({
  task: z.enum(["finder", "question", "description", "reply", "room"]),
  enabled: z.boolean(),
});
export type AiFeatureTask = AiInput["task"] | "room";
export type AiFeatures = Record<AiFeatureTask, boolean>;
export const AI_FEATURES_KEY = ["ai-features"] as const;
export function normalizeAiFeatures(value: unknown): AiFeatures {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return { finder: row.finder !== false, question: row.question !== false, description: row.description !== false, reply: row.reply !== false, room: row.room !== false };
}
export const AI_DISABLED_MESSAGE = "This AI feature has been disabled by the admin.";