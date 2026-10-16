import { Link } from "@tanstack/react-router";
import { Plus, ArrowUpRight } from "lucide-react";
import { customerFaqs } from "@/lib/customer-faqs";
import { Button } from "@/components/ui/button";

export function CustomerFaqs() {
  return (
    <section aria-labelledby="customer-faq-heading" className="border-t border-border bg-background text-foreground py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-6 md:px-10 grid lg:grid-cols-[1fr_1.5fr] gap-10 lg:gap-20">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-4">Before you make it yours</p>
          <h2 id="customer-faq-heading" className="font-display text-3xl sm:text-4xl mb-6">A little clarity.<br />A lot of confidence.</h2>
          <Button asChild variant="link" className="px-0"><Link to="/faq">All your questions <ArrowUpRight /></Link></Button>
        </div>
        <div className="border-t border-border divide-y divide-border">
          {customerFaqs.map((faq) => (
            <details key={faq.q} className="group py-5">
              <summary className="flex items-start justify-between gap-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <span className="text-base font-medium">{faq.q}</span>
                <Plus aria-hidden="true" className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-45 motion-reduce:transition-none" />
              </summary>
              <p className="text-sm text-muted-foreground leading-relaxed mt-4 pr-5">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}