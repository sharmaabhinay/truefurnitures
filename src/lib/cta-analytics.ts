import type { VisitorEvent } from "./visitor-tracker";

export function whatsappEnquiryUrl(phone: string, page: string, intro = "Hello! I'd like help choosing a custom sofa."): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  const message = `${intro} I'm looking at: ${page}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function summarizeCta(events: VisitorEvent[], days: number, now = new Date()) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - days + 1);
  const rows = events.filter(e => ["cta_impression", "cta_click"].includes(e.type) &&
    Date.parse(e.time) >= start.getTime() && Date.parse(e.time) <= now.getTime());
  const views = rows.filter(e => e.type === "cta_impression");
  const clicks = rows.filter(e => e.type === "cta_click");
  const exposed = new Set(views.map(e => e.session).filter(Boolean));
  const clicked = new Set(clicks.map(e => e.session).filter(Boolean));
  const converted = [...clicked].filter(s => exposed.has(s)).length;
  const group = (key: (e: VisitorEvent) => string) => {
    const map = new Map<string, { name: string; impressions: number; clicks: number }>();
    for (const e of rows) {
      const name = key(e);
      const row = map.get(name) ?? { name, impressions: 0, clicks: 0 };
      if (e.type === "cta_click") row.clicks++; else row.impressions++;
      map.set(name, row);
    }
    return [...map.values()];
  };
  const daily = group(e => e.time.slice(0, 10));
  const trend = Array.from({ length: days }, (_, i) => {
    const date = new Date(start); date.setUTCDate(date.getUTCDate() + i);
    const name = date.toISOString().slice(0, 10);
    return daily.find(d => d.name === name) ?? { name, impressions: 0, clicks: 0 };
  });
  return { impressions: views.length, clicks: clicks.length, sessions: exposed.size,
    clickSessions: clicked.size, rate: exposed.size ? converted / exposed.size * 100 : 0,
    pages: group(e => e.page ?? "Unknown").sort((a, b) => b.clicks - a.clicks),
    devices: group(e => /mobi|android|iphone|ipad/i.test(e.ua ?? "") ? "Mobile / tablet" : "Desktop"),
    trend, recent: [...clicks].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 50) };
}