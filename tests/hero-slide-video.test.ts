import { describe, expect, it } from "vitest";
import { heroSlideVideo } from "../src/lib/hero-slide-video";

describe("homepage video placement", () => {
  it("shows the real-sofa showcase exclusively on the fourth slide", () => {
    expect([0, 1, 2, 3].map(index => heroSlideVideo(index, "", "sofa.mp4"))).toEqual(["", "", "", "sofa.mp4"]);
  });
  it("preserves the saved homepage video on the first slide", () => {
    expect(heroSlideVideo(0, "saved.mp4", "sofa.mp4")).toBe("saved.mp4");
    expect(heroSlideVideo(3, "saved.mp4", "sofa.mp4")).toBe("sofa.mp4");
  });
});