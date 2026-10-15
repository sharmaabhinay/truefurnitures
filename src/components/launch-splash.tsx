import { useEffect, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { brandQueryKey } from "@/lib/brand";
import { Button } from "@/components/ui/button";

/** First home visit only: readiness comes from actual page resources, not a fake progress timer. */
export function LaunchSplash() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const fetchingBrand = useIsFetching({ queryKey: brandQueryKey });
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [stalled, setStalled] = useState(false);
  const home = path === "/";

  useEffect(() => {
    if (!home) setVisible(false);
  }, [home]);

  useEffect(() => {
    if (!visible || !home) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => setStalled(true), 12000);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = previous;
    };
  }, [home, visible]);

  // Site settings come over a slow realtime channel; the page renders with defaults, so don't hold the splash for them.
  const [brandWaitOver, setBrandWaitOver] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setBrandWaitOver(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!home || !visible || (fetchingBrand > 0 && !brandWaitOver)) return;
    let cancelled = false;
    const cleanups: Array<() => void> = [];
    const frame = () => new Promise<void>((resolve) => {
      const id = requestAnimationFrame(() => resolve());
      cleanups.push(() => cancelAnimationFrame(id));
    });
    const loaded = (target: Window | HTMLImageElement) => new Promise<void>((resolve) => {
      const done = () => { remove(); resolve(); };
      const remove = () => {
        target.removeEventListener("load", done);
        target.removeEventListener("error", done);
      };
      target.addEventListener("load", done, { once: true });
      target.addEventListener("error", done, { once: true });
      cleanups.push(remove);
    });
    void (async () => {
      // Let CMS-driven image changes commit before collecting the eager images.
      await frame();
      await frame();
      if (cancelled) return;
      const pageLoad = document.readyState === "complete" ? Promise.resolve() : loaded(window);
      const images = Array.from(document.images).filter((image) => image.loading !== "lazy");
      await Promise.all([
        pageLoad,
        document.fonts.ready,
        ...images.map(async (image) => {
          if (!image.complete) await loaded(image);
          if (image.naturalWidth > 0) await image.decode().catch(() => {});
        }),
      ]);
      await frame();
      if (!cancelled) setLeaving(true);
    })();
    return () => { cancelled = true; cleanups.forEach((cleanup) => cleanup()); };
  }, [fetchingBrand, brandWaitOver, home, visible]);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setVisible(false), 400);
    return () => clearTimeout(timer);
  }, [leaving]);

  if (!visible || !home) return null;
  return (
    <div className={`tf-launch-splash ${leaving ? "tf-launch-splash--leaving" : ""}`} role="status" aria-live="polite" aria-label="Loading True Furniture's">
      <div className="tf-launch-identity">
        <div className="tf-launch-mark" aria-hidden="true">
          <span className="tf-launch-frame" />
          <img src="/favicon.png" alt="" width={80} height={80} className="tf-launch-logo" />
        </div>
        <p className="font-display text-3xl sm:text-4xl text-brand-dark">True Furniture’s</p>
        <div className="tf-launch-line" aria-hidden="true"><span /></div>
        <span className="sr-only">Preparing your visit</span>
        {stalled && <Button variant="ghost" size="sm" onClick={() => setLeaving(true)}>Continue to website</Button>}
      </div>
    </div>
  );
}