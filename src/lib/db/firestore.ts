import { getFirestore, type Firestore } from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase";

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