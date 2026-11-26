# Roadmap — fix issues from test report (Oct 2026)

# Dashboard redesign comment a0c70229-4ca3-474f-b829-611a6304bc96
- [x] Redesign dashboard metrics, chart, recent orders, quick actions and navigation without changing stored data or business calculations.
- [x] Verify presentation at 320px, 360px, 768px and 1280px: all 12 metrics, five quick actions, recent-order rows and locations fit; seven button callbacks, chart tooltip, loading and error/retry states pass with no overflow or page errors. Seventeen existing analytics/shortcut tests pass; preview build OK. Reply to the thread with these results.
- [ ] Verify dashboard data and navigation in the actual signed-in admin screen — blocked: the available account session does not authenticate this app’s Firebase login; /admin redirects to /auth. Isolated checks use temporary in-browser layout fixtures, not stored customer data.

# Order tracking and Real Homes gallery
- [x] Add public seven-stage tracking, phone-protected workshop photos and signed-in all-orders tracking with header/footer links.
- [x] Add locality-tagged customer photo submissions for delivered purchases and staff review before publication.
- [x] Public tracker verified with TF-53433 on phone, gallery loads with no errors; signed-in photo submission and staff approval not yet exercised.

# Cart consistency sweep
- [x] Read product/customiser additions, Buy Now, cart controls, header, checkout summary/order transaction, local/remote cart persistence, saved/shared-design links and staff cart reports. Fixed Buy Now adding an extra unit and cart decrement refusing zero removal. Both real public flows pass on mobile; 12 unit tests pass. Account cart sync, signed-in checkout and staff readback remain unverified; settled records unchanged.

# Saved cart button comment e91f2776-edd3-488a-a101-007503e40e65
- [x] Show separate quantity controls for saved customiser builds on the product page. Verified actual add, product-page plus, reload persistence, minus and zero removal on a 360px phone; 12 tests pass. Reply to the thread with the fix and verification limits.

# Product benefits comment 47bc2a93-1291-414d-a83f-ea21353d0c36
- [x] Improve the marked benefits section with compact phone rows, aligned icons and subtle dividers; all six benefits verified at 320px, 360px, tablet and desktop without overflow or page errors. Reply to the live thread with these results.

# Storefront cart quantity controls
- [x] Verify actual product and customiser cart additions, reopen each page, increment/decrement and restore Add to Cart at zero. Ten unit tests pass; desktop and 360px phone checks pass without page errors or overflow.

# Product editor layout
- [x] Finish phone tab layout and keyboard checks; all five tabs reachable at 320px, 360px and desktop, with arrow/Home/End navigation and Save visible; isolated browser checks pass without page errors, and preview build passes.
- [ ] Verify the actual Edit Product window while signed in — blocked: the browser redirects to sign-in and no Firebase staff session or test credentials are available.

# Product and homepage videos
- [ ] Add dedicated Videos admin controls for hero screen uploads and per-video visibility.
- [ ] Start visible videos silently in a loop, with honest Instagram playback limitations.
- [ ] Add per-video insights and verify controls, playback, persistence and tests.
- [x] Source licensed Full HD real-sofa footage for the fourth hero slide. Desktop/mobile playback, muted audio, pause/resume, slide navigation and reduced-motion pause verified in the local preview; two placement regression tests pass, no page errors or horizontal overflow. Video is illustrative, not a catalogue-product claim.
- [x] Fix signed upload validation rejecting video; seven regression tests pass. Signed-in desktop/tablet/mobile computer uploads, Save/reload readback, direct link edits and correct muted storefront playback verified. Original video settings restored; temporary admin and four test uploads removed.
- [x] Add product computer/link video input and vertical Instagram/YouTube previews.
- [x] Add homepage muted looping video controls in Page Editor.
- [x] Verify six media/upload-access checks, isolated muted playback/pause/resume, deferred social player and phone layout with no page errors; preview build passes.
- [ ] Verify actual staff upload/save/readback and real public social-video playback — blocked: no signed-in Firebase staff session or supplied product video/social link.

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
- [x] Shorten entry to first-screen readiness or a 1.8-second cap after hydration; remove spinning logo border. Three timing tests pass; phone/desktop checks with five-second image/font delays dismissed the splash in 2.8–3.1 seconds including initial startup, with no page errors or overflow and no repeat on navigation.
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
- [ ] Add click-to-select visual editing for header navigation, sections, content, buttons and homepage/product images.
- [ ] Add responsive desktop/tablet/mobile preview, section design controls and draft-only AI layout proposals using the existing free Groq connection.
- [ ] Add focused validation tests and verify visual interactions, build, saved readback and AI response; AI remains credential-blocked until a valid GROQ_API_KEY is supplied.
