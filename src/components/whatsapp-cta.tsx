import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import { FaWhatsapp } from "react-icons/fa";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrand } from "@/lib/brand";
import { logVisitor } from "@/lib/visitor-tracker";
import { whatsappEnquiryUrl } from "@/lib/cta-analytics";

export function WhatsAppCta() {
  const { pathname } = useLocation();
  const brand = useBrand();
  const anchor = useRef<HTMLAnchorElement>(null);
  const hidden = /^\/(admin|auth|reset-password|configure|api)(\/|$)/.test(pathname);
  const href = whatsappEnquiryUrl(brand.whatsapp, pathname);
  useEffect(() => {
    const element = anchor.current;
    if (hidden || !href || !element) return;
    let recorded = false;
    const observer = new IntersectionObserver(entries => {
      if (recorded || !entries.some(e => e.isIntersecting)) return;
      recorded = true;
      // One exposure per page per session; re-renders never inflate the count.
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
    <Button asChild variant="whatsapp" className="tf-whatsapp-button h-12 px-4">
      <a ref={anchor} href={href} target="_blank" rel="noopener noreferrer" aria-label="Enquire on WhatsApp"
        onClick={() => logVisitor({ type: "cta_click", page: pathname, item: "whatsapp_enquiry" })}>
        <FaWhatsapp className="tf-whatsapp-icon" /><span>Let’s talk sofas</span><ArrowUpRight />
      </a>
    </Button>
  </div>;
}