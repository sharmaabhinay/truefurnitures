import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { askCustomerAi, draftAdminAi } from "@/lib/ai.functions";
import { isAdminAi, type AiInput } from "@/lib/ai-contract";

export function AiTool({ task, label, slug, facts, onApply }: {
  task: AiInput["task"]; label: string; slug?: string; facts?: string; onApply?: (text: string) => void;
}) {
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
  async function generate() {
    setBusy(true); setError(null); setText("");
    try {
      const result = await (staff ? admin : customer)({ data: { task, prompt, slug, facts } });
      setText(result.text); setError(result.error);
    } catch {
      setError(staff ? "AI could not be reached. Check your staff session and try again." : "AI could not be reached. Please try later.");
    } finally { setBusy(false); }
  }
  return <>
    <Button type="button" variant="outline" onClick={() => setOpen(true)} className="my-3 max-w-full"><Sparkles />{label}</Button>
    <Dialog open={open} onOpenChange={(next) => { if (!busy) setOpen(next); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto bg-background text-foreground">
        <DialogHeader><DialogTitle>{label}</DialogTitle></DialogHeader>
        <form onSubmit={(event) => { event.preventDefault(); void generate(); }} className="space-y-4">
          <label className="block text-sm" htmlFor={`ai-${task}`}>{staff ? "Draft brief" : "Your question"}</label>
          <textarea id={`ai-${task}`} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={placeholders[task]} minLength={3} maxLength={2000} required rows={4} disabled={busy} className="w-full rounded-md border border-input bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <Button type="submit" disabled={busy || prompt.trim().length < 3}>{busy ? <LoaderCircle className="animate-spin" /> : <Sparkles />}{busy ? "Thinking…" : staff ? "Generate draft" : "Ask AI"}</Button>
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