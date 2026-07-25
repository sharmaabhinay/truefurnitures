
# SofaCraft (working name) — Build Plan

A 3D-first custom sofa storefront for Indore & Ujjain with a full admin dashboard. Given the scope, I'll ship it in 4 phases so you get a working preview quickly and we iterate.

## Tech choices (locked)
- Frontend: TanStack Start + React, Tailwind v4, shadcn/ui
- 3D: React Three Fiber + drei + Three.js (GLB models, orbit/zoom, live material/color/size)
- Backend: Lovable Cloud (Postgres + Auth + Storage for GLB files & images)
- Auth: Email/password + Google for customers; admin role via `user_roles` table (secure, not on profile)
- Payments: **Reserve + pay later** via Razorpay (deposit online, balance on delivery/COD). Enabled in Phase 3.
- Analytics: Built-in dashboards + Plausible-style session insights. **Note on "live visitor location":** true real-time GPS of visitors isn't possible/legal without consent. I'll deliver IP-based approximate city + live session feed (active users, current page, referrer, device) — this is what "live insights" tools like Hotjar/Plausible actually show. Flagging so you're not surprised.

## Phase 1 — Foundation & storefront shell
- Design direction: I'll generate 3 aesthetic directions (premium furniture feel — think Burrow / Sabai / West Elm) and you pick one.
- Public routes: `/` (hero + featured sofas + city badges), `/collections`, `/sofa/$slug`, `/about`, `/contact`, `/showroom` (Indore/Ujjain locations w/ map & hours), `/auth`
- Database schema: `categories`, `sofas`, `fabrics`, `colors`, `sizes`, `addons` (cup holder, footrest, charging socket, etc.), `sofa_options` (which options each sofa supports), `pricing_rules`, `profiles`, `user_roles`, `addresses`
- SEO metadata per route, semantic HTML, city-targeted copy for Indore/Ujjain

## Phase 2 — 3D customizer (core experience)
- `/sofa/$slug/customize` — R3F canvas with:
  - Orbit / zoom / pan, environment lighting, contact shadows
  - Live swaps: fabric (PBR textures), color tint, seater count (2/3/4/L-shape swaps model variant), leg style, cushion firmness label, add-ons (cup holder, footrest pedal, charging socket) toggled as sub-meshes
  - Live price recompute as options change
  - AR-ready poster + mobile-optimized fallback (2.5D image swap for very low-end devices)
- Admin uploads GLB per sofa (base model + variant meshes) to Cloud Storage
- "Reserve this build" CTA → saves configuration to `sofa_configurations`

## Phase 3 — Cart, reserve+pay-later checkout, orders
- Cart of configured sofas (persisted for logged-in users)
- Checkout: address (Indore/Ujjain pincode validation), delivery slot, deposit % (admin-configurable), Razorpay for deposit, balance-on-delivery flag
- Order lifecycle: `reserved → in_production → ready → out_for_delivery → delivered → cancelled`
- Email/SMS-ready order confirmation (email via Cloud, SMS optional later)

## Phase 4 — Admin dashboard (CRM + CMS + analytics)
Protected `/admin` (admin role required):
- **Products/CMS:** CRUD sofas, upload GLB + textures, manage fabrics/colors/sizes/add-ons, pricing rules, publish/draft, hero slides & landing content, showroom pages
- **Orders:** kanban + table, status transitions, invoices (PDF), assign delivery, notes
- **CRM:** customers list, inquiry pipeline, per-customer timeline (visits, configurations saved, orders, notes, tags), export CSV
- **Analytics & live insights:**
  - KPIs: revenue, reservations, AOV, conversion, top sofas, top fabrics
  - Live sessions feed: active users right now, current page, referrer, device, approximate city (IP-based), session replay-lite (page path timeline)
  - Trends: 7/30/90-day charts
- **Settings:** deposit %, delivery pincodes, tax, staff invites, roles

## Technical notes
- Route architecture: `src/routes/_authenticated/*` for account, `src/routes/_authenticated/_admin/*` for admin (role gate via `has_role` SECURITY DEFINER function). Public routes stay top-level for SEO.
- All server logic via `createServerFn`; webhooks (Razorpay) under `/api/public/*` with HMAC verify.
- Storage buckets: `sofa-models` (GLB), `sofa-textures`, `sofa-images`.
- RLS on every table; `user_roles` separate from `profiles`; admin checks server-side only.
- Analytics: lightweight `page_events` + `sessions` tables written via a beacon endpoint; aggregated in admin. No third-party trackers.
- 3D perf: Draco + Meshopt compression, texture KTX2, lazy-load canvas, suspense fallbacks.

## What I'll do next (after you approve)
1. Enable Lovable Cloud
2. Generate 3 design directions and let you pick
3. Build Phase 1, then check in before Phase 2

## Open confirmations
- OK with **Razorpay** for the deposit gateway? (Best fit for India; Stripe also possible.)
- OK that "live visitor location" = approximate city from IP, not GPS?
- Do you already have GLB 3D models of your sofas, or should I use placeholder GLBs until you upload yours?
