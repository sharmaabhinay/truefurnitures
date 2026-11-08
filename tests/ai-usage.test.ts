import { it, expect } from "vitest";
import { summarizeAiUsage, type AiUsageRow } from "../src/lib/ai-usage";
const row: AiUsageRow = { id: "1", task: "finder", user_id: "customer", name: "Customer", role: "user", started_at: "2026-11-02T00:00:00Z", last_seen: "2026-11-02T00:01:00Z", seconds: 60, attempts: 2, successes: 1, failures: 0, blocked: 1 };
it("counts all four AI tools with real requests and measured time", () => {
  const report = summarizeAiUsage([row, { ...row, id: "2", task: "question", seconds: 120, attempts: 1, successes: 1, blocked: 0 }, { ...row, id: "3", task: "description", user_id: "admin", attempts: 1 }, { ...row, id: "4", task: "reply", user_id: "admin", attempts: 1 }]);
  expect(report.total.attempts).toBe(5); expect(report.total.seconds).toBe(300); expect(report.total.users).toBe(2); expect(report.tools.map(t => t.attempts)).toEqual([2, 1, 1, 1, 0]); expect(report.people.find(p => p.id === "customer")?.seconds).toBe(180);
});
it("includes room advisor requests and active time separately from the four Groq tools", () => {
  const report = summarizeAiUsage([{ ...row, task: "room", attempts: 1, successes: 1, blocked: 0, seconds: 45 }]);
  expect(report.tools.find(t => t.task === "room")?.attempts).toBe(1);
  expect(report.tools.find(t => t.task === "room")?.seconds).toBe(45);
  expect(report.tools.find(t => t.task === "finder")?.attempts).toBe(0);
});
it("does not count an opened but unused AI box as a use", () => { expect(summarizeAiUsage([{ ...row, attempts: 0 }]).total.attempts).toBe(0); });