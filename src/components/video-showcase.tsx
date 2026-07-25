import sofaMalwa from "@/assets/sofa-malwa.jpg";
import sofaIvory from "@/assets/sofa-ivory.jpg";

const clips = [
  {
    src: "https://cdn.coverr.co/videos/coverr-a-modern-and-luxurious-living-room-1573/1080p.mp4",
    poster: sofaMalwa,
    caption: "The Making",
    title: "Hand-tied suspension, one knot at a time.",
  },
  {
    src: "https://cdn.coverr.co/videos/coverr-a-modern-luxurious-house-8321/1080p.mp4",
    poster: sofaIvory,
    caption: "In Your Home",
    title: "Designed to live with you, not just in your room.",
  },
];

export function VideoShowcase() {
  return (
    <section className="py-16 sm:py-24 px-6 md:px-10 max-w-7xl mx-auto">
      <div className="text-center mb-12 sm:mb-16">
        <span className="tf-chip mb-4">In Motion</span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-display mt-4 text-balance">Craft you can see, comfort you can feel.</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {clips.map((c) => (
          <figure key={c.title} className="relative group overflow-hidden bg-[color:var(--brand-muted)] aspect-[4/5] sm:aspect-[3/4]">
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              poster={c.poster}
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src={c.src} type="video/mp4" />
            </video>
            <img src={c.poster} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover -z-10" />
            <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--brand-dark)]/85 via-[color:var(--brand-dark)]/10 to-transparent" />
            <figcaption className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[color:var(--brand-accent)]">{c.caption}</span>
              <p className="font-display text-xl sm:text-2xl mt-2 max-w-sm">{c.title}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}