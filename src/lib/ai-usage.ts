export const AI_TOOLS = { finder: "Sofa finder", question: "Product Q&A", description: "Description drafts", reply: "Reply drafts" } as const;
export type AiUsageRow = { id: string; task: keyof typeof AI_TOOLS; user_id: string; name: string; role: string; started_at: string; last_seen: string; seconds: number; attempts: number; successes: number; failures: number; blocked: number; closed?: boolean };
export function summarizeAiUsage(rows: AiUsageRow[]) {
  const total = (list: AiUsageRow[]) => ({ attempts: list.reduce((n, r) => n + r.attempts, 0), successes: list.reduce((n, r) => n + r.successes, 0), failures: list.reduce((n, r) => n + r.failures, 0), blocked: list.reduce((n, r) => n + r.blocked, 0), seconds: list.reduce((n, r) => n + r.seconds, 0), users: new Set(list.map(r => r.user_id)).size, sessions: list.length });
  const used = rows.filter(r => r.attempts > 0);
  const people = [...new Set(used.map(r => r.user_id))].map(id => {
    const list = used.filter(r => r.user_id === id);
    return { id, name: list[0]?.name ?? "Guest", role: list[0]?.role ?? "guest", ...total(list), tools: Object.fromEntries(Object.keys(AI_TOOLS).map(task => [task, list.filter(r => r.task === task).reduce((n, r) => n + r.attempts, 0)])), last: list.map(r => r.last_seen).sort().at(-1) ?? "" };
  });
  const days = [...new Set(used.map(r => r.started_at.slice(0, 10)))].sort().map(day => ({ day, ...Object.fromEntries(Object.keys(AI_TOOLS).map(task => [task, used.filter(r => r.task === task && r.started_at.startsWith(day)).reduce((n, r) => n + r.attempts, 0)])) }));
  return { total: total(used), tools: Object.entries(AI_TOOLS).map(([task, name]) => ({ task, name, ...total(used.filter(r => r.task === task)) })), people, days };
}