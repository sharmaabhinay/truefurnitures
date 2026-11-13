import { afterEach, describe, expect, it, vi } from "vitest";
import { releaseSplashWhenReady } from "../src/lib/splash-readiness";

afterEach(() => vi.useRealTimers());

describe("splash readiness", () => {
  it("releases after 1800ms even if resources never finish", () => {
    vi.useFakeTimers();
    const release = vi.fn();
    releaseSplashWhenReady(new Promise(() => {}), release);
    vi.advanceTimersByTime(1799);
    expect(release).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("releases immediately when the first-screen resources are ready", async () => {
    vi.useFakeTimers();
    const release = vi.fn();
    releaseSplashWhenReady(Promise.resolve(), release);
    await Promise.resolve();
    expect(release).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1800);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("does not release after leaving the page", async () => {
    vi.useFakeTimers();
    const release = vi.fn();
    const cancel = releaseSplashWhenReady(Promise.resolve(), release);
    cancel();
    await Promise.resolve();
    vi.advanceTimersByTime(1800);
    expect(release).not.toHaveBeenCalled();
  });
});