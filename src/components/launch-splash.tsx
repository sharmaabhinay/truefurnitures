import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { releaseSplashWhenReady } from "@/lib/splash-readiness";

/** First home visit only: readiness comes from actual page resources, not a fake progress timer. */
export function LaunchSplash() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const home = path === "/";

  useEffect(() => {
    if (!home) setVisible(false);
  }, [home]);

  useEffect(() => {
    if (!visible || !home) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [home, visible]);

  useEffect(() => {
    if (!home || !visible) return;
    let cancelled = false;
    const cleanups: Array<() => void> = [];
    const frame = () => new Promise<void>((resolve) => {
      const id = requestAnimationFrame(() => resolve());
      cleanups.push(() => cancelAnimationFrame(id));
    });
    const loaded = (target: HTMLImageElement) => new Promise<void>((resolve) => {
      const done = () => { remove(); resolve(); };
      const remove = () => {
        target.removeEventListener("load", done);
        target.removeEventListener("error", done);
      };
      target.addEventListener("load", done, { once: true });
      target.addEventListener("error", done, { once: true });
      cleanups.push(remove);
    });
    const ready = (async () => {
      // Wait for the first screen to commit, not background settings or window.load.
      await frame();
      await frame();
      if (cancelled) return;
      const hero = document.querySelector<HTMLImageElement>('img[fetchpriority="high"]');
      await Promise.all([
        document.fonts.ready,
        (async () => {
          if (!hero) return;
          if (!hero.complete) await loaded(hero);
          if (!cancelled && hero.naturalWidth > 0) await hero.decode().catch(() => {});
        })(),
      ]);
      await frame();
    })();
    const cancelRelease = releaseSplashWhenReady(ready, () => setLeaving(true));
    return () => { cancelled = true; cancelRelease(); cleanups.forEach((cleanup) => cleanup()); };
  }, [home, visible]);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setVisible(false), 200);
    return () => clearTimeout(timer);
  }, [leaving]);

  if (!visible || !home) return null;
  return (
    <div className={`tf-launch-splash ${leaving ? "tf-launch-splash--leaving" : ""}`} role="status" aria-live="polite" aria-label="Loading True Furniture's">
      <div className="tf-launch-identity">
        <div className="tf-launch-mark" aria-hidden="true">
          <img src="/favicon.png" alt="" width={80} height={80} className="tf-launch-logo" />
        </div>
        <p className="font-display text-3xl sm:text-4xl text-brand-dark">True Furniture’s</p>
        <div className="tf-launch-line" aria-hidden="true"><span /></div>
        <span className="sr-only">Preparing your visit</span>
      </div>
    </div>
  );
}