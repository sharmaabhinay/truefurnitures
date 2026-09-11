# Cart insights and product cart drill-down

## What will change
- Finish the product cart count links so every product opens a dedicated customer list, including when the current count is zero.
- Load that customer list through the existing staff-authorized server data source, so names, contact details, quantities, options, and timestamps are reliable.
- Add a **Cart insights** tab in Admin with real totals for visitors who added to cart, completed checkouts, and cart-to-checkout conversion.
- Include supporting breakdowns for cart additions and completed orders, while excluding deleted records and zero-quantity items.

## Technical details
- Reuse the existing visitor `add_to_cart` events, live cart documents, and order records rather than creating estimated metrics.
- Count distinct visitor sessions for cart visitors and distinct completed/paid orders for checkout completions; label definitions clearly in the panel.
- Keep staff authorization on all shared customer and cart reads.
- Verify the admin navigation, the product-specific list, empty states, and the final build.
