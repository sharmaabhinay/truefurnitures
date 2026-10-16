import { useEffect, useRef } from "react";
import { Armchair, SwatchBook, ClipboardCheck, Hammer, BadgeCheck, House } from "lucide-react";
import showroom from "@/assets/showroom-indore.jpg";
import fabric from "@/assets/fabric-boucle.jpg";
import planning from "@/assets/journey/planning.jpg.asset.json";
import workshop from "@/assets/journey/workshop.jpg.asset.json";
import home from "@/assets/journey/home.jpg.asset.json";

const steps = [
  { title: "Meet your next sofa", phase: "Visit & discover", description: "Explore the collection online or visit the showroom in Indore or Ujjain. Find the silhouette and comfort that feel like you.", image: showroom, alt: "Sofas arranged in a showroom", icon: Armchair },
  { title: "Make every detail yours", phase: "Choose & customise", description: "Explore fabrics, colours and available sizes. Check physical samples and your room measurements with the team.", image: fabric, alt: "Close-up of textured upholstery fabric", icon: SwatchBook },
  { title: "Bring the plan together", phase: "Review & confirm", description: "Review your chosen model, specifications, quote and delivery details. Confirm your order when every detail is right.", image: planning.url, alt: "Writing down details in a notebook", icon: ClipboardCheck },
  { title: "From design to craftsmanship", phase: "Build & upholster", description: "Your confirmed specifications guide the making of your sofa, from the frame to the upholstery and finishing touches.", image: workshop.url, alt: "Craftsperson working with tools in a workshop", icon: Hammer },
  { title: "The final details matter", phase: "Check & coordinate", description: "The finished piece is checked against your order. Confirm the delivery arrangements and make sure the route into your home is ready.", image: workshop.url, alt: "Workshop tools used for furniture finishing", icon: BadgeCheck },
  { title: "Finally, home", phase: "Deliver & enjoy", description: "Receive your sofa, inspect the finish and settle it into its new space. A piece chosen by you, ready for everyday life.", image: home.url, alt: "A sofa in a bright furnished living room", icon: House },
];

export function CustomerJourney() {
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const items = section.querySelectorAll<HTMLElement>("[data-journey-step]");
    items.forEach((item) => item.classList.add("tf-journey-pending"));
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.remove("tf-journey-pending");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} aria-labelledby="customer-journey-heading" className="bg-background text-foreground border-t border-border py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-6 md:px-10">
        <div className="max-w-2xl mb-14 sm:mb-20">
          <p className="text-xs text-muted-foreground font-semibold mb-4">The True Furniture’s journey</p>
          <h2 id="customer-journey-heading" className="font-display text-3xl sm:text-5xl leading-tight mb-5">From a first visit<br />to your favourite corner.</h2>
          <p className="text-muted-foreground leading-relaxed">Your sofa, thoughtfully made. Here’s the path from finding your style to welcoming it home.</p>
        </div>
        <ol className="relative space-y-12 sm:space-y-20 before:absolute before:inset-y-0 before:left-5 md:before:left-1/2 before:w-px before:bg-border">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.phase} data-journey-step className="tf-journey-step relative pl-16 md:pl-0 md:grid md:grid-cols-[1fr_5rem_1fr] md:items-center">
                <span className="absolute left-0 top-0 md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 size-10 grid place-items-center bg-background border border-brand-accent text-brand-dark z-10 text-xs font-semibold">{String(index + 1).padStart(2, "0")}</span>
                <div className={`overflow-hidden aspect-[4/3] bg-muted ${index % 2 ? "md:col-start-3" : "md:col-start-1"}`}>
                  <img src={step.image} alt={step.alt} width={1000} height={750} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </div>
                <div className={`mt-6 md:mt-0 ${index % 2 ? "md:col-start-1 md:row-start-1 md:pr-6" : "md:col-start-3 md:pl-6"}`}>
                  <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-3"><Icon className="size-4 text-brand-accent" aria-hidden="true" />{step.phase}</p>
                  <h3 className="font-display text-2xl sm:text-3xl mb-4">{step.title}</h3>
                  <p className="text-sm sm:text-base leading-relaxed text-muted-foreground max-w-md">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-12 text-xs text-muted-foreground">Photographs illustrate the journey. Your order’s timing and delivery arrangements are confirmed individually.</p>
      </div>
    </section>
  );
}