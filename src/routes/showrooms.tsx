import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { COL, fsList, fsListSorted, orderBy } from "@/lib/db/firestore";
import showroomIndore from "@/assets/showroom-indore.jpg";
import showroomUjjain from "@/assets/showroom-ujjain.jpg";

type Showroom = {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string;
  hours?: string | null;
  phone?: string | null;
  is_flagship?: boolean;
};

const showroomsQuery = queryOptions({
  queryKey: ["showrooms"],
  queryFn: async (): Promise<Showroom[]> => {
    return fsListSorted<Showroom>(COL.showrooms, "sort_order", "asc");
  },
});

export const Route = createFileRoute("/showrooms")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Showrooms in Indore & Ujjain — Avant-Garde" },
      { name: "description", content: "Visit our flagship showroom in Indore or our studio in Ujjain. Experience every fabric, frame and finish in person." },
      { property: "og:title", content: "Showrooms — Indore & Ujjain" },
      { property: "og:description", content: "Visit the Avant-Garde showroom in Indore or the Ujjain studio." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(showroomsQuery),
  component: Showrooms,
});

const images: Record<string, string> = {
  "indore-flagship": showroomIndore,
  "ujjain-studio": showroomUjjain,
};

function Showrooms() {
  const { data: showrooms } = useSuspenseQuery(showroomsQuery);
  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] text-[color:var(--brand-dark)]">
      <SiteHeader />
      <section className="px-6 md:px-10 py-20 max-w-6xl mx-auto">
        <span className="text-[color:var(--brand-accent)] font-semibold tracking-[0.3em] uppercase text-xs">Showrooms</span>
        <h1 className="text-5xl md:text-6xl font-display mt-6 leading-[0.95] max-w-2xl">
          Come <span className="italic">sit</span>. Stay a while.
        </h1>
      </section>
      <section className="px-6 md:px-10 pb-24 max-w-6xl mx-auto grid md:grid-cols-2 gap-10">
        {showrooms.map((s) => (
          <article key={s.id} className="bg-white border border-[color:var(--brand-dark)]/5 overflow-hidden">
            <img src={images[s.slug] ?? showroomIndore} alt={`${s.name} interior`} loading="lazy" className="w-full aspect-[4/3] object-cover" />
            <div className="p-8 md:p-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="size-2 bg-[color:var(--brand-accent)] rounded-full"></span>
                <span className="text-[10px] font-black uppercase tracking-widest">{s.city} {s.is_flagship ? "Flagship" : "Studio"}</span>
              </div>
              <h2 className="text-3xl font-display">{s.name}</h2>
              <p className="mt-4 text-[color:var(--brand-dark)]/70 leading-relaxed">{s.address}</p>
              {s.hours && <p className="mt-3 text-sm text-[color:var(--brand-dark)]/50">{s.hours}</p>}
              {s.phone && <p className="mt-1 text-sm text-[color:var(--brand-dark)]/50">{s.phone}</p>}
            </div>
          </article>
        ))}
      </section>
      <SiteFooter />
    </div>
  );
}
