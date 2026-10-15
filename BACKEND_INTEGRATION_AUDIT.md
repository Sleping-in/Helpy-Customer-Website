# Helpy Laravel backend integration audit

## Outcome

The authoritative contract is the supplied Laravel checkout at `/Users/mo/Downloads/helpy-backend-abdullah`; production reads are supporting evidence only. Web and mobile use `https://admin.helpyapp.tech/api/v1` by default.

## 2026-10-04 repair status

- Availability now exposes `isAvailable=1` only for future, conflict-free slots and a separate `isBooked` flag.
- Notifications use `notification_history_id`; booking detail uses `GET` and its returned array/nested `booking_items`.
- Category images use the supported `64_64` size.
- Address fields, numeric Home/Work/Other labels, coordinates, add/update upsert, and delete now match Laravel.
- Wallet/profile nesting is corrected and `about_me` is persisted.
- Service results expose `review_count`, and grouped totals count the grouped result.
- Web/mobile chat exchange the custom token already returned by login and refresh Firebase sessions. A public Firebase client API key is still required at build time.
- Mobile now has live bookings/details, notifications, profile, saved locations, global search, availability, and preflight review.
- `/add-booking` and payment writes remain disabled until a sandbox payment path is approved. Favourites remain local-only by product decision.

The website now has an opt-in typed client in `src/api/helpy.ts`. The mobile and desktop sign-in screens use the verified email OTP contract when the API flag is enabled, retain session authentication across refreshes, and fall back to the existing demo flow when disabled. Enable it with the values shown in `.env.example`.

No captured bearer token, Firebase token, private key, OTP, or user record is stored in this repository.

## Verified request conventions

- Envelope: `{ status, message, data, code }`; `/guest-user` also returns a root-level `token`.
- Authentication: `Authorization: Bearer <token>` after guest or user authentication.
- APK context headers: `lan`, `long`, and `language`.
- POST bodies observed: `application/x-www-form-urlencoded`.
- Guest credentials belong in session storage, not source control or persistent local storage.
- The web origin passed CORS preflight for `authorization`, `content-type`, `lan`, `long`, and `language`.

## Live-verified read flows

| Flow | Method and route | Important data shape |
|---|---|---|
| Guest bootstrap | `GET /guest-user` | guest user plus root token |
| OTP configuration | `GET /get-otp-type` | enabled authentication methods |
| Send login OTP | `POST /otp-send` | multipart email/OTP purpose fields |
| Verify/login | `POST /login` | URL-encoded OTP and device metadata; root token |
| Language | `POST /user-language` | form: `language` |
| Banners | `GET /get-banner-list` | banner id/name/target/images |
| Categories | `GET /get-category-list` | category id/name/image URL |
| Featured services | `GET /get-featured-services-List?category_id=…` | service/vendor mapping records |
| Service browse | `POST /featured-services-List` | paginated `data.data` list |
| Popular providers | `GET /get-top-service-provider-list` | provider records and service setup |
| Provider detail | `POST /vendor-details` | service/vendor/category/booking type |
| Provider offerings | `POST /vendor-service-offered` | vendor service array |
| Provider availability | `POST /vendor-availability` | form: `vendor_id,date`; day/slot/date/availability |
| Reviews | `POST /get-reviews-list` | review array |
| Policies | `GET /policy` | customer/vendor policy documents |
| Regions | `GET /get-state` | 9 records; `id,name,name_ar` |
| Cities | `POST /get-city` | form: `state_id`; city/region/country/coordinates |
| User profile | `GET /get-user-profile` | identity, default address, wallet summary |
| Notifications | `GET /get-notification-history-list` | notification array |
| Order count | `GET /unseen-order-count` | `{ count }` |
| Booking lists | `GET /booking-list?status=0|1|2` | active/completed booking arrays |
| Wallet history | `GET /wallet-history` | wallet transaction array |
| Saved addresses | `GET /get-addresses` | authenticated address array |
| Favourites | `GET /my-favorites` | authenticated saved-service array |

`GET /get-addresses` returned `403` for a guest token and `200` for the authorized account. Saved addresses therefore belong to authenticated state. The map picker itself opened without calling `/store-address`; choosing a map point and persisting an account address are separate operations. Opening the bookings screen also calls `POST /mark-orders-as-viewed`, so that side effect must remain deliberate in the website.

## Static routes found but not transaction-tested

- Authentication/account writes: `/user-register`, `/forgot-password`, `/change-password`, `/delete-account`, `/update-user-profile`.
- Address write: `/store-address`.
- Booking: `/add-booking`, `/booking-list`, `/get-booking-details`, `/get-booking-cancel-reason-list`, `/cancel-booking`, `/reschedule-booking`, `/mark-orders-as-viewed`, `/unseen-order-count`.
- Payment/wallet: `/validate-promocode`, `/skipcash/create`, `/wallet-history`, `/wallet-topup-create`, `/wallet-topup-status`, `/payout-request`, `/sent-invoice`.
- Notifications/support: `/get-notification-history-list`, `/notification-mark-as-read`, `/notification-mark-all-as-read`, `/contact-us`.

These routes should not be wired by guessing. The APK explicitly blocked checkout for the guest session with “Please sign in to continue.” Email OTP and authenticated reads are now verified with an authorized account, but booking and payment writes still need a staging environment and payment sandbox before implementation.

## Website migration plan

1. **Foundation (implemented):** typed client, guest-session bootstrap, email OTP login UI, multipart and form encoding, session restoration, common headers, error type, environment switch.
2. **Read-only catalog:** replace page-local mock arrays behind adapters, screen by screen. Keep each current mock as loading/error fallback until the live response is visually verified.
3. **Location:** use browser geolocation/map search for the selected point; use `/get-state` and `/get-city` for address forms. Require user login before loading or saving account addresses.
4. **Authentication (partially implemented):** email OTP request, verification, token storage, and refresh restoration are connected. Add an explicit logout action and backend-supported `web` device type before production launch; the compatibility client currently uses the API's verified `android` value.
5. **Booking:** provider offerings and availability reads are implemented in the client. Next map selected service/vendor ids, duration and adjacent-slot rules; add idempotency and retry protection before enabling `/add-booking`. The live flow also requires an authenticated saved address before it reaches booking summary or payment.
6. **Payment:** integrate SkipCash only against its sandbox and backend-created payment sessions. Never place merchant credentials in Vite/browser code.
7. **Account parity:** bookings, wallet, favourites, notifications, reviews, profile, and saved addresses after authenticated contracts are verified.

## Security issues requiring backend-owner action

1. A complete Firebase Admin service-account private key was embedded in the APK. Treat it as compromised: revoke/rotate it immediately, remove it from mobile builds, and keep Admin SDK operations server-side.
2. The API currently responds to the tested browser preflight with `Access-Control-Allow-Origin: *`. Restrict production origins, especially before authenticated browser flows are launched.
3. Confirm rate limits and abuse controls on guest creation, OTP, login, global search, and payment-session creation.
4. Provide a staging environment and non-production credentials before any state-changing capture or end-to-end test.

## Definition of done for full connection

- Staging API URL and test account/OTP route supplied.
- Authenticated endpoint schemas captured without real customer data.
- Booking creation/cancel/reschedule tested in staging.
- SkipCash sandbox success, cancellation, timeout, and webhook reconciliation tested.
- No secrets in client bundles; production origins and rate limits restricted.
- Live adapters pass UI, error, empty-state, and responsive regression checks before mocks are removed.
