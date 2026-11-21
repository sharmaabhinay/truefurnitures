import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Search, LoaderCircle, RefreshCw } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { OrderTrackingCard } from "@/components/order-tracking-card";
import { trackOrder, trackMyOrders } from "@/lib/order-tracking.functions";
import { trackingInput, type TrackedOrder } from "@/lib/order-tracking";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/track-order")({ head: () => ({ meta: [
  { title: "Track your sofa order — True Furniture's" }, { name: "description", content: "Follow your sofa through seven stages, from deposit to home delivery, and see your workshop updates." },
  { property: "og:title", content: "Track your sofa order — True Furniture's" }, { property: "og:description", content: "Your sofa's journey from our workshop to your home." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: Tracker });

function Tracker() {
  const { user } = useAuth();
  const lookup = useServerFn(trackOrder);
  const mine = useServerFn(trackMyOrders);
  const [number, setNumber] = useState(""); const [phone, setPhone] = useState("");
  const [result, setResult] = useState<TrackedOrder | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const orders = useQuery({ queryKey: ["tracked-my-orders", user?.uid], enabled: !!user, queryFn: () => mine(), refetchInterval: 60_000 });
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setResult(null); setError("");
    const parsed = trackingInput.safeParse({ orderNumber: number, phone });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check your order number."); return; }
    setBusy(true);
    try { const response = await lookup({ data: parsed.data }); setResult(response.order); setError(response.error ?? ""); }
    catch { setError("We couldn’t load your order. Please try again."); } finally { setBusy(false); }
  }
  return <div className="min-h-screen bg-background text-foreground"><SiteHeader /><main className="max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
    <p className="text-sm text-muted-foreground mb-3">From our workshop to your home</p><h1 className="font-display text-4xl sm:text-5xl mb-4">Track your order</h1><p className="text-muted-foreground max-w-xl mb-8">Follow every stage of your sofa’s journey.</p>
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] items-end max-w-3xl mb-8">
      <label className="text-sm font-medium">Order number<input required maxLength={44} value={number} onChange={e => setNumber(e.target.value)} placeholder="TF-53433" autoComplete="off" className="block w-full rounded-md border border-input bg-background px-3 h-11 mt-2" /></label>
      <label className="text-sm font-medium">Order phone <span className="text-muted-foreground font-normal">(for photos)</span><input type="tel" maxLength={20} value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" className="block w-full rounded-md border border-input bg-background px-3 h-11 mt-2" /></label>
      <Button disabled={busy} type="submit" className="h-11">{busy ? <LoaderCircle className="animate-spin" /> : <Search />}{busy ? "Finding order…" : "Track order"}</Button>
    </form>
    {error && <p role="alert" className="text-destructive mb-6">{error}</p>}{result && <OrderTrackingCard order={result} />}
    {user && <section className="mt-12"><div className="flex justify-between items-center mb-4"><h2 className="font-display text-2xl">All my orders</h2><Button variant="ghost" size="icon" aria-label="Refresh my orders" onClick={() => orders.refetch()}><RefreshCw className={orders.isFetching ? "animate-spin" : ""} /></Button></div>{orders.isPending ? <p>Loading your orders…</p> : orders.isError ? <p role="alert">Your orders couldn’t be loaded. Please refresh.</p> : !orders.data?.length ? <p className="text-muted-foreground">You have no orders yet.</p> : orders.data.map(order => <OrderTrackingCard key={order.orderNumber} order={order} />)}</section>}
  </main><SiteFooter /></div>;
}