import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchSofasTool from "./tools/search-sofas";
import getSofaTool from "./tools/get-sofa";
import listMyOrdersTool from "./tools/list-my-orders";
import getMyOrderTool from "./tools/get-my-order";
import listMyDesignsTool from "./tools/list-my-designs";

// The OAuth issuer must be the direct Supabase host, which survives publish unchanged.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "true-furniture-s",
  title: "True Furniture's",
  version: "0.1.0",
  instructions:
    "Tools for True Furniture's, a custom sofa maker in Indore and Ujjain. Use `search_sofas` and `get_sofa` to browse the catalogue, and `list_my_orders`, `get_my_order` and `list_my_designs` to read the signed-in customer's own orders and saved 3D designs. All tools act as the signed-in customer.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchSofasTool, getSofaTool, listMyOrdersTool, getMyOrderTool, listMyDesignsTool],
});