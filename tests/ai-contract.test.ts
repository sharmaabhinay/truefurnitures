import { describe, expect, it } from "vitest";
import { aiInput, aiKeyReady, isAdminAi } from "../src/lib/ai-contract";
import { generateAi } from "../src/lib/ai.server";

describe("AI setup and action boundaries", () => {
  it("rejects xyz as a working API credential", async () => {
    expect(aiKeyReady("xyz")).toBe(false);
    expect(aiKeyReady(undefined)).toBe(false);
    const result = await generateAi({ task: "finder", prompt: "Find a sofa" }, "xyz");
    expect(result.text).toBe("");
    expect(result.error).not.toBeNull();
  });
  it("requires staff access for both admin drafting tasks", () => {
    expect(isAdminAi("description")).toBe(true);
    expect(isAdminAi("reply")).toBe(true);
    expect(isAdminAi("finder")).toBe(false);
    expect(isAdminAi("question")).toBe(false);
  });
  it("rejects unexpected actions and oversized user requests", () => {
    expect(aiInput.safeParse({ task: "send-invoice", prompt: "Send now" }).success).toBe(false);
    expect(aiInput.safeParse({ task: "finder", prompt: "a".repeat(2001) }).success).toBe(false);
  });
});