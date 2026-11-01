import { adminGetDoc, adminTransaction } from "./firebase-admin.server";
import type { AiUsageRow } from "./ai-usage";

export async function recordAiOutcome(id: string, outcome: "successes" | "failures" | "blocked") {
  await adminTransaction(async tx => {
    const row = await tx.get("ai_usage", id);
    if (!row || row['closed']) throw new Error("Reopen the AI tool and try again.");
    tx.set("ai_usage", id, { attempts: Number(row['attempts'] ?? 0) + 1, [outcome]: Number(row[outcome] ?? 0) + 1 });
  });
}
export async function requireAiSession(id: string | undefined, task: string, uid?: string) {
  if (!id) throw new Error("Reopen the AI tool and try again.");
  const row = await adminGetDoc("ai_usage", id) as AiUsageRow | null;
  if (!row || row.closed || row.task !== task || (uid && row.user_id !== uid) || Date.now() - Date.parse(row.last_seen) > 180_000) throw new Error("Reopen the AI tool and try again.");
  return row;
}