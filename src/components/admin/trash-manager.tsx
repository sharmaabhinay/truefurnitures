import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FiRotateCcw, FiTrash2 } from "react-icons/fi";
import { ACard, AButton, AEmpty, dark } from "@/components/admin/ui";
import { COL, fsAdd, fsDelete, fsGet, fsList, fsUpdate, sortRows } from "@/lib/db/firestore";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth/auth-context";

type Row = Record<string, any> & { id: string; deleted_at?: string | null; deleted_reason?: string | null };

type Kind = "order" | "customer" | "product";
type Action = "trashed" | "restored" | "purged";
const KIND_COL: Record<Kind, string> = { order: COL.orders, customer: COL.profiles, product: COL.sofas };

function labelOf(kind: Kind, r: Record<string, any> | null, id: string): string {
  if (!r) return id;
  if (kind === "order") return r["order_number"] ?? id;
  if (kind === "product") return r["name"] ?? id;
  return r["full_name"] || r["email"] || id;
}

/** Append one audit entry per item. Never throws — the main action already succeeded. */
export async function logTrashAction(
  action: Action,
  kind: Kind,
  ids: string[],
  reason: string | null,
  actor: { uid: string; email?: string | null; displayName?: string | null } | null | undefined,
) {
  if (!actor) return;
  await Promise.all(
    ids.map(async (id) => {
      try {
        const item = await fsGet<Record<string, any>>(KIND_COL[kind], id).catch(() => null);
        await fsAdd(COL.trashAudit, {
          action,
          kind,
          item_id: id,
          item_label: labelOf(kind, item, id),
          reason: reason ?? null,
          actor_id: actor.uid,
          actor_name: actor.displayName ?? null,
          actor_email: actor.email ?? null,
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("trash audit write failed", e);
      }
    }),
  );
}

/** Who moved what to Trash, when, and why. */
export function TrashAuditLog() {
  const [kind, setKind] = useState<"all" | Kind>("all");
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["admin-trash-audit"],
    queryFn: async () => sortRows(await fsList<Row>(COL.trashAudit), "created_at", "desc"),
  });
  const rows = data.filter((r) => kind === "all" || r["kind"] === kind).slice(0, 200);
  const tone: Record<string, string> = { trashed: "#f87171", restored: "#4ade80", purged: "#fbbf24" };
  return (
    <ACard>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-[14px] font-semibold">Trash history</div>
        <div className="flex gap-1">
          {(["all", "order", "customer", "product"] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)} className="rounded px-2.5 py-1 text-[11px] capitalize"
              style={{ background: kind === k ? dark.accent : "transparent", color: kind === k ? "#1a1a1a" : dark.mute, border: `1px solid ${dark.border}` }}>
              {k === "all" ? "All" : k + "s"}
            </button>
          ))}
        </div>
      </div>
      {isLoading ? <div className="tf-skeleton h-20" /> : error ? (
        <div className="text-[12px]" style={{ color: "#f87171" }}>History couldn't be loaded.</div>
      ) : rows.length === 0 ? <AEmpty icon="" text="No Trash activity yet." /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead><tr style={{ color: dark.mute }} className="text-left">
              <th className="py-2 pr-3">When</th><th className="pr-3">Action</th><th className="pr-3">Item</th><th className="pr-3">By</th><th>Reason</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: `1px solid ${dark.border}` }}>
                  <td className="py-2 pr-3 whitespace-nowrap">{new Date(r["created_at"]).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td className="pr-3 capitalize font-semibold" style={{ color: tone[r["action"]] }}>{r["action"] === "purged" ? "Deleted forever" : r["action"]}</td>
                  <td className="pr-3"><span className="capitalize" style={{ color: dark.mute }}>{r["kind"]}</span> · {r["item_label"]}</td>
                  <td className="pr-3">{r["actor_name"] || r["actor_email"] || r["actor_id"]}</td>
                  <td>{r["reason"] || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ACard>
  );
}

