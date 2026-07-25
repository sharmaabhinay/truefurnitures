// Lightweight local visitor tracker (client-only). Records events to
// localStorage so the Admin Visitor Analytics panel can display them
// without requiring an analytics backend.

export type VisitorEvent = {
  type:
    | "session"
    | "visit"
    | "product_view"
    | "view_3d"
    | "add_to_cart"
    | "quote"
    | "newsletter";
  time: string;
  page?: string;
  item?: string;
  city?: string;
  ua?: string;
  screen?: string;
};

const KEY = "tf_visitors";
const MAX = 500;

export function getVisitors(): VisitorEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as VisitorEvent[]) : [];
  } catch {
    return [];
  }
}

export function logVisitor(evt: Omit<VisitorEvent, "time"> & { time?: string }) {
  if (typeof window === "undefined") return;
  try {
    const list = getVisitors();
    list.push({
      time: evt.time ?? new Date().toISOString(),
      type: evt.type,
      page: evt.page,
      item: evt.item,
      city: evt.city,
      ua: evt.ua ?? window.navigator.userAgent,
      screen: evt.screen ?? `${window.screen.width}×${window.screen.height}`,
    });
    if (list.length > MAX) list.splice(0, list.length - MAX);
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function clearVisitors() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function getDeviceIcon(ua = "") {
  const s = ua.toLowerCase();
  if (/mobi|iphone|android/.test(s)) return "📱";
  if (/ipad|tablet/.test(s)) return "📱";
  return "🖥️";
}

export function getBrowser(ua = "") {
  const s = ua.toLowerCase();
  if (s.includes("edg/")) return "Edge";
  if (s.includes("chrome/")) return "Chrome";
  if (s.includes("firefox/")) return "Firefox";
  if (s.includes("safari/")) return "Safari";
  return "Other";
}