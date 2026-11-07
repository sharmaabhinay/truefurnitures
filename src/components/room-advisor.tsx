import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Camera, ImagePlus, Sparkles, X, Square, ArrowUpRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getAiFeatures } from "@/lib/ai-features.functions";
import { AI_FEATURES_KEY } from "@/lib/ai-features";
import { openAiSession, updateAiSession } from "@/lib/ai-usage.functions";
import { ROOM_MIMES, ROOM_PHOTO_MAX, type RoomResult } from "@/lib/room-advisor";
import { useAuth } from "@/lib/auth/auth-context";
import { formatINR } from "@/lib/format";

export function RoomAdvisor() {
  const readFeatures = useServerFn(getAiFeatures);
  const begin = useServerFn(openAiSession);
  const update = useServerFn(updateAiSession);
  const { user } = useAuth();
  const features = useQuery({ queryKey: AI_FEATURES_KEY, queryFn: () => readFeatures(), staleTime: 30000 });
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [description, setDescription] = useState("");
  const [preferences, setPreferences] = useState("");
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [result, setResult] = useState<RoomResult | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const enabled = features.data?.room === true && !features.error;
  useEffect(() => {
    if (!photo) { setPreview(""); return; }
    const url = URL.createObjectURL(photo); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  useEffect(() => () => abort.current?.abort(), []);
  function choose(file: File | undefined) {
    if (!file) return;
    if (!ROOM_MIMES.includes(file.type) || !file.size || file.size > ROOM_PHOTO_MAX) { setError("Choose a JPG, PNG or WebP room photo up to 5 MB."); return; }
    setPhoto(file); setError(""); setResult(null);
  }
  async function recommend() {
    if (!photo || !enabled || busy) return;
    setBusy(true); setError(""); setResult(null); setReasoning("");
    const controller = new AbortController(); abort.current = controller;
    let id: string | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    try {
      let guestId = sessionStorage.getItem("tf_ai_guest");
      if (!guestId) { guestId = crypto.randomUUID(); sessionStorage.setItem("tf_ai_guest", guestId); }
      const session = await begin({ data: { task: "room", guestId } }); id = session.id;
      if (controller.signal.aborted) throw new DOMException("Stopped", "AbortError");
      timer = setInterval(() => { if (id && !document.hidden) void update({ data: { id, close: false } }).catch(() => {}); }, 15000);
      const form = new FormData();
      form.set("photo", photo); form.set("description", description); form.set("preferences", preferences); form.set("budget", budget); form.set("sessionId", id);
      const headers = new Headers();
      if (user) headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
      const response = await fetch("/api/public/room-advisor", { method: "POST", body: form, headers, signal: controller.signal });
      if (!response.ok) { const data = await response.json(); throw new Error(data.message ?? "AI could not complete this request."); }
      if (!response.body) throw new Error("AI returned no response.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let pending = ""; let completed = false;
      const event = (line: string) => {
        if (!line.trim()) return;
        const data = JSON.parse(line);
        if (data.type === "reasoning") setReasoning(value => value + data.text);
        if (data.type === "error") throw new Error(data.message);
        if (data.type === "result") { setResult(data.result); completed = true; }
      };
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        pending += decoder.decode(chunk.value, { stream: true });
        const lines = pending.split("\n"); pending = lines.pop() ?? "";
        lines.forEach(event);
      }
      pending += decoder.decode(); event(pending);
      if (!completed) throw new Error("The response ended before recommendations arrived.");
    } catch (e) { setError(controller.signal.aborted ? "Recommendation stopped." : e instanceof Error ? e.message : "The room advisor is unavailable."); }
    finally {
      clearInterval(timer); if (id) void update({ data: { id, close: true } }).catch(() => {});
      setBusy(false); abort.current = null;
    }
  }
  return <div className="min-h-screen bg-background text-foreground">
    <SiteHeader />
    <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8 md:py-16">
      <div className="mb-10 flex items-center gap-2 text-sm text-muted-foreground"><Camera size={18} /><span>True Furniture · Room styling</span></div>
      <h1 className="font-display text-4xl sm:text-5xl">A sofa for <span className="italic">your space.</span></h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <div>
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md border border-border bg-muted" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!busy) choose(e.dataTransfer.files[0]); }}>
            {preview ? <><img src={preview} alt="Your uploaded room" className="h-full w-full object-contain" onError={() => { setPhoto(null); setError("This photo could not be opened. Choose another image."); }} /><Button type="button" variant="secondary" size="icon" disabled={busy} className="absolute right-3 top-3" aria-label="Remove room photo" onClick={() => { setPhoto(null); setResult(null); if (input.current) input.current.value = ""; }}><X /></Button></> : <Button variant="ghost" disabled={busy} onClick={() => input.current?.click()} className="h-auto flex-col gap-3 px-6 py-8"><ImagePlus className="size-9 text-muted-foreground" /><span className="text-base">Add your room photo</span><span className="text-xs font-normal text-muted-foreground">JPG, PNG or WebP · up to 5 MB</span></Button>}
          </div>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Room photo" disabled={busy} onChange={e => choose(e.target.files?.[0])} />
          {photo && <Button variant="outline" size="sm" disabled={busy} className="mt-3" onClick={() => input.current?.click()}><ImagePlus />Change photo</Button>}
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Your photo is sent to AI for this recommendation, not saved to your account. Avoid including faces or private details.</p>
        </div>
        <form className="space-y-6" onSubmit={e => { e.preventDefault(); void recommend(); }}>
          <div><label htmlFor="room-space" className="mb-2 block text-sm font-medium">Tell us about your space</label><textarea id="room-space" required minLength={10} maxLength={2000} rows={4} disabled={busy} value={description} onChange={e => setDescription(e.target.value)} placeholder="Room measurements, where the sofa will go, seating needs…" className="w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
          <div><label htmlFor="room-preferences" className="mb-2 block text-sm font-medium">Your preferences</label><textarea id="room-preferences" rows={3} maxLength={1000} disabled={busy} value={preferences} onChange={e => setPreferences(e.target.value)} placeholder="Favourite colours, fabric, style, pets or children…" className="w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
          <div><label htmlFor="room-budget" className="mb-2 block text-sm font-medium">Budget in ₹ <span className="font-normal text-muted-foreground">(optional)</span></label><input id="room-budget" type="number" min={1} max={10000000} disabled={busy} value={budget} onChange={e => setBudget(e.target.value)} placeholder="60000" className="w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
          <div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy || !photo || description.trim().length < 10 || !enabled}>{busy ? <LoaderCircle className="motion-safe:animate-spin" /> : <Sparkles />}{busy ? "Finding your match…" : "Find matching sofas"}</Button>{busy && <Button type="button" variant="outline" onClick={() => abort.current?.abort()}><Square />Stop</Button>}</div>
          {!enabled && <p role="status" className="text-sm text-muted-foreground">{features.isPending ? "Checking advisor availability…" : features.error ? "Advisor settings are unavailable. Please try later." : "The room-photo advisor is currently disabled."}</p>}
          {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
          <p className="text-xs leading-relaxed text-muted-foreground">Photo-based styling is not a fit guarantee. Confirm room and access measurements, availability and final customization prices with our team.</p>
        </form>
      </div>
      {reasoning && <details className="mt-8 border-y border-border py-4"><summary className="cursor-pointer text-sm text-muted-foreground">{busy ? "Reviewing your room…" : "Styling notes"}</summary><p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{reasoning}</p></details>}
      {result && <section aria-label="Your sofa recommendations" className="mt-12 border-t border-border pt-10">
        <h2 className="font-display text-3xl">Your room, considered.</h2><p className="mt-4 max-w-3xl text-sm leading-relaxed">{result.summary}</p>
        {result.matches.length === 0 && <p className="mt-6 text-sm text-muted-foreground">No confirmed catalogue match. Update your room details or contact our team.</p>}
        <div className="mt-8 grid gap-8 md:grid-cols-3">{result.matches.map(match => <article key={match.slug} className="min-w-0">
          {match.product.hero_image && <img src={match.product.hero_image} alt={match.product.name} loading="lazy" className="aspect-[4/3] w-full rounded-md bg-muted object-cover" />}
          <h3 className="mt-5 font-display text-xl">{match.product.name}</h3><p className="mt-2 text-sm font-medium">From {formatINR(match.product.base_price)}</p><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{match.reason}</p>
          <dl className="my-4 space-y-2 text-sm">{[["Fabric", match.fabric], ["Colour", match.colour], ["Size", match.size]].map(([label, value]) => value && <div key={label} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2"><dt className="text-muted-foreground">{label}</dt><dd>{value}</dd></div>)}</dl>
          <Button asChild variant="outline"><Link to="/products/$slug" params={{ slug: match.slug }}>View sofa<ArrowUpRight /></Link></Button>
          {match.product.model_url && <Button asChild variant="ghost" className="mt-2"><Link to="/configure/$slug" params={{ slug: match.slug }}>Customize in 3D<ArrowUpRight /></Link></Button>}
        </article>)}</div>
        <ul className="mt-8 list-disc space-y-2 border-t border-border pl-5 pt-6 text-xs leading-relaxed text-muted-foreground">{result.cautions.map((note, i) => <li key={i}>{note}</li>)}</ul>
      </section>}
    </main><SiteFooter />
  </div>;
}