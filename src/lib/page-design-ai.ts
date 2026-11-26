import { normalizeHeaderCta, normalizeNavigation, type HeaderCta, type NavigationItem } from "@/lib/site-navigation";
import { normalizeLayout, type PageKind, type PageSection } from "@/lib/page-layout";

export type PageDesignProposal = {
  summary: string;
  sections?: PageSection[];
  navigation?: NavigationItem[];
  headerCta?: HeaderCta;
};

/** AI can propose only known, serializable presentation fields. It never saves directly. */
export function parsePageDesignProposal(raw: string, page: PageKind): PageDesignProposal {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let value: unknown;
  try { value = JSON.parse(cleaned); } catch { throw new Error("AI returned an unreadable design. Nothing was changed."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("AI returned an invalid design. Nothing was changed.");
  const row = value as Record<string, unknown>;
  const proposal: PageDesignProposal = { summary: typeof row.summary === "string" ? row.summary.trim().slice(0, 500) : "Review the proposed design changes." };
  if (Array.isArray(row.sections)) proposal.sections = normalizeLayout(row.sections, page);
  if (Array.isArray(row.navigation)) proposal.navigation = normalizeNavigation(row.navigation);
  if (row.headerCta && typeof row.headerCta === "object") proposal.headerCta = normalizeHeaderCta(row.headerCta);
  if (!proposal.sections && !proposal.navigation && !proposal.headerCta) throw new Error("AI did not propose a supported page change. Nothing was changed.");
  return proposal;
}
