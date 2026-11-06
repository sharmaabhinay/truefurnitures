import { useEffect, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FaWhatsapp } from "react-icons/fa";
import { useBrand } from "@/lib/brand";
import { logVisitor } from "@/lib/visitor-tracker";
import { CTA_SETTINGS_KEY, DEFAULT_CTA_SETTINGS, type CtaSettings } from "@/lib/cta-settings";
import { getCtaSettings } from "@/lib/cta-settings.functions";
import { whatsappEnquiryUrl } from "@/lib/cta-analytics";

/** Cycles: type a question in, hold, fade out to icon only, wait, next question. */
function useTypedQuestion(cfg: CtaSettings, active: boolean) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!active) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];
    let index = 0;
    let typer = 0;
    const later = (fn: () => void, ms: number) => { timers.push(window.setTimeout(fn, ms)); };
    const cycle = () => {
      const q = cfg.questions[index % cfg.questions.length];
      index++;
      setOpen(true);
      if (reduce) setText(q);
      else {
        let i = 0;
        setText("");
        typer = window.setInterval(() => { i++; setText(q.slice(0, i)); if (i >= q.length) window.clearInterval(typer); }, 45);
      }
      later(() => { window.clearInterval(typer); setOpen(false); }, cfg.showSeconds * 1000);
      later(cycle, Math.max(cfg.intervalSeconds, cfg.showSeconds + 1) * 1000);
    };
    later(cycle, cfg.initialDelaySeconds * 1000);
    return () => { timers.forEach(clearTimeout); window.clearInterval(typer); };
  }, [active, cfg]);
  return { text, open };
}

export function WhatsAppCta() {
  const { pathname } = useLocation();
  const brand = useBrand();
  const read = useServerFn(getCtaSettings);
  const { data } = useQuery({ queryKey: CTA_SETTINGS_KEY, queryFn: () => read(), staleTime: 60_000 });
  const cfg = data ?? DEFAULT_CTA_SETTINGS;
  const anchor = useRef<HTMLAnchorElement>(null);
  const hidden = !data || !cfg.enabled || /^\/(admin|auth|reset-password|configure|api)(\/|$)/.test(pathname);
  const href = whatsappEnquiryUrl(cfg.phone || brand.whatsapp || "", pathname, cfg.message);
  const { text, open } = useTypedQuestion(cfg, !hidden && !!href);

  useEffect(() => {
    const element = anchor.current;
    if (hidden || !href || !element) return;
    let recorded = false;
    const observer = new IntersectionObserver(entries => {
      if (recorded || !entries.some(e => e.isIntersecting)) return;
      recorded = true;
      try {
        const key = `tf_cta_seen:${pathname}`;
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
      } catch { /* Storage unavailable: keep the mounted-page guard. */ }
      logVisitor({ type: "cta_impression", page: pathname, item: "whatsapp_enquiry" });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [pathname, hidden, href]);

  if (hidden || !href) return null;
  return <div className="tf-whatsapp-position">
    <a ref={anchor} href={href} target="_blank" rel="noopener noreferrer"
      aria-label={`Chat on WhatsApp${text ? `: ${text}` : ""}`}
      className="tf-wa group" data-open={open}
      onClick={() => logVisitor({ type: "cta_click", page: pathname, item: "whatsapp_enquiry" })}>
      <span className="tf-wa-bubble" aria-hidden="true">
        <span className="tf-wa-text">{text}<span className="tf-wa-caret" /></span>
      </span>
      <span className="tf-wa-icon"><FaWhatsapp /></span>
    </a>
  </div>;
}