/** Soft-deleted customers and orders — restore or purge permanently. */
export function TrashManager() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState<"orders" | "customers" | "products">("orders");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-trash", tab],
    queryFn: async () => {
      const col = tab === "orders" ? COL.orders : tab === "products" ? COL.sofas : COL.profiles;
      const rows = await fsList<Row>(col);
      return sortRows(rows.filter((r) => !!r.deleted_at), "deleted_at", "desc");
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-trash"] });
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    qc.invalidateQueries({ queryKey: ["admin-customers"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["admin-trash-audit"] });
  };
  const kindOf: Kind = tab === "orders" ? "order" : tab === "products" ? "product" : "customer";

  const restore = async (id: string) => {
    try {
      await fsUpdate(tab === "orders" ? COL.orders : tab === "products" ? COL.sofas : COL.profiles, id, {
        deleted_at: null,
        deleted_reason: null,
        deleted_by: null,
      });
      await logTrashAction("restored", kindOf, [id], null, user);
      toast.success("Restored");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    }
  };

  const purge = async (id: string) => {
    if (!confirm("Delete permanently? This cannot be undone.")) return;
    try {
      await logTrashAction("purged", kindOf, [id], data.find((r) => r.id === id)?.deleted_reason ?? null, user);
      await fsDelete(tab === "orders" ? COL.orders : tab === "products" ? COL.sofas : COL.profiles, id);
      toast.success("Deleted permanently");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["orders", "customers", "products"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="rounded-md px-4 py-2 text-[12px] font-semibold capitalize"
            style={{
              background: tab === t ? dark.accent : "rgba(255,255,255,0.04)",
              color: tab === t ? "#1a1a1a" : dark.text,
              border: `1px solid ${dark.border}`,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <ACard>
        {isLoading ? (
          <div className="tf-skeleton h-24" />
        ) : data.length === 0 ? (
          <AEmpty icon="" text="Trash is empty." />
        ) : (
          <div className="space-y-2">
            {data.map((r) => (
              <div
                key={r.id}
                className="rounded-lg p-3 grid gap-2 sm:grid-cols-[1fr_auto] items-center"
                style={{ border: `1px solid ${dark.border}` }}
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold truncate">
                    {tab === "orders" ? r['order_number'] ?? r.id : tab === "products" ? r['name'] ?? r.id : r['full_name'] ?? r['email'] ?? r.id}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: dark.mute }}>
                    Deleted {formatDate(r.deleted_at ?? "")} · Reason: {r.deleted_reason || "—"}
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <AButton variant="ghost" onClick={() => restore(r.id)}>
                    <span className="inline-flex items-center gap-1.5"><FiRotateCcw /> Restore</span>
                  </AButton>
                  <AButton variant="danger" onClick={() => purge(r.id)}>
                    <span className="inline-flex items-center gap-1.5"><FiTrash2 /> Delete forever</span>
                  </AButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </ACard>

      <TrashAuditLog />
    </div>
  );
}

/** Small dialog that collects the mandatory reason before a soft delete. */
export function DeleteReasonModal({
  open,
  count,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  count: number;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl p-5"
        style={{ background: dark.card, border: `1px solid ${dark.border}`, color: dark.text }}
      >
        <div className="text-[15px] font-semibold">Move {count} item{count > 1 ? "s" : ""} to trash</div>
        <p className="text-[12px] mt-1" style={{ color: dark.mute }}>
          A reason is required. Items stay recoverable from the Trash panel.
        </p>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for deletion…"
          className="w-full rounded-md px-3 py-2 text-[13px] mt-3 outline-none"
          style={{ background: dark.field, border: `1px solid ${dark.border}`, color: dark.text }}
        />
        <div className="flex justify-end gap-2 mt-4">
          <AButton variant="ghost" onClick={onCancel}>Cancel</AButton>
          <AButton
            variant="danger"
            disabled={reason.trim().length < 3}
            onClick={() => { onConfirm(reason.trim()); setReason(""); }}
          >
            Move to trash
          </AButton>
        </div>
      </div>
    </div>
  );
}
