import type { ToolContext } from "@lovable.dev/mcp-js";
import { adminQuery, adminGetDoc, verifyIdToken } from "@/lib/firebase-admin.server";

export type Row = Record<string, unknown> & { id: string };

/** Resolve the signed-in Firebase user behind an MCP call. */
export async function mcpUserId(ctx: ToolContext): Promise<string> {
  const token = ctx.getToken();
  if (!token) throw new Error("This tool requires a verified OAuth token");
  const { uid } = await verifyIdToken(token);
  return uid;
}

/** Read a collection filtered to the caller's own rows. */
export async function myRows(
  ctx: ToolContext,
  col: string,
  extra: Array<{ field: string; op?: string; value: unknown }> = [],
  opts: { limit?: number; orderBy?: { field: string; desc?: boolean } } = {},
): Promise<Row[]> {
  const uid = await mcpUserId(ctx);
  return (await adminQuery(col, [{ field: "user_id", value: uid }, ...extra], opts)) as Row[];
}

export { adminQuery, adminGetDoc };

/** Keep only the listed keys — MCP responses stay small and safe. */
export function pick<T extends Record<string, unknown>>(row: T, keys: readonly string[]) {
  return Object.fromEntries(keys.filter((k) => k in row).map((k) => [k, row[k]]));
}