# Cart tracking fix, product analytics, saved addresses, manufacturers

## 1. Fix the missing cart/visit tracking (root cause found)

Only popup events ever reached the shared activity log — page views, product views, 3D views and add-to-cart were silently dropped, so Cart Insights showed nothing.

- Cause: each tracked event is saved with empty optional fields (no product, no city), and the database rejects the whole record.
- Fix: drop empty fields before saving, and confirm by adding an item to the cart in a real browser session and seeing the counts move in Admin.
- Add-to-cart events will also record the product id and slug, so per-product numbers are exact instead of matched by name.

## 2. Product analytics (per product)

A **View analytics** action on every product card/row opens a dedicated product analytics page showing:

- Impressions (listing views), product page views, 3D views, add-to-cart count, active carts holding it, orders, revenue.
- Conversion rates: view → cart, cart → order, view → order.
- A trend graph of views / cart adds / orders over time, with **7 days / 30 days / 12 months** filters.
- Viewer breakdown: device type, browser, city, top referring pages.
- Recent activity list and quick links to the existing product orders and product cart-holders pages.

Tracking for listing impressions, product views and 3D views is added where missing so these numbers are real.

## 3. Address remembered from the last order

- At checkout, the delivery name, phone, address, city and pincode are prefilled from the customer's saved default address, falling back to their most recent order.
- Each completed order saves/refreshes that address so the next order is prefilled automatically. The customer can still edit anything before paying.

## 4. Manufacturers section (Admin)

New **Manufacturers** area with a list and a detail page.

Per manufacturer: company/contact name, phone, email, location, partner since date, status (active/ended), specialities, notes.
Deals and money: deal list with value and dates, last deal, total payout agreed, amount paid, balance left (admin can edit amounts and log payments with dates), last payment date.
Delivery performance: products delivered for us, orders assigned to them, assigned days vs actual days taken, average delay.
Ending a partnership: end date plus a required reason, kept on record.

Orders can be assigned to a manufacturer, and the manufacturer page lists all of their assigned orders.

## 5. Admin navigation regrouped

Sections are grouped by what they relate to:

- Overview: Dashboard, Sales Analytics, Cart Insights, Visitor Analytics
- Catalogue: Products, Reviews, Saved Designs, Showrooms
- Sales: Orders, Customers, Quote Requests, Coupons, Messages
- Supply: Manufacturers, Carpenters, Carpenter Requests
- Marketing: Ad Campaigns, Subscribers, Blog, Careers
- System: Settings, Trash

## Technical details

- Tracking: strip `undefined` before the write in `src/lib/visitor-tracker.ts`; extend `VisitorEvent` with `sofaId`/`slug`; emit `product_view`, `view_3d`, `impression` from the product page, 3D viewer and collection grid.
- New staff-only server function `getProductAnalytics` in `src/lib/admin-data.functions.ts` aggregating visitors, carts and orders for one product; new route `src/routes/_authenticated/admin.products.$id.analytics.tsx` with a lightweight SVG chart (no new dependency).
- Addresses: reuse `user_addresses`; checkout prefill helper plus an upsert after order creation.
- Manufacturers: new `manufacturers` collection (+ `manufacturer_payments` embedded array) with staff-only rules in `firestore.rules`; admin CRUD component `src/components/admin/manufacturer-manager.tsx` and detail route; `orders.manufacturer_id` used for assignment.
- Verify with a real browser add-to-cart run and a clean build.
