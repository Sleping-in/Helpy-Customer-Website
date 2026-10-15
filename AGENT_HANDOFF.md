# Helpy customer website — agent handoff

Last updated: 4 October 2026.

## Goal and current boundary

The Laravel checkout at `/Users/mo/Downloads/helpy-backend-abdullah` is the authoritative API contract. Discovery, business services, availability, email OTP authentication, profile reads/edits, notifications, bookings, wallet reads, chat authentication and addresses now follow its routes, validation and nested responses. Favourites remain intentionally local-only.

The booking workflow intentionally stops at final review. Do not call `/add-booking`, create a payment, or display success until staging and payment sandbox contracts are supplied.

## Run and verify

```powershell
npm install
Copy-Item .env.example .env
# The backend is always enabled; optionally override VITE_HELPY_API_BASE in .env
npm run dev -- --host 127.0.0.1 --port 4173
npx tsc --noEmit
npm run build
```

Desktop entry: `http://127.0.0.1:4173/?desktop=1#home`.

`.env` is ignored. Never commit bearer tokens, OTP values, Firebase ID/custom tokens, merchant credentials, service-account JSON, or private keys.

## Important files

- `src/api/helpy.ts`: API client, session separation, encodings and route wrappers.
- `src/api/auth.ts`: email OTP adapter.
- `src/api/chat.ts`: Firebase custom-token exchange and Firestore adapter.
- `src/context/HelpyDataContext.tsx`: catalog/account loading and response mapping.
- `src/desktop/DesktopLiveViews.tsx`: business discovery/profile, availability, checkout review, bookings and chat.
- `src/desktop/DesktopAccountViews.tsx`: original profile and notification designs adapted to backend data.
- `src/desktop/DesktopWebsite.tsx`: desktop routing and global header.
- `BACKEND_INTEGRATION_AUDIT.md`: runtime-verified conventions and coverage.
- `APK_ENDPOINT_INVENTORY.md`: full route inventory and status.
- `CHAT_BACKEND_CONTRACT.md`: secure server requirement for messaging.

## Active architecture

`App.tsx` wraps navigation with `HelpyDataProvider`. Desktop widths render `DesktopWebsite`. Catalog reads use a guest token; private reads require a session explicitly tagged `user`, preventing a guest token from appearing logged in.

Catalog loading:

1. Guest bootstrap.
2. Categories.
3. Featured services, top providers and one service page per category.
4. Group services by nested `created_by.id` into businesses.
5. Search/category views show businesses; business profiles own service lists.
6. Service/date selection requests `/vendor-availability`.

After OTP login, profile, addresses, bookings, wallet history and notifications load from the Laravel-defined routes. The login response's Firebase custom token is retained only long enough to establish a client Firebase session.

## Backend-driven desktop flows

- Home: backend categories and grouped businesses; approved four local banners remain by design.
- Browse: business-first search and category filtering.
- Business profile: business identity, services, prices and live slots.
- Checkout: service, date, slot, authenticated address and notes; submit disabled.
- Profile: designed banner/cards/form using profile, wallet, booking, favourite and notification data.
- Notifications: designed list using backend title/body/time/read state and contextual routing.
- Bookings: backend status lists and detail refresh.
- Messages: Firestore adapter using the backend-issued login custom token; public Firebase client configuration is required.

## Contract caveats

- Backend mutations and populated booking variants still need staging/device verification.
- The analysis account had no bookings, addresses or favourites; populated variants remain unverified.
- Catalog requests page 1, limit 100 for every category. Add pagination/consolidation.
- `lan` and `long` default to Doha. Connect browser/selected-location coordinates.
- Business profiles are grouped from creator records; consider refreshing vendor detail/offerings on open.
- Mobile-width React pages still contain older local datasets.
- Legacy placeholder components remain in source but are inactive in desktop routing.

## Messaging continuation

Never copy a Firebase Admin credential into client code. Configure the public web API key (`VITE_HELPY_FIREBASE_API_KEY` / `EXPO_PUBLIC_HELPY_FIREBASE_API_KEY`) and test Firestore rules with two staging users. The login endpoint already returns the required custom token.

## Recommended next work

1. Re-authenticate the Firebase CLI and retrieve the public client configuration for project `helpy-61026`.
2. Run backend tests in an environment with PHP/Composer; this workstation has no PHP binary.
3. Capture populated booking/address/notification responses and tighten presentation edge cases.
4. Connect global search, pagination and authoritative business detail loading.
5. Add favourite toggle, review creation, unseen badges and logout.
6. Implement cancellation/rescheduling in staging.
7. Integrate booking creation and SkipCash sandbox with idempotency/webhooks.
8. Move mobile-width pages onto the shared live data layer.

## Safety constraints

- Do not probe state-changing production routes to discover schemas.
- Do not create real bookings, charges, payouts, addresses or profile changes without explicit authorization.
- Never expose Firebase Admin, SkipCash merchant or other server credentials to the browser bundle.
- Treat the embedded APK service-account key as compromised even if it still works.
