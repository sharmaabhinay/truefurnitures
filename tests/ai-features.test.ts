import { beforeEach, describe, expect, it, vi } from "vitest";
import { aiFeatureUpdate, normalizeAiFeatures } from "../src/lib/ai-features";

const mocks = vi.hoisted(() => ({
  read: vi.fn(), write: vi.fn(), staff: vi.fn(), generate: vi.fn(), record: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn };
  return builder;
} }));
vi.mock("../src/lib/auth/firebase-auth-middleware", () => ({ requireFirebaseAuth: {} }));
vi.mock("../src/lib/firebase-admin.server", () => ({ adminGetDoc: mocks.read, adminSetDoc: mocks.write }));
vi.mock("../src/lib/admin-data.functions", () => ({ staffOnly: mocks.staff }));
vi.mock("../src/lib/ai.server", () => ({ generateAi: mocks.generate }));
vi.mock("../src/lib/ai-usage.server", () => ({ requireAiSession: vi.fn(async () => ({ id: "session" })), recordAiOutcome: mocks.record }));
import { askCustomerAi, draftAdminAi } from "../src/lib/ai.functions";
import { setAiFeature } from "../src/lib/ai-features.functions";

describe("Individual AI switches", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.staff.mockResolvedValue(undefined); mocks.write.mockResolvedValue(undefined); });
  it.each(["finder", "question", "description", "reply"] as const)("blocks disabled %s before provider generation", async task => {
    mocks.read.mockResolvedValue({ [task]: false });
    const action = task === "finder" || task === "question" ? askCustomerAi : draftAdminAi;
    const invoke = action as unknown as (arg: unknown) => Promise<{ text: string; error: string | null }>;
    const result = await invoke({ data: { task, prompt: "Help me", sessionId: "session" }, context: { role: "admin", userId: "owner" } });
    expect(result).toEqual({ text: "", error: "This AI feature has been disabled by the admin." });
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.record).toHaveBeenCalledWith("session", "blocked");
    expect(normalizeAiFeatures({ [task]: false })[task]).toBe(false);
    for (const other of ["finder", "question", "description", "reply"] as const) {
      if (other !== task) expect(normalizeAiFeatures({ [task]: false })[other]).toBe(true);
    }
  });
  it("persists only the changed switch without overwriting others", async () => {
    mocks.read.mockResolvedValue({ finder: false, reply: false });
    const invoke = setAiFeature as unknown as (arg: unknown) => Promise<unknown>;
    await invoke({ data: { task: "reply", enabled: false }, context: { role: "staff", userId: "manager" } });
    expect(mocks.staff).toHaveBeenCalledWith("staff", "manager");
    expect(mocks.write).toHaveBeenCalledWith("site_settings", "ai-features", { reply: false });
  });
  it("rejects a non-staff write before saving", async () => {
    mocks.staff.mockRejectedValue(new Error("Staff access required"));
    const invoke = setAiFeature as unknown as (arg: unknown) => Promise<unknown>;
    await expect(invoke({ data: { task: "finder", enabled: false }, context: { role: "user", userId: "customer" } })).rejects.toThrow("Staff access required");
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("defaults existing installations to enabled and rejects invalid updates", () => {
    expect(normalizeAiFeatures(null)).toEqual({ finder: true, question: true, description: true, reply: true });
    expect(aiFeatureUpdate.safeParse({ task: "unknown", enabled: false }).success).toBe(false);
    expect(aiFeatureUpdate.safeParse({ task: "finder", enabled: "false" }).success).toBe(false);
  });
});