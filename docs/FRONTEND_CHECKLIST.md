# Frontend checklist

Stack: Vite 8 + React 19 + TypeScript 6, React Router 7 (data router), TanStack Query 5, Zustand 5, Tailwind 4 + `index.css` design tokens, Swiper, lucide-react.
Contract: `../Backend/docs/api-reference.md`. The `docs/API_CONTRACT.md` referenced in the brief does not exist.

Baseline audit (before changes): typecheck ✅, build ✅ (single 505 KB chunk), lint ❌ (2 errors, 2 warnings), tests: none.

## P0: correctness and security
- [x] API client: typed `ApiError` (status/code/details); errors read from `message`; single-flight refresh on 401; 403 surfaced as access-denied
- [x] Access token held in memory only (was localStorage); session restored from the refresh cookie on load
- [x] `ProtectedRoute` waits for session restore (refreshing an admin page used to redirect to login); access-denied state for the wrong role
- [x] Shared login routes by the server-returned role; `/admin/login` redirects to `/login`
- [x] Cart prices/totals come from the server (`unitPrice`, `lineTotal`, `subtotal`). Previously `product.price × qty` was computed client-side, variant prices were ignored, and the drawer fell back to the wrong product (`products[0]`)
- [x] Cart "Shipping: Free" hardcoded → server quote
- [x] Cart update/remove send `variantId`
- [x] Remove hardcoded data: admin Orders/Customers/Coupons/Settings rows, `data/mock.ts`, fake notification preferences in localStorage
- [x] Checkout: Razorpay flow implemented (was disabled), idempotency key, double-submit guard, server-confirmed success only
- [x] Remove `console.log` of cart/orders data

## P1: missing features
- [x] Forgot/reset password pages
- [x] Account: addresses CRUD, order detail with status timeline and cancel, change password
- [x] Hero slider driven by the API: mobile/desktop images, video and poster, CTAs, alignment, overlay, alt text, autoplay with pause, keyboard and swipe, reduced motion, fallback
- [x] Catalog: URL-driven search/category/collection/sort/price/pagination; product detail with variant SKU/stock/price, gallery, related products, out-of-stock state
- [x] Wishlist: server-backed toggle; guests prompted to log in
- [x] Admin: dashboard (full stats), products and variants CRUD (stable variant `_id`, SKU, active flag, image removal), categories, hero manager (CRUD, drag reorder, schedule, activate, media upload with validation), orders (filters, status workflow, COD collection), inventory, customers, coupons, store and announcement settings
- [x] Admin layout: real sign-out, current user, mobile navigation

## P2: quality
- [x] Route-level code splitting (lazy pages)
- [x] Router error boundary and query error states
- [x] SEO: per-page `<title>`/description (React 19 metadata), product and category pages
- [x] Accessibility: labelled inputs (several were placeholder-only), focus-visible styles, `aria-live` toasts, cart drawer dialog semantics with Escape to close, `aria-current` navigation
- [x] Images: `loading="lazy"`, `decoding="async"`, explicit alt text
- [x] Lint errors (set-state-in-effect in ProductPage and AdminProductsPage)
- [x] `index.html` title and meta description

## Contract mismatches found (and resolution)
- [x] No public way to know whether COD/Razorpay are enabled → backend `GET /cms/checkout-options` added
- [x] No server-calculated totals before order placement → backend `POST /orders/quote` added
- [x] `AuthUser` typed with `_id` only; backend returns `id` and `_id` (fine)
- [x] `Order.items[].thumbnailImage` typed but older orders lack it → falls back to `image`
- [ ] Refresh cookie is `SameSite=Lax`: works while frontend and API share a site (localhost, or app.example.com + api.example.com). A cross-site deployment (e.g. `*.vercel.app` → `*.onrender.com`) needs `SameSite=None; Secure` on the backend. **Deployment decision, not changed.**
- [ ] `VITE_RAZORPAY_KEY_ID`, `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_ENABLE_ANALYTICS` are unused: the key ID comes from the server per payment, and uploads go through the API

## Testing
- [x] Vitest + Testing Library unit/component tests
- [x] Playwright end-to-end tests against the real backend and an in-memory MongoDB

## Found and fixed during testing
- [x] `formatDate(…, withTime)` threw `TypeError: Invalid option : timeStyle` (order pages would crash)
- [x] Cart "Updating…" state not shared across components (mutation keys + `useIsMutating`)
- [x] Product card buttons all named "Add to cart" (now product-specific accessible names)
- [x] Legacy `.hero-slide { display: none }` rule in `index.css` hid the new slider in real browsers (renamed to `hero-panel`; found only by Playwright)
- [x] Backend: clearing a hero schedule (`startsAt: null`) was coerced to 1970 and rejected (fixed, with a regression test)
- [x] Dev proxy targeted the production API on Render; it now defaults to localhost (`DEV_API_PROXY_TARGET`)

## Results (final run)
- Typecheck ✅ · Lint ✅ (0 problems) · Build ✅ (main chunk 275 KB, was 505 KB; per-page chunks)
- Vitest: 78/78 passing (7 files)
- Playwright: 4/4 passing (customer COD purchase with session reload, admin hero management reflected on the homepage, role access denial, mobile catalogue with no horizontal overflow) against the real API and an in-memory MongoDB
- Backend: 111/111 passing
