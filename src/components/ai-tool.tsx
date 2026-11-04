import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { askCustomerAi, draftAdminAi } from "@/lib/ai.functions";
import { openAiSession, updateAiSession } from "@/lib/ai-usage.functions";
import { isAdminAi, type AiInput } from "@/lib/ai-contract";
import { getAiFeatures } from "@/lib/ai-features.functions";
import { AI_FEATURES_KEY, AI_DISABLED_MESSAGE } from "@/lib/ai-features";

export function AiTool({ task, label, slug, facts, onApply }: {
  task: AiInput["task"]; label: string; slug?: string; facts?: string; onApply?: (text: string) => void;
}) {
  const readFeatures = useServerFn(getAiFeatures);
  const features = useQuery({ queryKey: AI_FEATURES_KEY, queryFn: () => readFeatures(), staleTime: 30_000, refetchInterval: 60_000 });
  const enabled = !features.error && features.data?.[task] === true;
  const begin = useServerFn(openAiSession);
  const update = useServerFn(updateAiSession);
  const session = useRef<string | null>(null);
  const [starting, setStarting] = useState(false);
  const activity = useRef(0);
  const customer = useServerFn(askCustomerAi);
  const admin = useServerFn(draftAdminAi);
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const staff = isAdminAi(task);
  const placeholders = {
    finder: "Your budget, room size, seating needs and preferred style…",
    question: "Your question about this sofa…",
    description: "Tone and description preferences…",
    reply: "Customer question and confirmed information for your reply. Leave out private details…",
  };
  useEffect(() => {
    if (!open) return;
    const active = () => { activity.current = Date.now(); };
    const close = () => { const id = session.current; session.current = null; if (id) void update({ data: { id, close: true } }).catch(() => {}); };
    const visibility = () => { if (document.hidden) close(); };
    window.addEventListener("pointerdown", active); window.addEventListener("keydown", active); document.addEventListener("visibilitychange", visibility);
    const timer = window.setInterval(() => {
      const id = session.current; if (!id) return;
      if (Date.now() - activity.current >= 120000) { close(); return; }
      void update({ data: { id, close: false } }).catch(() => {});
    }, 15000);
    return () => { clearInterval(timer); close(); window.removeEventListener("pointerdown", active); window.removeEventListener("keydown", active); document.removeEventListener("visibilitychange", visibility); };
  }, [open, update]);
  async function startSession() {
    let guestId = sessionStorage.getItem("tf_ai_guest");
    if (!guestId) { guestId = crypto.randomUUID(); sessionStorage.setItem("tf_ai_guest", guestId); }
    const result = await begin({ data: { task, guestId } });
    session.current = result.id; activity.current = Date.now(); return result.id;
  }
  async function show() {
    if (!enabled) return;
    setOpen(true); setError(null); setStarting(true);
    try { await startSession(); } catch { setError("The AI tool could not be opened. Please try again."); }
    finally { setStarting(false); }
  }
  async function generate() {
    if (!enabled) { setError(AI_DISABLED_MESSAGE); return; }
    setBusy(true); setError(null); setText("");
    try {
      const sessionId = session.current ?? await startSession();
      const result = await (staff ? admin : customer)({ data: { task, prompt, slug, facts, sessionId } });
      setText(result.text); setError(result.error);
    } catch {
      setError(staff ? "AI could not be reached. Check your staff session and try again." : "AI could not be reached. Please try later.");
    } finally { setBusy(false); }
  }
  return <>
    {enabled && <Button type="button" variant="outline" onClick={() => void show()} className="my-3 max-w-full"><Sparkles />{label}</Button>}
    <Dialog open={open} onOpenChange={(next) => { if (!busy && !starting) setOpen(next); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto bg-background text-foreground">
        <DialogHeader><DialogTitle>{label}</DialogTitle></DialogHeader>
        <form onSubmit={(event) => { event.preventDefault(); void generate(); }} className="space-y-4">
          <label className="block text-sm" htmlFor={`ai-${task}`}>{staff ? "Draft brief" : "Your question"}</label>
          <textarea id={`ai-${task}`} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={placeholders[task]} minLength={3} maxLength={2000} required rows={4} disabled={busy} className="w-full rounded-md border border-input bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <Button type="submit" disabled={!enabled || busy || starting || prompt.trim().length < 3}>{busy ? <LoaderCircle className="animate-spin" /> : <Sparkles />}{busy ? "Thinking…" : staff ? "Generate draft" : "Ask AI"}</Button>
          {!enabled && <p role="status" className="text-sm text-muted-foreground">{features.error ? "AI settings are unavailable. Please try later." : AI_DISABLED_MESSAGE}</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {text && <div className="space-y-3">
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed" aria-live="polite">{text}</p>
            {onApply && <Button type="button" onClick={() => { onApply(text); setOpen(false); }}>Use draft</Button>}
          </div>}
        </form>
      </DialogContent>
    </Dialog>
  </>;
}