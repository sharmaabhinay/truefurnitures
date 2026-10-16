import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Box } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

type GalleryImage = { src: string; label: string };

export function ProductGallery({ images, activeImage, setActiveImage, sofaName, sofaSlug, show3d }: {
  images: GalleryImage[];
  activeImage: number;
  setActiveImage: (index: number) => void;
  sofaName: string;
  sofaSlug: string;
  show3d: boolean;
}) {
  const [viewportRef, api] = useEmblaCarousel({ loop: true, duration: 25 });
  const [paused, setPaused] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const selected = Math.min(activeImage, Math.max(0, images.length - 1));
  const choose = useCallback((index: number) => {
    setInteracted(true);
    api?.scrollTo(index);
    setActiveImage(index);
  }, [api, setActiveImage]);

  useEffect(() => {
    if (!api) return;
    const sync = () => setActiveImage(api.selectedScrollSnap());
    const stopAutoplay = () => setInteracted(true);
    sync();
    api.on("select", sync);
    api.on("reInit", sync);
    api.on("pointerDown", stopAutoplay);
    return () => {
      api.off("select", sync);
      api.off("reInit", sync);
      api.off("pointerDown", stopAutoplay);
    };
  }, [api, setActiveImage]);

  useEffect(() => {
    if (!api || paused || interacted || images.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => api.scrollNext(), 4500);
    return () => window.clearInterval(timer);
  }, [api, paused, interacted, images.length]);

  if (!images.length) return null;
  return (
    <div className="min-w-0" role="region" aria-roledescription="carousel" aria-label={`${sofaName} photos`}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        choose((selected + (event.key === "ArrowRight" ? 1 : -1) + images.length) % images.length);
      }}>
      <div className="relative bg-muted mb-3 group">
        <div ref={viewportRef} className="overflow-hidden touch-pan-y pinch-zoom" data-product-photo-viewport>
          <div className="flex">
            {images.map((image, index) => (
              <div key={`${index}-${image.src}`} className="min-w-0 flex-[0_0_100%] aspect-[4/5]" role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${images.length}`} aria-hidden={selected !== index}>
                <img src={image.src} alt={`${sofaName} — ${image.label}`} width={1000} height={1250}
                  loading={index === 0 ? "eager" : "lazy"} decoding="async" draggable={false}
                  className="w-full h-full object-cover select-none" />
              </div>
            ))}
          </div>
        </div>
        {images.length > 1 && <>
          <Button variant="outline" size="icon" title="Previous image" aria-label="Previous image" onClick={() => choose((selected - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-none bg-background/90 backdrop-blur"><ChevronLeft /></Button>
          <Button variant="outline" size="icon" title="Next image" aria-label="Next image" onClick={() => choose((selected + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-none bg-background/90 backdrop-blur"><ChevronRight /></Button>
        </>}
        <span className="absolute bottom-3 left-3 max-w-[70%] px-3 py-2 bg-background/90 text-foreground text-xs backdrop-blur" aria-live="polite" aria-atomic="true">{images[selected]?.label} · {selected + 1} / {images.length}</span>
        {show3d && <Button asChild size="sm" className="absolute top-3 right-3 rounded-none"><Link to="/configure/$slug" params={{ slug: sofaSlug }}><Box />View in 3D</Link></Button>}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Photo thumbnails">
        {images.map((image, index) => (
          <Button key={`${index}-${image.src}`} variant="ghost" onClick={() => choose(index)} aria-label={`View ${image.label}`} aria-pressed={selected === index}
            className={`h-auto w-16 sm:w-20 shrink-0 aspect-square p-0 rounded-none overflow-hidden border-2 ${selected === index ? "border-primary" : "border-transparent hover:border-border"}`}>
            <img src={image.src} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          </Button>
        ))}
      </div>
    </div>
  );
}