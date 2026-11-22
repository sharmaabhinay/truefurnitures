import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, LoaderCircle, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { myHomeSubmissions, submitRealHome } from "@/lib/real-homes.functions";
import { homeSubmissionInput } from "@/lib/real-homes";

export function RealHomeSubmission() {
  const { user } = useAuth(); const load = useServerFn(myHomeSubmissions); const post = useServerFn(submitRealHome); const qc = useQueryClient();
  const orders = useQuery({ queryKey: ["my-home-submissions", user?.uid], enabled: !!user, queryFn: () => load() });
  const [orderId, setOrderId] = useState(""); const [locality, setLocality] = useState(""); const [caption, setCaption] = useState(""); const [consent, setConsent] = useState(false);
  const [files, setFiles] = useState<File[]>([]); const [previews, setPreviews] = useState<string[]>([]); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  useEffect(() => { const urls = files.map(file => URL.createObjectURL(file)); setPreviews(urls); return () => urls.forEach(url => URL.revokeObjectURL(url)); }, [files]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setMessage(""); setError(""); setBusy(true);
    try {
      const images = await Promise.all(files.map(file => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error("Photo couldn’t be read.")); reader.onerror = () => reject(new Error("Photo couldn’t be read.")); reader.readAsDataURL(file); })));
      const parsed = homeSubmissionInput.safeParse({ orderId, locality, caption, consent, images });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check your submission.");
      await post({ data: parsed.data }); setFiles([]); setCaption(""); setConsent(false); setMessage("Your home photo was submitted for review. It will appear after approval.");
      await qc.invalidateQueries({ queryKey: ["my-home-submissions"] });
    } catch (err) { setError(err instanceof Error ? err.message : "Your submission couldn’t be saved."); } finally { setBusy(false); }
  }
  const field = "block w-full mt-2 rounded-md border border-input bg-background p-3 text-sm";
  return <section id="share-home" className="border-y border-border py-8 my-10"><h2 className="font-display text-2xl mb-3">Share your home</h2><p className="text-sm text-muted-foreground mb-5">A sofa you love, in a space that’s yours. Keep faces, addresses and personal details out of your photos.</p>
    {!user ? <Button asChild><Link to="/auth">Sign in to share your home</Link></Button> : orders.isPending ? <p>Loading your delivered orders…</p> : orders.isError ? <><p role="alert">We couldn’t load your orders.</p><Button variant="outline" onClick={() => orders.refetch()}>Retry</Button></> : <>
      {!orders.data?.orders.length ? <p className="text-muted-foreground">You can share a photo once your sofa order is delivered.</p> : <form onSubmit={submit} className="max-w-3xl grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Your delivered sofa<select required value={orderId} onChange={e => setOrderId(e.target.value)} className={field}><option value="">Choose an order</option>{orders.data.orders.map(order => <option key={order.id} value={order.id}>{order.number} · {order.name}</option>)}</select></label>
        <label className="text-sm font-medium">Locality<input required minLength={2} maxLength={80} value={locality} onChange={e => setLocality(e.target.value)} placeholder="e.g. Vijay Nagar, Indore" className={field} /></label>
        <label className="text-sm font-medium sm:col-span-2">Your story<textarea required minLength={3} maxLength={500} value={caption} onChange={e => setCaption(e.target.value)} className={field} rows={3} /></label>
        <label className="text-sm font-medium sm:col-span-2">Living-room photos <span className="text-muted-foreground">(up to 3, 5 MB each)</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} className={field} onChange={e => { const chosen = Array.from(e.target.files ?? []); if (chosen.length > 3 || chosen.some(file => !['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) { setError("Choose up to 3 JPG, PNG or WebP photos, under 5 MB each."); e.target.value = ''; return; } setError(""); setFiles(chosen); }} /></label>
        <div className="flex gap-3 sm:col-span-2">{previews.map((url, index) => <div key={url} className="relative"><img src={url} alt={`Room photo ${index + 1}`} className="size-20 object-cover rounded-md" /><Button type="button" variant="secondary" size="icon" aria-label={`Remove photo ${index + 1}`} className="absolute top-0 right-0 size-6" disabled={busy} onClick={() => setFiles(current => current.filter((_, i) => i !== index))}><X /></Button></div>)}</div>
        <label className="text-sm flex items-start gap-3 sm:col-span-2"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1" />I own these photos and agree to publish them, my story and locality in the customer gallery.</label>
        <div className="sm:col-span-2"><Button disabled={busy || !files.length} type="submit">{busy ? <LoaderCircle className="animate-spin" /> : <Camera />}{busy ? "Uploading…" : "Submit for review"}</Button></div>
      </form>}
      {!!orders.data?.submissions.length && <div className="mt-6"><h3 className="font-medium mb-3">My submissions</h3>{orders.data.submissions.map(home => <p key={home.id} className="text-sm py-2 border-t border-border">{home.locality} <span className="text-muted-foreground">· {home.status === 'pending' ? 'Awaiting review' : home.status === 'approved' ? 'Published' : 'Not approved'}</span></p>)}</div>}
    </>}{message && <p role="status" className="mt-4 text-sm">{message}</p>}{error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
  </section>;
}