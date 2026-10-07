# Candley Aroma Frontend

Vite + React 19 + TypeScript storefront and admin UI for the Candley Aroma API (contract: `../Backend/docs/api-reference.md`).

## Setup
```bash
npm install
npm run dev          # http://localhost:5173
```

### Environment variables (names only)
- `VITE_API_BASE_URL`: API origin, e.g. `http://localhost:5000`. Leave empty to use same-origin requests through the dev proxy.
- `DEV_API_PROXY_TARGET`: dev proxy target when `VITE_API_BASE_URL` is empty (defaults to `http://localhost:5000`; never production).
- `VITE_APP_URL`: public site URL, used for canonical links.

No secrets belong here. The Razorpay key ID is supplied by the API per payment. `VITE_RAZORPAY_KEY_ID`, `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_ENABLE_ANALYTICS` are not used.

## Scripts
| Script | Purpose |
|---|---|
| `npm run build` | Typecheck and production build |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm test` | Vitest + Testing Library (jsdom, mocked API) |
| `npm run test:e2e` | Playwright against the real backend (`../Backend/tests/e2e-server.ts` starts it on an in-memory MongoDB). First run: `npx playwright install chromium` |

## Architecture
- `src/services/api.ts`: the single typed API client. Access token in memory, refresh via httpOnly cookie, single-flight refresh on 401, typed `ApiError`.
- `src/hooks`: session restore/login (`useSession`), server cart/wishlist with optimistic updates (`useCart`, `useWishlist`), Razorpay flow (`useRazorpayPayment`).
- `src/utils/rules.ts`: client mirrors of backend validation rules (the server remains authoritative).
- Routes are lazy-loaded per page (`src/routes/router.tsx`). Role checks in the UI are for navigation only; the API enforces permissions.

See `docs/FRONTEND_CHECKLIST.md` for the audit, fixes and test results.
