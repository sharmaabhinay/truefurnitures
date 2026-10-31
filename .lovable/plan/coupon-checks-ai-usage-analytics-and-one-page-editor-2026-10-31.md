# Coupon checks, AI usage analytics, and one Page editor

## 1. Smarter coupon checks on "Apply"
Today the cart only checks whether a code exists, is active and hasn't expired. New checks, in this order, each with its own message:
- **Already used** — a signed-in customer who already placed an order with this code sees "You've already used this offer." Signed-out shoppers are asked to sign in before applying a one-per-customer code.
- **Eligible products** — admin can pick which sofas (or whole categories) a coupon applies to. If nothing in the cart qualifies: "This coupon isn't valid for the sofas in your cart." If only some qualify, the discount is worked out on just those sofas, and the cart says which ones.
- **Usage limit reached** and **minimum order not met** messages too.
- Checkout repeats the same checks on the server before taking payment, so a coupon can't get past the cart and then be misused.

Admin coupon form gains: "One use per customer" (on by default), "Applies to: all sofas / chosen sofas / chosen categories", and a list of who has used each coupon.

## 2. New "AI usage" section in Admin
Recorded for every use of the 4 AI tools (sofa finder, product Q&A, description drafts, reply drafts): who used it, which tool, when, how long the conversation stayed open, and whether it succeeded.

The screen shows:
- **Totals**: uses, unique users, total hours, average minutes per session, failures.
- **Per tool**: uses, users and time for each of the 4 tools, with a chart over time.
- **Per person**: a searchable table of customers and admins — uses per tool, total minutes, last used. Click a person to see their sessions.
- Date filters (7 days, 30 days, 12 months) and CSV export.

Time spent is measured from opening the AI box until it's closed or left idle for 2 minutes. Shoppers who aren't signed in are counted as "Guest" visitors. Only real uses from now on are counted — no past data or made-up numbers. Since the AI key isn't added yet, the screen will show zero until the AI is switched on.

## 3. Combine Site CMS into Page editor
Page editor gets sub-tabs: **Home layout**, **Product page layout**, **Hero & homepage text** (moved from Settings → Site CMS), and **Brand & store** (SEO, announcement bar, WhatsApp, delivery note). The Site CMS tab is removed from Settings. Settings keeps Keyboard shortcuts, API Config and Danger Zone. Old links and shortcuts to Site CMS go to the new place. Saving still works the same way.

## Technical details
- Coupons: add `applies_to` (`all|sofas|categories`), `sofa_ids[]`, `category_ids[]`, `once_per_customer` to the coupon document; per-line eligible-subtotal calculation in a pure helper shared by cart and checkout server function; prior-use lookup on orders by `user_id` + `discount_code` (excluding cancelled/trashed) done server-side via a `validateCoupon` server function.
- AI usage: `ai_usage` collection written server-side inside existing AI server functions (uses) plus a session ping on open/close from the AI panels (duration); staff-only rules; aggregation in a pure module with tests; new admin panel + shortcut.
- Page editor: move the CMS forms into page-editor sub-tabs, keep the same settings document writes.
- Tests: coupon rules (already used, non-eligible product, partial eligibility discount, limit, minimum) and AI-usage aggregation (totals, per-tool, per-user minutes).
