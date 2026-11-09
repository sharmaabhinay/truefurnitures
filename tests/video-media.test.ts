import { describe, expect, it } from "vitest";
import { isDirectVideo, parseVideoSource } from "../src/lib/video-media";

describe("product and homepage media", () => {
  it("accepts direct video links for homepage backgrounds", () => {
    expect(isDirectVideo("https://media.example.com/sofa.mp4?version=2")).toBe(true);
    expect(isDirectVideo("https://youtu.be/abcdefghijk")).toBe(false);
  });
  it("converts YouTube vertical links to the intended player", () => {
    expect(parseVideoSource("https://www.youtube.com/shorts/abcdefghijk?feature=share")?.embedUrl).toBe("https://www.youtube-nocookie.com/embed/abcdefghijk?playsinline=1&rel=0");
  });
  it("converts Instagram reels without carrying arbitrary query options", () => {
    expect(parseVideoSource("https://www.instagram.com/reel/Abc_123/?igsh=test")?.embedUrl).toBe("https://www.instagram.com/reel/Abc_123/embed/");
  });
  it("rejects unsafe URLs and lookalike social hosts", () => {
    expect(parseVideoSource("javascript:alert(1)")).toBeNull();
    expect(parseVideoSource("https://youtube.com.attacker.com/shorts/abcdefghijk")).toBeNull();
    expect(parseVideoSource("http://example.com/sofa.mp4")).toBeNull();
  });
});