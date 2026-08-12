import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FiRotateCcw, FiTrash2 } from "react-icons/fi";
import { ACard, AButton, AEmpty, dark } from "@/components/admin/ui";
import { COL, fsDelete, fsList, fsUpdate, sortRows } from "@/lib/db/firestore";
import { formatDate } from "@/lib/format";

type Row = Record<string, any> & { id: string; deleted_at?: string | null; deleted_reason?: string | null };

/** Soft-deleted customers and orders — restore or purge permanently. */
export function TrashManager() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"orders" | "customers">("orders");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-trash", tab],
    queryFn: async () => {
      const col = tab === "orders" ? COL.orders : COL.profiles;
      const rows = await fsList<Row>(col);
      return sortRows(rows.filter((r) => !!r.deleted_at), "deleted_at", "desc");
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-trash"] });
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    qc.invalidateQueries({ queryKey: ["admin-customers"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const restore = async (id: string) => {
    try {
      await fsUpdate(tab === "orders" ? COL.orders : COL.profiles, id, {
        deleted_at: null,
        deleted_reason: null,
        deleted_by: null,
      });
      toast.success("Restored");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    }
  };

  const purge = async (id: string) => {
    if (!confirm("Delete permanently? This cannot be undone.")) return;
    try {
      await fsDelete(tab === "orders" ? COL.orders : COL.profiles, id);
      toast.success("Deleted permanently");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["orders", "customers"] as const).map((t) => (
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
                    {tab === "orders" ? r['order_number'] ?? r.id : r['full_name'] ?? r['email'] ?? r.id}
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
