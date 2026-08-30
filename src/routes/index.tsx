import { createFileRoute, Link } from "@tanstack/react-router";
import { useFeatures } from "@/lib/brand";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroCarousel } from "@/components/hero-carousel";
import { VideoShowcase } from "@/components/video-showcase";
import { formatINR } from "@/lib/format";
import sofaMalwa from "@/assets/sofa-malwa.jpg";
import sofaUjjain from "@/assets/sofa-ujjain.jpg";
import sofaIndore from "@/assets/sofa-indore.jpg";
import fabricBoucle from "@/assets/fabric-boucle.jpg";
import fabricVelvet from "@/assets/fabric-velvet.jpg";
import fabricLinen from "@/assets/fabric-linen.jpg";
import fabricLeather from "@/assets/fabric-leather.jpg";
import showroomIndore from "@/assets/showroom-indore.jpg";
import showroomUjjain from "@/assets/showroom-ujjain.jpg";
import simulatorPreview from "@/assets/simulator-preview.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "True Furniture's — Fully Customizable Furniture | Indore & Ujjain" },
      { name: "description", content: "Fully customizable sofas designed in 3D. Choose fabric, colour, size and finish — hand-tailored in Indore & Ujjain." },
      { property: "og:title", content: "True Furniture's — Fully Customizable Furniture | Indore & Ujjain" },
      { property: "og:description", content: "Fully customizable sofas designed in 3D. Choose fabric, colour, size and finish — hand-tailored in Indore & Ujjain." },
    ],
  }),
  component: Home,
});

const featured = [
  { slug: "malwa-modular" as const, name: "The Malwa Modular", tagline: "Infinite Configurations", price: 68000, image: sofaMalwa },
  { slug: "ujjain-arch" as const, name: "Ujjain Arch Settee", tagline: "Solid Teak Frame", price: 82000, image: sofaUjjain },
  { slug: "indore-slimline" as const, name: "The Indore Slim-Line", tagline: "Top Grain Leather", price: 145000, image: sofaIndore },
];

const fabrics = [
  { name: "Bouclé", image: fabricBoucle },
  { name: "Velvet", image: fabricVelvet },
  { name: "Linen", image: fabricLinen },
  { name: "Leather", image: fabricLeather },
];

