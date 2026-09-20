import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listAdminTeam,
  createAdminAccount,
  updateAdminAccount,
  removeAdminAccount,
} from "@/lib/admin-users.functions";
import { ACard, AInput, ASelect, AButton, AField, AModal, AEmpty, dark } from "@/components/admin/ui";
import { formatDate } from "@/lib/format";
import { FiPlus, FiRefreshCw, FiShield, FiTrash2 } from "react-icons/fi";

type Role = "admin" | "staff";

type Member = {
  uid: string;
  role: Role;
  email: string | null;
  name: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  exists: boolean;
};

const PERMISSIONS: Record<Role, string[]> = {
  admin: [
    "Everything a manager can do",
    "Site settings, pricing & feature toggles",
    "Coupons, campaigns & payouts",
    "Create and remove admin accounts",
  ],
  staff: [
    "Orders, customers & messages",
    "Products, reviews & bookings",
    "Manufacturers & carpenters",
    "Cannot change settings or team access",
  ],
};

export function AdminUsers() {
  const qc = useQueryClient();
  const list = useServerFn(listAdminTeam);
  const create = useServerFn(createAdminAccount);
  const update = useServerFn(updateAdminAccount);
  const remove = useServerFn(removeAdminAccount);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-team"],
    queryFn: () => list({}) as Promise<Member[]>,
    staleTime: 0,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "staff" as Role });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const members = data ?? [];

  async function submitNew() {
    if (!form.email.trim() || form.password.length < 8) {
      toast.error("Enter an email and a password of at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await create({ data: { email: form.email.trim(), password: form.password, name: form.name.trim() || undefined, role: form.role } });
      toast.success("Account created");
      setAddOpen(false);
      setForm({ name: "", email: "", password: "", role: "staff" });
      qc.invalidateQueries({ queryKey: ["admin-team"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the account");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(m: Member, role: Role) {
    try {
      await update({ data: { uid: m.uid, role } });
      toast.success(`${m.email ?? "Account"} is now ${role === "admin" ? "an owner" : "a manager"}`);
      qc.invalidateQueries({ queryKey: ["admin-team"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the role");
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setBusy(true);
    try {
      await update({
        data: {
          uid: editing.uid,
          name: editing.name ?? "",
          ...(newPassword ? { password: newPassword } : {}),
        },
      });
      toast.success("Account updated");
      setEditing(null);
      setNewPassword("");
      qc.invalidateQueries({ queryKey: ["admin-team"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the account");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(m: Member, deleteLogin: boolean) {
    const msg = deleteLogin
      ? `Delete ${m.email ?? "this account"} permanently? They will no longer be able to sign in at all.`
      : `Remove admin access for ${m.email ?? "this account"}? Their login stays, but only as a normal customer.`;
    if (!window.confirm(msg)) return;
    try {
      await remove({ data: { uid: m.uid, deleteLogin } });
      toast.success(deleteLogin ? "Account deleted" : "Access removed");
      qc.invalidateQueries({ queryKey: ["admin-team"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove the account");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px]" style={{ color: dark.mute }}>
          People who can sign in to this dashboard. Remove anyone who no longer needs access.
        </p>
        <div className="flex gap-2">
          <AButton variant="ghost" onClick={() => refetch()}>
            <span className="inline-flex items-center gap-1.5"><FiRefreshCw /> {isFetching ? "Refreshing…" : "Refresh"}</span>
          </AButton>
          <AButton onClick={() => setAddOpen(true)}>
            <span className="inline-flex items-center gap-1.5"><FiPlus /> New account</span>
          </AButton>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(["admin", "staff"] as Role[]).map((r) => (
          <ACard key={r}>
            <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold" style={{ color: dark.text }}>
              <FiShield style={{ color: dark.accent }} />
              {r === "admin" ? "Owner (full access)" : "Manager (day-to-day)"}
            </div>
            <ul className="space-y-1 text-[12px]" style={{ color: dark.mute }}>
              {PERMISSIONS[r].map((p) => <li key={p}>• {p}</li>)}
            </ul>
          </ACard>
        ))}
      </div>

      <ACard>
        {error ? (
          <div className="text-[12px]" style={{ color: dark.danger }}>
            {error instanceof Error ? error.message : "Could not load the team list."}
          </div>
        ) : isLoading ? (
          <div className="py-10 text-center text-[12px]" style={{ color: dark.mute }}>Loading…</div>
        ) : members.length === 0 ? (
          <AEmpty icon={<FiShield />} text="No admin accounts yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]" style={{ color: dark.text }}>
              <thead>
                <tr style={{ color: dark.mute }}>
                  {["Person", "Access", "Added", "Last sign-in", ""].map((h) => (
                    <th key={h} className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.uid} className="border-t" style={{ borderColor: dark.border }}>
                    <td className="px-2 py-3">
                      <div className="font-medium">{m.name || m.email || m.uid}</div>
                      <div className="text-[11px]" style={{ color: dark.mute }}>
                        {m.email ?? "—"}{!m.exists && " · login missing"}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <ASelect
                        value={m.role}
                        onChange={(e) => changeRole(m, e.target.value as Role)}
                        style={{ maxWidth: 140 }}
                      >
                        <option value="admin">Owner</option>
                        <option value="staff">Manager</option>
                      </ASelect>
                    </td>
                    <td className="px-2 py-3" style={{ color: dark.mute }}>{m.created_at ? formatDate(m.created_at) : "—"}</td>
                    <td className="px-2 py-3" style={{ color: dark.mute }}>{m.last_sign_in_at ? formatDate(m.last_sign_in_at) : "Never"}</td>
                    <td className="px-2 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <AButton variant="ghost" onClick={() => { setEditing(m); setNewPassword(""); }}>Edit</AButton>
                        <AButton variant="ghost" onClick={() => revoke(m, false)}>Remove access</AButton>
                        <AButton variant="danger" onClick={() => revoke(m, true)}>
                          <span className="inline-flex items-center gap-1.5"><FiTrash2 /> Delete</span>
                        </AButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ACard>

      <AModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="New admin account"
        subtitle="They can sign in straight away with this email and password."
        footer={
          <>
            <AButton variant="ghost" onClick={() => setAddOpen(false)}>Cancel</AButton>
            <AButton onClick={submitNew} disabled={busy}>{busy ? "Creating…" : "Create account"}</AButton>
          </>
        }
      >
        <AField label="Full name">
          <AInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Riya Sharma" />
        </AField>
        <AField label="Email">
          <AInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@truefurnitures.com" />
        </AField>
        <AField label="Password" hint="at least 8 characters">
          <AInput type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </AField>
        <AField label="Access level">
          <ASelect value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            <option value="staff">Manager (day-to-day)</option>
            <option value="admin">Owner (full access)</option>
          </ASelect>
        </AField>
      </AModal>

      <AModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit account"
        subtitle={editing?.email ?? ""}
        footer={
          <>
            <AButton variant="ghost" onClick={() => setEditing(null)}>Cancel</AButton>
            <AButton onClick={saveEdit} disabled={busy}>{busy ? "Saving…" : "Save"}</AButton>
          </>
        }
      >
        <AField label="Full name">
          <AInput
            value={editing?.name ?? ""}
            onChange={(e) => setEditing(editing ? { ...editing, name: e.target.value } : editing)}
          />
        </AField>
        <AField label="New password" hint="leave blank to keep the current one">
          <AInput type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </AField>
      </AModal>
    </div>
  );
}
