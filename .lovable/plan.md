# Fix manufacturer saving and product analytics

## What will change
- Reproduce the manufacturer save failure and correct the secure save path so normal names, contact details, dates, notes, deals, and payments save reliably.
- Replace the product screen's blocked browser-only cart counting with one staff-authorized data source that returns real order, active-cart, impression, view, 3D-view, and add-to-cart totals for every product.
- Make product matching tolerate current and older field names (`sofaId`, `sofa_id`, slug, and product name) so existing activity is counted instead of discarded.
- Use the same matching rules on the dedicated analytics and cart-customer pages, and stop hiding data-read failures as valid zero totals.
- Rebuild the Orders / Analytics / Cart row into a stable three-column layout so counts and actions stay aligned on narrow and wide cards.

## Verification
- Create and read back a temporary manufacturer, then remove it.
- Open a real product, add it to cart, and confirm its impression, product view, add-to-cart event, active cart, and product-card totals increase.
- Check 7-day, 30-day, and 12-month analytics and the product cart-customer list.
- Confirm the admin product cards remain aligned on desktop and mobile, and the final build is clean.

## Technical details
- Keep all cross-customer reads and manufacturer writes behind the existing staff-authorized server functions.
- Return explicit failures for unavailable analytics data rather than converting failed reads into empty arrays.
- Preserve existing orders and analytics records; no synthetic production counts will be added.
