# Roadmap — fix issues from test report (Oct 2026)

# Product and homepage videos
- [ ] Add product computer/link video input and vertical Instagram/YouTube previews.
- [ ] Add homepage muted looping video controls in Page Editor.
- [ ] Verify media validation, playback and mobile layout; record signed-in upload/save limitations.

# Room-photo sofa advisor
- [x] Add private, validated room-photo input and streamed AI Gateway catalogue recommendations.
- [x] Add independent admin control and usage reporting without changing existing Groq tools.
- [x] Test catalogue grounding, uploads, real AI response (HTTP 200 with two recorded sofas), Stop before first text and mobile presentation; 20 checks pass and preview builds successfully.
- [ ] Verify room advisor switch saving and usage readback in the signed-in admin screen — blocked: no Firebase staff session is available.

# WhatsApp call to action
- [ ] Add animated customer WhatsApp enquiry button using the saved business number.
- [ ] Add staff-only visibility, clicks, session click rate, page/device breakdown, trends and export.
- [ ] Test the button and reporting; state any live verification blocker.

# Coupon checks, AI reporting and consolidated CMS
- [x] Wire coupon validation to Apply and repeat checks when orders are created; discount eligible lines only; test rules.
- [x] Track real AI attempts, outcomes and active time; add staff-only overall/tool/person dashboard, filters and export.
- [x] Move Site CMS and Brand & Store into Page Editor subsections without changing their storage.
- [ ] Verify the new flows and document any credential-dependent checks.

# Free customer and admin AI
- [x] Add four individual admin AI switches with server-side enforcement and isolated persistence.
- [x] Test individual AI blocking, independent writes and staff authorization; 55 regression checks pass; desktop/mobile control layout verified.
- [ ] Verify live switch saving and readback in the admin screen — blocked: no signed-in Firebase staff session is available.
- [ ] Connect Groq Free securely — blocked: user will provide a valid GROQ_API_KEY later; xyz is not a usable credential.
- [x] Add four key-ready placements: customer sofa finder, product Q&A, admin description drafting and customer-reply drafting.
- [ ] Verify real responses and explain every AI placement and how to use it — blocked by provider connection.

# Admin files and productivity
- [x] Finish click-to-open full image previews in File Manager and admin image thumbnails; verify desktop/mobile, product forms and library picker without selection changes.
- [x] Add one-click PDF order invoice download with a QR code; verify real recorded amounts and rendered invoice text.
- [x] Add global staff keyboard shortcuts and editable shortcut settings; verify default keys, custom shortcuts and O then I downloads.
- [x] Connect File Manager and Notes & Todos to admin navigation.
- [x] Connect the product-image library picker.
- [x] Enable scheduled reminders across screens for signed-in staff.
- [x] Verify computer/link uploads, nested folders, custom names, product-draft image selection and notes/todos with deployed staff-only access rules.

# Product analytics dashboard
- [x] Diagnose missing analytics and prevent failed reads from appearing as zero.
- [x] Add professional per-product dashboard with interactive trend and audience graphs.
- [x] Verify real signed-in analytics, range controls and graph tooltips.

- [x] 1. Hide test products ("new item arrived", "testing 2 prduct") and "sample blog test" post
- [x] 2. Remove test orders (₹5/₹10), test cart, test visitor data (Stockholm)
- [x] 3. Cart Insights conversion rate calculation
- [x] 4. Welcome popup must not block Add to Cart
- [x] 5. 3D customiser loading screen (no blank white page)
- [x] 6. Account pages slow after refresh
- [x] 7. Product analytics slow first load
- [x] 8. Page flicker (hydration mismatch) on Collections / product pages
- [x] 9. Contact form send button + manufacturer add check
- [x] 10. Final verification run

# Splash and verified catalogue
- [x] Animated logo splash until home content is ready; verify loading and dismissal.
- [ ] Remove confirmed fake catalogue entries safely.
- [ ] Research seven supplier sofas with verified prices, variations and licensed exact models; replace only qualifying products.
- [ ] Ensure product 3D viewing never substitutes an unrelated generic sofa.

# Customer photo browsing and journey
- [x] Enable finger swiping between product images.
- [x] Add important customer FAQs without inventing policies.
- [x] Add an illustrated, scroll-animated visit-to-delivery timeline on home.
- [x] Verify gallery interactions, FAQs and timeline on desktop and mobile.

# Admin page editor
- [x] Refine tab alignment and selected states for desktop and mobile.
- [x] Verify the tab control on desktop/mobile and with keyboard navigation in an isolated presentation check; signed-in full editor was not retested.
- [x] Add drag-and-drop home and product page editor with section controls and preview.
- [x] Apply saved arrangements and added sections to storefront pages.
- [x] Test ordering, saving and storefront display with a temporary owner; restore original layouts and remove test account.
