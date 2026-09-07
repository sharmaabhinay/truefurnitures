// Welcome-popup funnel tracking. Events are written to the shared `visitors`
// collection (public create, staff read) so the admin can measure how many
// people saw the popup versus how many actually subscribed.

import { COL, fsAdd, fsList } from "@/lib/db/firestore";

export type PopupEventType =
  | "popup_shown"
  | "popup_dismissed"
  | "popup_subscribed"
  | "popup_location_allowed"
  | "popup_location_denied";

export type PopupEvent = {
  id?: string;
  type: PopupEventType;
  time: string;
  created_at?: string;
  page?: string;
  city?: string;
  ua?: string;
  screen?: string;
  session?: string;
};

const SESSION_KEY = "tf_popup_session";

/** Stable id per browser session so we can count unique viewers. */
export function popupSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export async function logPopupEvent(
  type: PopupEventType,
  extra: { city?: string } = {},
): Promise<void> {
  if (typeof window === "undefined") return;
  const time = new Date().toISOString();
  try {
    await fsAdd(COL.visitors, {
      type,
      time,
      created_at: time,
      page: window.location.pathname,
      ua: window.navigator.userAgent,
      screen: `${window.screen.width}×${window.screen.height}`,
      session: popupSessionId(),
      ...(extra.city ? { city: extra.city } : {}),
    });
  } catch {
    /* analytics is best-effort */
  }
}

/** Staff-only read of all popup funnel events. */
export async function listPopupEvents(): Promise<PopupEvent[]> {
  const rows = await fsList<PopupEvent>(COL.visitors);
  return rows
    .filter((r) => typeof r.type === "string" && r.type.startsWith("popup_"))
    .sort((a, b) => (String(a.time) > String(b.time) ? -1 : 1));
}