function Home() {
  const features = useFeatures();
  return (
    <div className="bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)]">
      <SiteHeader />

      <HeroCarousel />

      {/* FEATURED COLLECTION */}
      <section className="py-16 sm:py-24 px-6 md:px-10 max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-end gap-6 mb-10 sm:mb-16">
          <div>
            <span className="tf-chip mb-3">Signature Silhouettes</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display mt-3">Priced honestly, built once.</h2>
            <p className="text-[color:var(--brand-dark)]/50 mt-2">Available for full material customization.</p>
          </div>
          <Link to="/collections" className="text-xs font-bold uppercase tracking-widest border-b border-[color:var(--brand-dark)] pb-1">
            Explore All
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10 md:gap-12">
          {featured.map((s, i) => (
            <Link key={s.slug} to="/products/$slug" params={{ slug: s.slug }} className={`group cursor-pointer block hover-lift animate-fade-up`} style={{ animationDelay: `${(i + 1) * 100}ms` }}>
              <div className="aspect-[4/5] bg-[color:var(--brand-muted)] mb-6 overflow-hidden">
                <img src={s.image} alt={s.name} loading="lazy" width={1000} height={1200} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-display">{s.name}</h3>
                  <p className="text-[10px] uppercase tracking-widest text-[color:var(--brand-dark)]/40 mt-1">{s.tagline}</p>
                </div>
                <span className="text-sm font-medium whitespace-nowrap">{formatINR(s.price)}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <VideoShowcase />

      {/* 3D CTA */}
      {features.design3d && (
      <section className="bg-[color:var(--brand-dark)] py-16 sm:py-24 text-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 md:px-10 grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <div className="relative">
            <div className="absolute -left-6 -top-14 text-[8rem] md:text-[10rem] font-display text-white/5 pointer-events-none select-none leading-none">3D</div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display mb-6 leading-tight relative">
              The Digital <br />Atelier Experience
            </h2>
            <p className="text-white/60 mb-8 leading-relaxed">
              Visualize your masterpiece before a single piece of wood is cut. Choose from premium fabrics, adjust dimensions, and reserve with a small deposit.
            </p>
            <ul className="space-y-4 mb-10">
              <li className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-[color:var(--brand-accent)]">
                <div className="w-4 h-px bg-[color:var(--brand-accent)]"></div> Real-time 3D Rendering
              </li>
              <li className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
                <div className="w-4 h-px bg-white/30"></div> Live Material &amp; Colour Swap
              </li>
              <li className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
                <div className="w-4 h-px bg-white/30"></div> Instant Price Quote
              </li>
            </ul>
            <Link to="/design" className="inline-block px-10 py-5 bg-[color:var(--brand-accent)] text-[color:var(--brand-dark)] text-xs font-black uppercase tracking-[0.2em] hover:bg-white transition-colors">
              Open Creator
            </Link>
          </div>
          <div className="relative aspect-square">
            <img src={simulatorPreview} alt="3D sofa wireframe preview" loading="lazy" width={800} height={800} className="w-full h-full object-cover border border-white/10" />
          </div>
        </div>
      </section>
      )}


      {/* MATERIALS */}
      <section className="py-16 sm:py-24 px-6 md:px-10 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display mb-4">Tactile Excellence</h2>
          <p className="text-[color:var(--brand-dark)]/60 uppercase text-[10px] tracking-[0.3em]">Sourced globally, crafted locally</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {fabrics.map((f) => (
            <div key={f.name} className="relative aspect-square group overflow-hidden">
              <img src={f.image} alt={`${f.name} fabric swatch`} loading="lazy" width={800} height={800} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-[color:var(--brand-dark)]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-bold tracking-widest uppercase">{f.name}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SHOWROOMS */}
      <section className="py-16 sm:py-24 bg-[color:var(--brand-muted)]/30 border-t border-[color:var(--brand-dark)]/5">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16">
            <div className="space-y-8">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-display">
                Visit the <br /><span className="italic">Showrooms</span>
              </h2>
              <p className="text-[color:var(--brand-dark)]/60 font-light">
                Experience the comfort in person. Our design consultants are available for private walkthroughs.
              </p>
              <div className="space-y-10">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="size-2 bg-[color:var(--brand-accent)] rounded-full"></span> Indore Flagship
                  </h4>
                  <p className="text-lg font-display">Scheme No. 54, Vijay Nagar</p>
                  <p className="text-sm text-[color:var(--brand-dark)]/50 mt-1">Mon–Sat: 10:00 AM – 8:00 PM</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="size-2 bg-[color:var(--brand-accent)] rounded-full"></span> Ujjain Studio
                  </h4>
                  <p className="text-lg font-display">Nanakheda, Near Mahakal Marg</p>
                  <p className="text-sm text-[color:var(--brand-dark)]/50 mt-1">By Appointment Only</p>
                </div>
              </div>
              <Link to="/showrooms" className="inline-block text-xs font-bold uppercase tracking-widest border-b border-[color:var(--brand-dark)] pb-1">
                Book a Visit
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <img src={showroomIndore} alt="Indore showroom interior" loading="lazy" width={600} height={800} className="w-full h-full object-cover" />
              <img src={showroomUjjain} alt="Ujjain studio interior" loading="lazy" width={600} height={800} className="w-full h-full object-cover mt-8" />
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="py-16 sm:py-24 px-6 md:px-10 bg-[color:var(--brand-cream)]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center gap-1 mb-8">
            <span className="text-[color:var(--brand-accent)] text-xl">★★★★★</span>
          </div>
          <blockquote className="text-xl sm:text-2xl md:text-3xl font-display leading-relaxed mb-8 italic text-balance">
            &ldquo;The ability to customize every dimension was the deciding factor for our Ujjain bungalow. The finish is impeccable, and the service was world-class.&rdquo;
          </blockquote>
          <p className="font-bold uppercase tracking-widest text-[10px]">Ananya Singh — Indore</p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
