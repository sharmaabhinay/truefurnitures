import { useQuery } from "@tanstack/react-query";
import { COL, fsList, fsUpdate, where } from "@/lib/db/firestore";

export type ChatMessage = {
  id: string;
  customer_id: string;
  body: string;
  sender_role: string;
  sender_id?: string | null;
  read_at?: string | null;
  created_at: string;
};

export const byOldest = (rows: ChatMessage[]) =>
  [...rows].sort((a, b) => (a.created_at > b.created_at ? 1 : -1));

/** Messages in one customer thread. */
export async function fetchThread(customerId: string): Promise<ChatMessage[]> {
  return byOldest(await fsList<ChatMessage>(COL.customerMessages, where("customer_id", "==", customerId)));
}

/** Flag the given messages as read (best-effort — never blocks the UI). */
export async function markRead(messages: ChatMessage[]) {
  const now = new Date().toISOString();
  await Promise.all(
    messages
      .filter((m) => !m.read_at)
      .map((m) => fsUpdate(COL.customerMessages, m.id, { read_at: now }).catch(() => {})),
  );
}

/** Unread replies from the team, for the signed-in customer. */
export function useCustomerUnread(uid: string | undefined) {
  return useQuery({
    queryKey: ["unread-customer", uid],
    enabled: !!uid,
    refetchInterval: 20000,
    queryFn: async () => {
      const rows = await fsList<ChatMessage>(COL.customerMessages, where("customer_id", "==", uid!)).catch(
        () => [] as ChatMessage[],
      );
      return rows.filter((m) => m.sender_role !== "customer" && !m.read_at).length;
    },
  });
}

/** Unread customer messages across all threads, for staff. */
export function useAdminUnread(enabled: boolean) {
  return useQuery({
    queryKey: ["unread-admin"],
    enabled,
    refetchInterval: 20000,
    queryFn: async () => {
      const rows = await fsList<ChatMessage>(
        COL.customerMessages,
        where("sender_role", "==", "customer"),
      ).catch(() => [] as ChatMessage[]);
      const unread = rows.filter((m) => !m.read_at);
      return { count: unread.length, threads: new Set(unread.map((m) => m.customer_id)).size, rows: unread };
    },
  });
}
