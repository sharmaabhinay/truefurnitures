import { useEffect, useRef, useState } from "react";
import sofaLivingRoom from "@/assets/sofa-living-room.mp4.asset.json";
import sofaLivingRoomPoster from "@/assets/sofa-living-room.jpg.asset.json";

export function VideoShowcase() {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stop = () => { if (reduced.matches) video.pause(); };
    stop();
    reduced.addEventListener("change", stop);
    return () => { reduced.removeEventListener("change", stop); video.pause(); };
  }, []);
  return (
    <section className="py-16 sm:py-24 px-6 md:px-10 max-w-7xl mx-auto">
      <div className="text-center mb-12 sm:mb-16">
        <span className="tf-chip mb-4">In Motion</span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-display mt-4 text-balance">Craft you can see, comfort you can feel.</h2>
      </div>
      {/* The clip is shown whole over a blurred copy of the same scene, so the frame is
          filled edge to edge without cropping the footage. */}
      <figure className="relative overflow-hidden bg-[color:var(--brand-muted)] aspect-video">
        <img src={sofaLivingRoomPoster.url} alt="" aria-hidden className={`absolute inset-0 h-full w-full object-cover ${failed ? "" : "scale-110 blur-2xl"}`} />
        {failed ? <img src={sofaLivingRoomPoster.url} alt="" aria-hidden className="absolute inset-0 h-full w-full object-contain" />
          : <video ref={ref} autoPlay loop muted playsInline preload="metadata" poster={sofaLivingRoomPoster.url} onError={() => setFailed(true)} className="relative h-full w-full object-contain">
              <source src={sofaLivingRoom.url} type="video/mp4" />
            </video>}
        <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--brand-dark)]/85 via-[color:var(--brand-dark)]/10 to-transparent" />
        <figcaption className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[color:var(--brand-accent)]">In Your Home</span>
          <p className="font-display text-xl sm:text-2xl mt-2 max-w-sm">Designed to live with you, not just in your room.</p>
        </figcaption>
      </figure>
    </section>
  );
}
