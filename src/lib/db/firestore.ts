import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type Firestore,
  type QueryConstraint,
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase";

export { where, orderBy, limit, startAfter, serverTimestamp } from "firebase/firestore";
export type { QueryConstraint } from "firebase/firestore";

let cached: Firestore | null = null;

/** Browser Firestore handle. Access is governed by firestore.rules. */
export function getDb(): Firestore {
  if (!cached) cached = getFirestore(getFirebaseApp());
  return cached;
}

/** Every collection the app stores in Firestore. */
export const COL = {
  profiles: "profiles",
  userRoles: "user_roles",
  userAddresses: "user_addresses",
  categories: "categories",
  sofas: "sofas",
  fabrics: "fabrics",
  colors: "colors",
  sizes: "sizes",
  addons: "addons",
  orders: "orders",
  orderStatusHistory: "order_status_history",
  paymentEvents: "payment_events",
  savedDesigns: "saved_designs",
  reviews: "reviews",
  coupons: "coupons",
  blogPosts: "blog_posts",
  showrooms: "showrooms",
  showroomBookings: "showroom_bookings",
  carpenterRequests: "carpenter_requests",
  newsletterSubscribers: "newsletter_subscribers",
  customerMessages: "customer_messages",
  customerAdminNotes: "customer_admin_notes",
  siteSettings: "site_settings",
  visitors: "visitors",
} as const;

export type CollectionName = (typeof COL)[keyof typeof COL];

function withId<T>(id: string, data: DocumentData): T {
  return { ...(data as object), id } as T;
}

/** Read a whole collection (optionally filtered/ordered). */
export async function fsList<T = DocumentData>(
  col: string,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  const snap = await getDocs(query(collection(getDb(), col), ...constraints));
  return snap.docs.map((d) => withId<T>(d.id, d.data()));
}

/** Read one document by id. */
export async function fsGet<T = DocumentData>(col: string, id: string): Promise<T | null> {
  if (!id) return null;
  const snap = await getDoc(doc(getDb(), col, id));
  return snap.exists() ? withId<T>(snap.id, snap.data()) : null;
}

/** Read the first document matching the constraints. */
export async function fsFindOne<T = DocumentData>(
  col: string,
  ...constraints: QueryConstraint[]
): Promise<T | null> {
  const rows = await fsList<T>(col, ...constraints);
  return rows[0] ?? null;
}

/** Create a document with a generated id; returns the new id. */
export async function fsAdd(col: string, data: DocumentData): Promise<string> {
  const ref = await addDoc(collection(getDb(), col), {
    ...data,
    created_at: data['created_at'] ?? new Date().toISOString(),
  });
  await updateDoc(ref, { id: ref.id });
  return ref.id;
}

/** Create or merge a document at a known id. */
export async function fsSet(
  col: string,
  id: string,
  data: DocumentData,
  merge = true,
): Promise<void> {
  await setDoc(doc(getDb(), col, id), { ...data, id }, { merge });
}

/** Patch an existing document. */
export async function fsUpdate(col: string, id: string, data: DocumentData): Promise<void> {
  await updateDoc(doc(getDb(), col, id), { ...data, updated_at: new Date().toISOString() });
}

/** Delete a document. */
export async function fsDelete(col: string, id: string): Promise<void> {
  await deleteDoc(doc(getDb(), col, id));
}

export { serverTimestamp as fsNow };

/**
 * Client-side sort. Firestore needs a composite index for `where` + `orderBy`
 * combinations, so filtered lists are sorted here instead.
 */
export function sortRows<T>(rows: T[], field: string, dir: "asc" | "desc" = "asc"): T[] {
  const sign = dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = (a as Record<string, unknown>)[field];
    const bv = (b as Record<string, unknown>)[field];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * sign;
    if (typeof av === "boolean" && typeof bv === "boolean") return (Number(av) - Number(bv)) * sign;
    return String(av).localeCompare(String(bv)) * sign;
  });
}