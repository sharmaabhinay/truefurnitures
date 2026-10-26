import { useEffect, useState } from "react";
import { FiPlus, FiSave, FiTrash2, FiRotateCcw } from "react-icons/fi";
import { toast } from "sonner";
import { AButton, AInput, ASelect } from "@/components/admin/ui";
import { useAuth } from "@/lib/auth/auth-context";
import { ADMIN_ACTIONS, DEFAULT_SHORTCUTS, SHORTCUTS_CHANGED, loadShortcuts, normalizeKeys, shortcutStorageKey, validateShortcuts, type AdminAction, type Shortcut } from "@/lib/admin-shortcuts";

export function ShortcutSettings() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Shortcut[]>([]);
  useEffect(() => { if (user) setRows(loadShortcuts(user.uid)); }, [user]);
  const patch = (id: string, changes: Partial<Shortcut>) => setRows((prev) => prev.map((row) => row.id === id ? { ...row, ...changes } : row));
  const save = () => {
    if (!user) return;
    const error = validateShortcuts(rows);
    if (error) return toast.error(error);
    try {
      localStorage.setItem(shortcutStorageKey(user.uid), JSON.stringify(rows.map((row) => ({ ...row, keys: normalizeKeys(row.keys) }))));
      window.dispatchEvent(new Event(SHORTCUTS_CHANGED));
      toast.success("Keyboard shortcuts saved");
    } catch { toast.error("Your browser could not save shortcuts."); }
  };
  return <section className="space-y-4 text-analytics-text">
    <h2 className="text-lg font-semibold">Keyboard shortcuts</h2>
    <p className="text-sm text-analytics-muted">Personal to your account in this browser. Active across pages, except while typing or a dialog is open. Space-separated keys run in sequence; O I downloads the invoice on order details. Complete a sequence within 0.75 seconds.</p>
    <div className="flex flex-wrap gap-2">
      <AButton onClick={save}><FiSave className="inline mr-2" />Save shortcuts</AButton>
      <AButton variant="ghost" onClick={() => setRows((prev) => [...prev, { id: crypto.randomUUID(), action: "orders", keys: "", enabled: true }])}><FiPlus className="inline mr-2" />Add shortcut</AButton>
      <AButton variant="ghost" onClick={() => setRows(DEFAULT_SHORTCUTS.map((row) => ({ ...row })))}><FiRotateCcw className="inline mr-2" />Restore defaults</AButton>
    </div>
    <div className="divide-y divide-analytics-border">
      {rows.map((row) => <div key={row.id} className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_180px_auto] items-center gap-3 py-3">
        <input type="checkbox" checked={row.enabled} aria-label={`Enable ${row.action} shortcut`} onChange={(e) => patch(row.id, { enabled: e.target.checked })} />
        <ASelect aria-label="Shortcut action" value={row.action} onChange={(e) => patch(row.id, { action: e.target.value as AdminAction })}>{ADMIN_ACTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</ASelect>
        <AInput className="col-start-2 sm:col-start-auto" aria-label={`Keys for ${row.action}`} placeholder="e.g. alt+o or g o" value={row.keys} onChange={(e) => patch(row.id, { keys: e.target.value })} />
        <AButton variant="ghost" aria-label={`Remove ${row.action} shortcut`} title="Remove shortcut" onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}><FiTrash2 /></AButton>
      </div>)}
    </div>
  </section>;
}