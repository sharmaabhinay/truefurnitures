import { describe, expect, it } from "vitest";
import { catalogueForRoom, groundRoomResult, validateRoomPhoto, ROOM_PHOTO_MAX } from "../src/lib/room-advisor";

const sofa = { slug: "real-sofa", name: "Recorded sofa", is_published: true, base_price: 60000, product_options: { fabrics: [{ name: "Linen" }], colours: [{ label: "Ivory" }], sizes: [{ label: "Three seats" }] } };
const match = { slug: "real-sofa", reason: "Matches the room", fabric: "Linen", colour: "Ivory", size: "Three seats" };
const output = { summary: "Room styling", matches: [match], cautions: ["Measure before ordering"] };

describe("Room-photo catalogue safeguards", () => {
  it("includes only live published products with recorded positive prices", () => {
    expect(catalogueForRoom([sofa, { ...sofa, is_published: false }, { ...sofa, status: "draft" }, { ...sofa, deleted_at: "2026-11-08" }, { ...sofa, base_price: 0 }]).map(p => p.slug)).toEqual(["real-sofa"]);
  });
  it("returns recorded product identity, price and customization", () => {
    const result = groundRoomResult(output, catalogueForRoom([sofa]));
    expect(result.matches[0]?.product.base_price).toBe(60000);
    expect(result.matches[0]?.fabric).toBe("Linen");
  });
  it("rejects sofas outside the catalogue", () => {
    expect(() => groundRoomResult({ ...output, matches: [{ ...match, slug: "invented" }] }, catalogueForRoom([sofa]))).toThrow("unverified sofa");
  });
  it("rejects unrecorded customization", () => {
    expect(() => groundRoomResult({ ...output, matches: [{ ...match, fabric: "Invented fabric" }] }, catalogueForRoom([sofa]))).toThrow("unavailable customization");
  });
  it("rejects duplicate or more than three matches", () => {
    expect(() => groundRoomResult({ ...output, matches: [match, match] }, catalogueForRoom([sofa]))).toThrow("unverified sofa");
    expect(() => groundRoomResult({ ...output, matches: [match, match, match, match] }, catalogueForRoom([sofa]))).toThrow("too many");
  });
  it("accepts JPEG photos and rejects falsely declared image types", () => {
    expect(() => validateRoomPhoto("image/jpeg", new Uint8Array([255, 216, 255, 0]))).not.toThrow();
    expect(() => validateRoomPhoto("image/png", new Uint8Array([255, 216, 255, 0]))).toThrow("not a valid");
  });
  it("rejects photos over five megabytes", () => {
    expect(ROOM_PHOTO_MAX).toBe(5 * 1024 * 1024);
    expect(() => validateRoomPhoto("image/jpeg", new Uint8Array(ROOM_PHOTO_MAX + 1))).toThrow("up to 5 MB");
  });
});