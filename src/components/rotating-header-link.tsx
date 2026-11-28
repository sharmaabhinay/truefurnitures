import { useEffect, useState } from "react";
import { FiArrowUpRight } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { EditorialLink } from "@/components/editorial-link";
import { HEADER_ROTATION_MS, type NavigationItem } from "@/lib/site-navigation";

export function RotatingHeaderLink({ items }: { items: NavigationItem[] }) {
  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState<NavigationItem | null>(null);
  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(false);
  const current = items[index % Math.max(items.length, 1)];
  const identity = items.map(item => `${item.url}:${item.label}`).join("|");

  useEffect(() => {
    setIndex(0);
    setPrevious(null);
  }, [identity]);

  useEffect(() => {
    if (paused || focused || items.length < 2 || document.documentElement.dataset['tfVisualEditor'] === "true") return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setPrevious(current ?? null);
      setIndex(value => (value + 1) % items.length);
    }, HEADER_ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [current, items.length, paused, focused]);

  if (!current) return null;
  return (
    <div className="tf-header-rotator" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={() => setFocused(false)} onPointerDown={() => setPaused(true)} onPointerCancel={() => setPaused(false)} onPointerUp={() => setPaused(false)}>
      <Button asChild className="tf-header-rotating-button">
        <EditorialLink href={current.url} ariaLabel={current.label}>
          <span className="tf-header-label-window">
            {previous && <span key={`previous-${index}-${identity}`} aria-hidden="true" className="tf-header-label tf-header-label-out">{previous.label}</span>}
            <span key={`${index}-${identity}`} className={`tf-header-label ${previous ? "tf-header-label-in" : ""}`}>{current.label}</span>
          </span>
          <FiArrowUpRight aria-hidden="true" />
        </EditorialLink>
      </Button>
    </div>
  );
}