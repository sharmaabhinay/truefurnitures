export type AnalyticsRow = Record<string, unknown>;
export type AnalyticsRange = "7d" | "30d" | "12m";
export type AnalyticsPoint = { label: string; views: number; carts: number; orders: number; revenue: number };

const text = (value: unknown) => String(value ?? "").trim();
const object = (value: unknown): AnalyticsRow => value && typeof value === "object" ? value as AnalyticsRow : {};

/** One identity policy for events, saved cart lines, and order snapshots. */
export function matchesProduct(row: AnalyticsRow, id: string, slug: string, name: string): boolean {
  const snapshot = object(row["sofa_snapshot"]);
  const ids = [row["sofaId"], row["sofa_id"], row["productId"], row["product_id"], snapshot["id"]].map(text).filter(Boolean);
  if (ids.length) return ids.includes(id);
  const slugs = [row["slug"], row["sofa_slug"], row["product_slug"], snapshot["slug"]].map(v => text(v).toLowerCase()).filter(Boolean);
  if (slugs.length) return !!slug && slugs.includes(slug.toLowerCase());
  const names = [row["item"], row["name"], row["product_name"], snapshot["name"]].map(v => text(v).toLowerCase()).filter(Boolean);
  return !!name && names.includes(name.toLowerCase());
}

export function analyticsWindow(range: AnalyticsRange, now: Date) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  if (range === "12m") start.setUTCMonth(start.getUTCMonth() - 11, 1);
  else start.setUTCDate(start.getUTCDate() - (range === "7d" ? 6 : 29));
  const count = range === "12m" ? 12 : range === "7d" ? 7 : 30;
  const labels = Array.from({ length: count }, (_, i) => {
    const date = new Date(start);
    if (range === "12m") date.setUTCMonth(start.getUTCMonth() + i);
    else date.setUTCDate(start.getUTCDate() + i);
    return date.toISOString().slice(0, range === "12m" ? 7 : 10);
  });
  return { start, labels };
}

export function aggregateProductAnalytics(product: AnalyticsRow & { id: string }, events: AnalyticsRow[], orders: AnalyticsRow[], carts: AnalyticsRow[], range: AnalyticsRange, now = new Date()) {
  const id = product.id, slug = text(product["slug"]), name = text(product["name"]) || "Product";
  const matches = (row: AnalyticsRow) => matchesProduct(row, id, slug, name);
  const { start, labels } = analyticsWindow(range, now);
  const inRange = (value: unknown) => {
    const time = Date.parse(text(value));
    return Number.isFinite(time) && time >= start.getTime() && time <= now.getTime();
  };
  const eventTime = (row: AnalyticsRow) => text(row["time"] ?? row["created_at"]);
  const rangedEvents = events.filter(e => !e["deleted_at"] && matches(e) && inRange(eventTime(e)));
  const series: AnalyticsPoint[] = labels.map(label => ({ label, views: 0, carts: 0, orders: 0, revenue: 0 }));
  const bucket = (time: string) => series.find(p => p.label === new Date(time).toISOString().slice(0, range === "12m" ? 7 : 10));
  const viewSessions = new Set<string>(), cartSessions = new Set<string>();
  const devices = new Map<string, number>(), browsers = new Map<string, number>(), cities = new Map<string, number>(), pages = new Map<string, number>();
  const add = (map: Map<string, number>, key: string) => { if (key) map.set(key, (map.get(key) ?? 0) + 1); };
  for (const event of rangedEvents) {
    const type = text(event["type"]), session = text(event["session"]), point = bucket(eventTime(event));
    if (type === "product_view") {
      if (session) viewSessions.add(session);
      if (point) point.views++;
      const ua = text(event["ua"]).toLowerCase();
      add(devices, !ua ? "Unknown" : /ipad|tablet/.test(ua) ? "Tablet" : /mobi|iphone|android/.test(ua) ? "Mobile" : "Desktop");
      add(browsers, !ua ? "Unknown" : ua.includes("edg/") ? "Edge" : ua.includes("chrome/") ? "Chrome" : ua.includes("firefox/") ? "Firefox" : ua.includes("safari/") ? "Safari" : "Other");
      add(cities, text(event["city"])); add(pages, text(event["page"]));
    }
    if (type === "add_to_cart") { if (session) cartSessions.add(session); if (point) point.carts++; }
  }
  const validOrders = orders.filter(o => !o["deleted_at"] && !["cancelled", "refunded"].includes(text(o["status"])) && matches(o) && inRange(o["created_at"]));
  const checkoutIds = new Set<string>(), orderedViewSessions = new Set<string>(), orderedCartSessions = new Set<string>();
  let revenue = 0;
  for (const order of validOrders) {
    const key = text(order["checkout_id"]) || text(order["id"]);
    const point = bucket(text(order["created_at"]));
    if (!checkoutIds.has(key)) { checkoutIds.add(key); if (point) point.orders++; }
    const total = Number(order["total"]) || 0;
    revenue += total; if (point) point.revenue += total;
    const session = text(order["checkout_session"]);
    if (session && viewSessions.has(session)) orderedViewSessions.add(session);
    if (session && cartSessions.has(session)) orderedCartSessions.add(session);
  }
  let activeCarts = 0, cartUnits = 0;
  for (const cart of carts) {
    if (cart["deleted_at"]) continue;
    const items = Array.isArray(cart["items"]) ? cart["items"] : [];
    const units = items.filter(item => matches(object(item))).reduce((sum, item) => sum + Math.max(0, Number(object(item)["quantity"]) || 0), 0);
    if (units > 0) { activeCarts++; cartUnits += units; }
  }
  const countType = (type: string) => rangedEvents.filter(e => e["type"] === type).length;
  const rate = (a: number, b: number) => b ? Math.round(a / b * 1000) / 10 : 0;
  const top = (map: Map<string, number>) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  return {
    product: { id, name, slug, hero_image: typeof product["hero_image"] === "string" ? product["hero_image"] : null }, range,
    updatedAt: now.toISOString(), period: { from: start.toISOString(), to: now.toISOString() },
    totals: { impressions: countType("impression"), views: countType("product_view"), views3d: countType("view_3d"), addToCart: countType("add_to_cart"), activeCarts, cartUnits, orders: checkoutIds.size, revenue, uniqueViewers: viewSessions.size, cartSessions: cartSessions.size },
    conversion: { viewToCart: rate([...cartSessions].filter(s => viewSessions.has(s)).length, viewSessions.size), cartToOrder: rate(orderedCartSessions.size, cartSessions.size), viewToOrder: rate(orderedViewSessions.size, viewSessions.size) },
    attribution: { orderedCartSessions: orderedCartSessions.size, orderedViewSessions: orderedViewSessions.size },
    series, devices: top(devices), browsers: top(browsers), cities: top(cities), pages: top(pages),
    recent: [...rangedEvents].sort((a, b) => eventTime(b).localeCompare(eventTime(a))).slice(0, 12).map(e => ({ type: text(e["type"]), time: eventTime(e), page: text(e["page"]), city: text(e["city"]), ua: text(e["ua"]) })),
  };
}