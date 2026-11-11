import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useBrand } from "@/lib/brand";
import heroSofa from "@/assets/hero-sofa.jpg";
import sofaEmerald from "@/assets/sofa-emerald.jpg";
import sofaIvory from "@/assets/sofa-ivory.jpg";
import { HeroVideo } from "@/components/hero-video";
import { isDirectVideo } from "@/lib/video-media";
import { Button } from "@/components/ui/button";
import showcaseVideo from "@/assets/sofa-living-room.mp4.asset.json";
import showcasePoster from "@/assets/sofa-living-room.jpg.asset.json";
import { heroSlideVideo } from "@/lib/hero-slide-video";

const slides = [
  {
    image: heroSofa,
    eyebrow: "Fully Customizable Furniture · Indore & Ujjain",
    title: "Every Inch,",
    italic: "Yours to Design.",
    body: "Bespoke sofas — fabric, colour, size, legs, add-ons. Every stitch, every curve, strictly by your rules.",
    cta: "Start 3D Design",
    to: "/design" as const,
  },
  {
    image: sofaEmerald,
    eyebrow: "The Emerald Chesterfield",
    title: "Hand-Tufted",
    italic: "Velvet Craft.",
    body: "Twelve jewel-tone velvets. Hand-tied diamond buttoning. A British classic, reworked in Central India.",
    cta: "View Piece",
    to: "/products/$slug" as const,
    params: { slug: "emerald-chesterfield" },
  },
  {
    image: sofaIvory,
    eyebrow: "The Ivory Curve",
    title: "Sculptural",
    italic: "Organic Modern.",
    body: "A continuous bouclé silhouette. No visible legs. Enough sink to never want to get up.",
    cta: "View Piece",
    to: "/products/$slug" as const,
    params: { slug: "ivory-curve" },
  },
  {
    image: showcasePoster.url,
    eyebrow: "Living Room Inspiration",
    title: "Room to",
    italic: "Make It Yours.",
    body: "Explore sofa styles, fabrics and colours for your space.",
    cta: "Start 3D Design",
    to: "/design" as const,
  },
];

export function HeroCarousel() {
  const [i, setI] = useState(0);
  const brand = useBrand();
  const [screen, setScreen] = useState<"desktop" | "tablet" | "mobile">("desktop");
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)");
    const tablet = window.matchMedia("(max-width: 1023px)");
    const update = () => setScreen(mobile.matches ? "mobile" : tablet.matches ? "tablet" : "desktop");
    update();
    mobile.addEventListener("change", update); tablet.addEventListener("change", update);
    return () => { mobile.removeEventListener("change", update); tablet.removeEventListener("change", update); };
  }, []);
  const ok = (v?: string) => (v && isDirectVideo(v) ? v : "");
  const configuredVideo = screen === "mobile"
    ? ok(brand.hero_video_mobile) || ok(brand.hero_video_tablet) || ok(brand.hero_video)
    : screen === "tablet" ? ok(brand.hero_video_tablet) || ok(brand.hero_video) : ok(brand.hero_video);
  useEffect(() => {
    const t = setTimeout(() => setI((v) => (v + 1) % slides.length), i === 3 ? 14000 : 6500);
    return () => clearTimeout(t);
  }, [i]);
  const video = heroSlideVideo(i, configuredVideo, showcaseVideo.url);
  const base = slides[i];
  // The first slide is CMS-driven so admin edits show up on the live site.
  const s =
    i === 0
      ? {
          ...base,
          image: brand.hero_image || base.image,
          eyebrow: brand.hero_badge || base.eyebrow,
          title: brand.hero_headline || base.title,
          italic: brand.hero_italic || base.italic,
          body: brand.hero_subtext || base.body,
          cta: brand.hero_cta || base.cta,
        }
      : base;

  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-[color:var(--brand-cream)]">
      {/* background image */}
      <div key={i} className="absolute inset-0">
        {video ? <HeroVideo key={video} url={video} poster={s.image} /> : <img src={s.image} alt="" aria-hidden fetchPriority={i === 0 ? "high" : "auto"} decoding="async" className="w-full h-full object-cover animate-kenburns" />}
        <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--brand-cream)] via-[color:var(--brand-cream)]/70 md:via-[color:var(--brand-cream)]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--brand-cream)]/60 via-transparent to-transparent md:hidden" />
      </div>

      <div key={`c-${i}`} className="relative z-10 max-w-2xl px-6 md:px-20 py-16 sm:py-24 animate-slide-in">
        <span className="text-[color:var(--brand-accent)] font-semibold tracking-[0.3em] uppercase text-[10px] sm:text-xs block mb-5 sm:mb-6">
          {s.eyebrow}
        </span>
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-display leading-[0.95] mb-6 sm:mb-8 text-balance">
          {s.title} <br className="hidden sm:block" />
          <span className="italic font-normal">{s.italic}</span>
        </h1>
        <p className="text-base sm:text-lg text-[color:var(--brand-dark)]/70 mb-8 sm:mb-10 max-w-md font-light leading-relaxed">
          {s.body}
        </p>
        <div className="flex flex-wrap gap-3 sm:gap-4">
          {"params" in s && s.params ? (
            <Link to="/products/$slug" params={s.params} className="px-6 sm:px-8 py-4 bg-[color:var(--brand-dark)] text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors">
              {s.cta}
            </Link>
          ) : (
            <Link to="/design" className="px-6 sm:px-8 py-4 bg-[color:var(--brand-dark)] text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors">
              {s.cta}
            </Link>
          )}
          <Link to="/collections" className="px-6 sm:px-8 py-4 border border-[color:var(--brand-dark)]/20 text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:bg-[color:var(--brand-dark)] hover:text-white transition-all">
            View Catalog
          </Link>
        </div>
      </div>

      {/* dots */}
      <div className="absolute bottom-6 sm:bottom-10 left-6 md:left-20 z-10 flex gap-2">
        {slides.map((_, idx) => (
          <Button
            type="button"
            variant="ghost"
            key={idx}
            aria-label={`Slide ${idx + 1}`}
            aria-current={i === idx ? "true" : undefined}
            onClick={() => setI(idx)}
            className={`h-1 min-h-0 rounded-none p-0 transition-all ${i === idx ? "w-10 bg-[color:var(--brand-dark)]" : "w-5 bg-[color:var(--brand-dark)]/25"}`}
          />
        ))}
      </div>
    </section>
  );
}