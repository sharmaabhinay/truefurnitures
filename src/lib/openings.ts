import { COL, fsList, sortRows } from "@/lib/db/firestore";

export type JobOpening = {
  id: string;
  title: string;
  city: string;
  type: string;
  description: string;
  is_published: boolean;
  sort_order?: number;
  created_at?: string;
};

/** Shown until the admin publishes their own roles. */
export const FALLBACK_OPENINGS: JobOpening[] = [
  { id: "f1", title: "Master Upholsterer", city: "Indore", type: "Full-time", is_published: true, description: "Hand-cut, hand-stitch and hand-finish premium fabrics for our signature collections. 5+ years experience on high-end upholstery." },
  { id: "f2", title: "3D Design Consultant", city: "Indore & Ujjain", type: "Full-time", is_published: true, description: "Walk clients through our 3D configurator in-showroom. Design background preferred; hospitality mindset essential." },
  { id: "f3", title: "Delivery & Installation Lead", city: "Ujjain", type: "Full-time", is_published: true, description: "Own the last-mile white-glove experience for every Ujjain delivery. Team of 2, growing to 4." },
  { id: "f4", title: "Content & Community Lead", city: "Remote (India)", type: "Full-time", is_published: true, description: "Own our journal, Instagram and email programme. Strong writer with a taste for interiors." },
];

/** Published roles for the public /careers page. */
export async function fetchPublishedOpenings(): Promise<JobOpening[]> {
  const rows = await fsList<JobOpening>(COL.jobOpenings).catch(() => [] as JobOpening[]);
  const live = rows.filter((r) => r.is_published);
  return live.length ? sortRows(live, "sort_order") : FALLBACK_OPENINGS;
}
