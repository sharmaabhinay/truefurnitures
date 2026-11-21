import { Check, Package, ImageIcon } from "lucide-react";
import { formatDate, STATUS_META } from "@/lib/format";
import type { TrackedOrder } from "@/lib/order-tracking";

function date(value: string) { return value && !Number.isNaN(Date.parse(value)) ? formatDate(value) : ""; }
export function OrderTrackingCard({ order }: { order: TrackedOrder }) {
  return <article className="border-t border-border py-8 space-y-6">
    <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-display text-2xl flex items-center gap-3"><Package />{order.orderNumber}</h2><p className="text-sm text-muted-foreground mt-2">{STATUS_META[order.status]?.label ?? order.status}</p></div>{date(order.expectedDelivery) && <p className="text-sm">Expected delivery · {date(order.expectedDelivery)}</p>}</div>
    <ol aria-label={`Timeline for ${order.orderNumber}`} className="grid gap-0 md:grid-cols-7">
      {order.steps.map(step => <li key={step.key} aria-current={step.active ? "step" : undefined} className="relative flex gap-4 pb-6 md:block md:pr-3">
        <span className={`relative z-10 size-8 shrink-0 rounded-full border flex items-center justify-center ${step.completed ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground'}`}>{step.completed ? <Check size={16} /> : <span className="size-2 rounded-full bg-muted-foreground" />}</span>
        <div className="md:mt-3"><h3 className={`text-sm ${step.active ? 'font-bold' : 'font-medium'}`}>{step.label}</h3><p className="text-xs text-muted-foreground mt-1">{step.description}</p>{date(step.date) && <time className="block text-xs mt-2">{date(step.date)}</time>}</div>
      </li>)}
    </ol>
    {!order.verified ? <p className="text-sm text-muted-foreground flex items-start gap-2"><ImageIcon size={18} className="shrink-0" />Enter the phone number used on your order to see private workshop photos.</p> : <section><h3 className="font-display text-xl mb-4">From our workshop</h3>{order.photos.length === 0 ? <p className="text-sm text-muted-foreground">Your workshop updates will appear here once posted.</p> : <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{[...order.photos].reverse().map((photo, index) => <figure key={`${photo.url}-${index}`}>{photo.video ? <video src={photo.url} muted autoPlay loop playsInline className="w-full aspect-[4/3] object-contain bg-muted" /> : <a href={photo.url} target="_blank" rel="noreferrer"><img src={photo.url} alt={photo.caption || "Your sofa being made"} loading="lazy" className="w-full aspect-[4/3] object-cover" /></a>}<figcaption className="text-xs mt-2 break-words">{photo.caption}<time className="block text-muted-foreground mt-1">{date(photo.date)}</time></figcaption></figure>)}</div>}</section>}
  </article>;
}