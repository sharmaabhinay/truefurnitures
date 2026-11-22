import { describe, expect, it } from "vitest";
import { eligibleHomeOrder, homeSubmissionInput, homeStory, imageBytes } from "../src/lib/real-homes";
describe("Real Homes submissions", () => {
  it("allows only the owner of a delivered order", () => {
    expect(eligibleHomeOrder({ user_id: "buyer", status: "delivered" }, "buyer")).toBe(true);
    expect(eligibleHomeOrder({ user_id: "another", status: "delivered" }, "buyer")).toBe(false);
    expect(eligibleHomeOrder({ user_id: "buyer", status: "in_production" }, "buyer")).toBe(false);
    expect(eligibleHomeOrder({ user_id: "buyer", status: "delivered", deleted_at: "2026-11-21" }, "buyer")).toBe(false);
  });
  it("requires locality and publication consent", () => {
    const input = { orderId: "order1", locality: "Vijay Nagar", caption: "Our living room", consent: true, images: ["data:image/jpeg;base64,/9j/"] };
    expect(homeSubmissionInput.safeParse(input).success).toBe(true);
    expect(homeSubmissionInput.safeParse({ ...input, consent: false }).success).toBe(false);
    expect(homeSubmissionInput.safeParse({ ...input, locality: "" }).success).toBe(false);
  });
  it("limits a submission to three photos", () => {
    expect(homeSubmissionInput.safeParse({ orderId: "order1", locality: "Indore", caption: "Home", consent: true, images: ["one","two","three","four"] }).success).toBe(false);
  });
  it("rejects disguised files before uploading", () => {
    expect(() => imageBytes("data:image/png;base64,SGVsbG8=")).toThrow("valid photo");
    expect(() => imageBytes("data:image/svg+xml;base64,SGVsbG8=")).toThrow("JPG");
  });
  it("never exposes ownership or moderation identities in public stories", () => {
    const result = homeStory({ id: "home1", user_id: "buyer", order_id: "secret", reviewed_by: "staff", locality: "Indore", images: ["https://res.cloudinary.com/photo", "javascript:bad"], caption: "Home", status: "approved" });
    expect(result.images).toHaveLength(1);
    expect(result).not.toHaveProperty("user_id"); expect(result).not.toHaveProperty("order_id"); expect(result).not.toHaveProperty("reviewed_by");
  });
});