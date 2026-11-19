# VNWatch Frontend

## Cập nhật 04/10/2026 — QR demo

Checkout đã có **Mã QR demo trên website**: tạo đơn, xem mã/số tiền ngay trong chi tiết và bấm **Mô phỏng thanh toán thành công**. QR không chứa tài khoản ngân hàng, không chuyển tiền thật; quét không tự xác nhận. Chỉ chủ đơn xác nhận demo; QR chưa PAID không được giao, đã PAID không hủy/hoàn tiền trong bản này. COD vẫn là mặc định. Chi tiết: [QR-DEMO.vi.md](../vnwatch-backend/docs/QR-DEMO.vi.md). Những giới hạn về thanh toán online bên dưới chỉ nói đến tích hợp thật.

React + TypeScript storefront connected to the existing VNWatch NestJS API. Vite builds the app; the local development/preview server proxies `/api` to `http://127.0.0.1:3000`.

## Run locally

Requirements: Node.js 24.15+ in the 24.x line, npm, and the seeded VNWatch backend running on port 3000.

```sh
npm ci
npm run build
npm run preview -- --port 5173
```

Open http://127.0.0.1:5173. For source editing with hot reload, use `npm run dev` instead of preview. Both use the same API proxy. Native config loading avoids bundling Vite's config inside restricted Windows environments.

Vietnamese instructions: [HUONG-DAN.vi.md](./HUONG-DAN.vi.md). This workspace also includes [a Windows launcher](../start-vnwatch.ps1) for the existing local database and both applications.

## Implemented

- Responsive storefront, keyboard navigation, native dialogs, loading/error/empty states.
- Customer support chat: budget/brand/spec lookup, catalog-backed product cards and verified sources. FastAPI interprets questions via an optional OpenAI Responses connection; an explicitly labeled catalog mode runs without a key. Setup: [agent instructions](../vnwatch-agent/README.vi.md).
- API-backed catalog with debounced search, category, movement, availability and integer-VND price filters, pagination, newest/name/price sorting.
- Ten real products from Casio/G-SHOCK, Seiko, Citizen, Orient and Tissot, brand filter, actual photos with failure fallback, source links and separate real/demo datasets.
- Product detail deep links (`?product=<uuid>`), SKU selection, specification list, availability and prices from the API.
- Login required before adding products or opening the cart. Server cart writes validate the current session, active SKU and stock; revoked sessions return to login. Login returns to the selected SKU/requested screen; canceling login opens neither cart nor checkout.
- Account-owned server cart, favorites, three-product comparison and saved address book. Cart changes persist across logins/devices; cart does not reserve stock. Legacy shared browser carts are not assigned to an account.
- Registration, login, logout, profile updates, password changes, forgot/reset password, session listing/revocation and logout-all.
- Admin-only account directory and role/status changes with a required reason. Backend remains the authority for permissions.
- COD checkout, authoritative quote, retry with the same idempotency key after a lost response, order history/cancellation and staff order processing. A pending submission is retained in sessionStorage until confirmed or definitively rejected.
- Fixed-VND coupons with time/minimum/user/global limits; address selection at checkout. Order creation consumes coupon/cart/stock in one transaction.
- Private support tickets/replies, staff handling, completed-purchase reviews with admin moderation and demo warranty cards derived from completed orders.
- Admin catalog/SKU/price/stock editing with reason, audit and stale-update protection; promotions, all-time paid-COD reports/CSV and audit browser. Staff catalog access is read-only.
- FAQ, purchase/payment/privacy/demo-warranty information. Full scope and remaining integrations: [COMPLETENESS.vi.md](../vnwatch-backend/docs/COMPLETENESS.vi.md).

## Boundaries

COD is a local simulation with a fixed 30,000 VND delivery fee. Online payment/refunds, real email/SMS/shipping and per-watch warranty serials are not implemented. Coupons are configured by ADMIN, not pre-seeded as fake campaigns; cancellations do not restore coupon usage. Demo warranty activates only for completed/paid/delivered orders whose original line had a configured duration.

Real catalog information and prices are curated snapshots with linked sources, not a live supplier feed. On 03/10/2026 all existing variants were set to 100 units of simulated inventory at the user's request; new variants created by the development seed also start with 100. Orders decrement stock and pending-order cancellations restore it. Prices remain external references and warranty is unset for imported models. Both real and fictional products can be used for simulated COD. Product images load from external sources with an explicit failure fallback; the hero remains an original illustration. Google Fonts is optional.

Session tokens are kept in memory and never saved in browser storage. Reloading signs the UI out; login restores that account's server cart. Public browsing/comparison/advice remain available. Private APIs enforce authentication and ownership; management APIs enforce roles. For deployment, review a cookie-based session/BFF strategy. This is a local demo, not a production deployment.

Forgot-password uses the backend's local outbox; real email delivery is not configured. The form accepts a one-time token from that outbox. No development token-retrieval HTTP endpoint is introduced.

## Verification

```sh
npm run build
npm test
```

First run backend `npm test` to generate `.test-build` helpers and verify the isolated local `_test` database. Playwright uses installed Microsoft Edge with fresh contexts, a seeded local demo API and preview on 5173. Customer tests create unique local accounts and cancel their orders to restore stock. The management journey creates its own real NestJS app and PostgreSQL test schema, routes browser API calls to it, then drops only that schema. It does not create an ADMIN or modify roles in the dev database. Do not run these tests against production.

The suite covers real API catalog/filter and variant behavior, cart persistence, account lifecycle, an injected outage/recovery, desktop/mobile rendering, and browser runtime errors. Screenshots are written to the workspace `work` directory. See [VERIFICATION.vi.md](./VERIFICATION.vi.md) for observed results and unverified areas.

## Source map

- `src/App.tsx`: storefront, filters, orchestration and browser navigation.
- `src/Product.tsx`: product detail and cart.
- `src/Account.tsx`: customer authentication/profile/sessions and admin access management.
- `src/Assistant.tsx`: bounded session chat, mode labels, product/source cards and retry.
- `src/api.ts`: same-origin API client, timeout, Vietnamese errors and session expiry handling.
- `src/Shopping.tsx`: favorites, comparison, addresses, support, warranty, reviews and information.
- `src/Management.tsx`: catalog/SKU editing, coupons, reports/CSV, moderation and audit.
- `src/Orders.tsx`: COD quote/checkout, coupon/address selection and customer/staff orders.
- `src/components.tsx`: dialogs, feedback, icons and original SVG illustration.
- `src/styles.css`: responsive visual design and reduced-motion support.

Vite preview is for local demonstration. Public hosting needs a static host/reverse proxy that serves the build and routes `/api` to NestJS over HTTPS.
