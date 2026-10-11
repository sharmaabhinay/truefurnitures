import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FiShield } from "react-icons/fi";
import { listAdminUsers, setAdminRole } from "@/lib/admin-users.functions";
import { ACard, AInput, ASelect, AButton, AEmpty, dark } from "@/components/admin/ui";
import { formatDate } from "@/lib/format";

type Role = "admin" | "staff";
type Customer = { id: string; email: string | null; full_name: string | null; created_at: string | null; last_sign_in_at: string | null; roles: string[] };

export function PromoteCustomers({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const listUsers = useServerFn(listAdminUsers);
  const setRole = useServerFn(setAdminRole);
  const [search, setSearch] = useState("");
  const [roleFor, setRoleFor] = useState<Record<string, Role>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-all-users"],
    queryFn: () => listUsers({}) as Promise<Customer[]>,
    staleTime: 0,
  });

  const needle = search.trim().toLowerCase();
  const customers = (data ?? [])
    .filter((u) => !u.roles.includes("admin") && !u.roles.includes("staff"))
    .filter((u) => !needle || [u.email, u.full_name].some((v) => (v ?? "").toLowerCase().includes(needle)))
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));

  async function promote(c: Customer) {
    const role = roleFor[c.id] ?? "staff";
    const label = role === "admin" ? "an Owner (full access)" : "a Manager";
    if (!window.confirm(`Make ${c.email ?? c.full_name ?? "this customer"} ${label}? They will be able to open the admin panel.`)) return;
    setBusyId(c.id);
    try {
      await setRole({ data: { targetUserId: c.id, role } });
      toast.success(`${c.email ?? "Customer"} is now ${label}`);
      qc.invalidateQueries({ queryKey: ["admin-all-users"] });
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not give access");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ACard>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[13px] font-semibold" style={{ color: dark.text }}>Make a customer an admin</div>
          <div className="text-[11px]" style={{ color: dark.mute }}>Pick a registered customer and give them dashboard access.</div>
        </div>
        <AInput placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 260 }} />
      </div>
      {error ? (
        <div className="text-[12px]" style={{ color: dark.danger }}>{error instanceof Error ? error.message : "Could not load customers."}</div>
      ) : isLoading ? (
        <div className="py-8 text-center text-[12px]" style={{ color: dark.mute }}>Loading customers…</div>
      ) : customers.length === 0 ? (
        <AEmpty icon={<FiShield />} text="No customers found." />
      ) : (
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full text-[12px]" style={{ color: dark.text }}>
            <thead>
              <tr style={{ color: dark.mute }}>
                {["Customer", "Joined", "Last sign-in", "Access", ""].map((h) => (
                  <th key={h} className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-t" style={{ borderColor: dark.border }}>
                  <td className="px-2 py-3">
                    <div className="font-medium">{c.full_name || c.email || c.id}</div>
                    <div className="text-[11px]" style={{ color: dark.mute }}>{c.email ?? "—"}</div>
                  </td>
                  <td className="px-2 py-3" style={{ color: dark.mute }}>{c.created_at ? formatDate(c.created_at) : "—"}</td>
                  <td className="px-2 py-3" style={{ color: dark.mute }}>{c.last_sign_in_at ? formatDate(c.last_sign_in_at) : "Never"}</td>
                  <td className="px-2 py-3">
                    <ASelect value={roleFor[c.id] ?? "staff"} onChange={(e) => setRoleFor({ ...roleFor, [c.id]: e.target.value as Role })} style={{ maxWidth: 140 }}>
                      <option value="staff">Manager</option>
                      <option value="admin">Owner</option>
                    </ASelect>
                  </td>
                  <td className="px-2 py-3 text-right">
                    <AButton onClick={() => promote(c)} disabled={busyId === c.id}>{busyId === c.id ? "Saving…" : "Make admin"}</AButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ACard>
  );
}
