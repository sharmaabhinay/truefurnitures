import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Thin gilded loading bar fixed to the very top of the viewport.
 * Appears the instant a route transition goes "pending" (button clicked →
 * next page loading) and completes with a snap-to-full + fade when it resolves.
 */
export function NavigationProgress() {
  const status = useRouterState({ select: (s) => s.status });
  const isLoading = status === "pending";

  // 0 = hidden, 1..99 = indeterminate creep, 100 = complete (then fade)
  const [pct, setPct] = useState(0);
  const [visible, setVisible] = useState(false);
  const creep = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start the bar when a transition begins.
  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      setPct(12); // quick initial pop so the click feels acknowledged
      if (creep.current) clearInterval(creep.current);
      creep.current = setInterval(() => {
        setPct((p) => {
          // ease toward ~90% with diminishing steps — never reaches 100 here
          const next = p + Math.max(0.5, (90 - p) * 0.08);
          return next >= 90 ? 90 : next;
        });
      }, 180);
    } else {
      // transition resolved — finish the bar
      if (creep.current) clearInterval(creep.current);
      creep.current = null;
      setPct((p) => (p > 0 ? 100 : 0));
      // let the 100% state paint, then hide
      const t = setTimeout(() => {
        setVisible(false);
        setPct(0);
      }, 380);
      return () => clearTimeout(t);
    }
    return () => {
      if (creep.current) clearInterval(creep.current);
    };
  }, [isLoading]);

  if (!visible && pct === 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 9999,
        pointerEvents: "none",
        background: "transparent",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: "var(--brand-accent, #C5A47E)",
          boxShadow: "0 0 8px 0 color-mix(in oklab, var(--brand-accent, #C5A47E) 60%, transparent)",
          opacity: pct === 100 ? 0 : 1,
          transition: pct === 100
            ? "width 0.18s ease-out, opacity 0.3s ease-out 0.08s"
            : "width 0.25s ease-out, opacity 0.2s ease-out",
        }}
      />
    </div>
  );
}
