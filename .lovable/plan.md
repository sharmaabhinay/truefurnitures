# Fix product analytics and cart insights

## What will change
- Reproduce both admin screens with current saved activity and expose real read failures instead of turning them into zero counts.
- Make product matching consistent across views, cart additions, active carts, and orders, including older records that use alternate ID, slug, or name fields.
- Count only activity inside the selected 7-day, 30-day, or 12-month range on product analytics.
- Refresh Cart Insights and product analytics when the admin opens them and after new activity, with clear last-updated and failure states.
- Verify by viewing a real product, adding it to cart, and checking both admin screens.

## Technical details
- Keep all cross-customer reads behind the existing staff-authorized server functions.
- Remove silent query fallbacks that make unavailable data look like valid zeros.
- Preserve existing production events, carts, and orders; no synthetic counts will be added.
