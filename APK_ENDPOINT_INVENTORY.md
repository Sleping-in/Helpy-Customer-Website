# Helpy APK endpoint inventory

## Source and confidence

This inventory came from static analysis of `app-release.apk` (`com.pass.helpy_user`, version `1.0.30`, version code 40) plus authorized runtime observation. The Flutter application logic is AOT-compiled in `libapp.so`, so a literal route proves presence in the APK but not its HTTP method, payload, authentication requirement, or continued server support.

Primary observed API base: `https://admin.helpyapp.tech/api/v1`.

Verified contracts and response shapes are in [BACKEND_INTEGRATION_AUDIT.md](BACKEND_INTEGRATION_AUDIT.md). Static-only routes must be tested against staging or backend source before state-changing use.

## Authentication and account

| Route | Website status |
|---|---|
| `/guest-user` | Implemented and verified |
| `/get-otp-type` | Client wrapper present; unused by current login UI |
| `/otp-send` | Implemented and verified for email login |
| `/user-register` | Missing; static-only contract |
| `/login` | Implemented and verified for six-digit email OTP |
| `/forgot-password` | Missing; static-only contract |
| `/change-password` | Missing; static-only contract |
| `/delete-account` | Missing; static-only contract |
| `/user-language` | Wrapper present; UI persistence not connected |
| `/get-user-profile` | Implemented and verified |
| `/update-user-profile` | Implemented; mutation needs staging verification |

## Catalog, businesses and reviews

| Route | Website status |
|---|---|
| `/get-banner-list` | Wrapper present; intentionally not rendered because the approved four local banners are used |
| `/get-category-list` | Implemented and verified |
| `/get-services-list` | Missing |
| `/get-featured-services-List` | Implemented and verified |
| `/featured-services-List` | Implemented and verified, page 1 with limit 100 per category |
| `/get-top-service-provider-list` | Implemented and verified |
| `/global-search` | Missing; website filters loaded businesses locally |
| `/vendor-details` | Implemented and verified |
| `/vendor-service-offered` | Wrapper implemented and verified; current business profiles use grouped catalog records |
| `/vendor-availability` | Implemented and verified |
| `/get-reviews-list` | Implemented and verified |
| `/add-review` | Missing; static-only contract |
| `/favorites-add-remove` | Missing; static-only contract |
| `/my-favorites` | Implemented and verified |

## Location and addresses

| Route | Website status |
|---|---|
| `/get-state` | Implemented and verified |
| `/get-city` | Implemented and verified |
| `/get-addresses` | Implemented and verified; user token required |
| `/store-address` | Implemented from Laravel validation; add/update upsert via `user_address_id` |
| `/delete-address/{id}` | Implemented from Laravel route and authenticated ownership check |

The backend uses `/store-address` for both add and update, and exposes `DELETE /delete-address/{id}`.

## Bookings

| Route | Website status |
|---|---|
| `/add-booking` | Deliberately not implemented; flow stops at final review |
| `/booking-list` | Implemented and verified for status 0, 1 and 2 |
| `/get-booking-details` | Implemented; needs a populated staging booking |
| `/get-booking-cancel-reason-list` | Missing |
| `/cancel-booking` | Missing |
| `/reschedule-booking` | Missing |
| `/mark-orders-as-viewed` | Missing; deliberate server mutation |
| `/unseen-order-count` | Wrapper implemented; badge not connected |

Observed field vocabulary includes `booking_id`, `booking_address_id`, `booking_cancel_reason_id`, `service_id`, `vendor_id`, `selected_date`, `payment_method`, `payment_status`, `promocode`, `wallet_amount`, and `payment_gateway_amount`. These strings are not a validated request schema.

## Payments and wallet

| Route | Website status |
|---|---|
| `/validate-promocode` | Missing |
| `/skipcash/create` | Missing; must use backend-created sandbox sessions |
| `/wallet-history` | Implemented and verified |
| `/wallet-topup-create` | Missing |
| `/wallet-topup-status` | Missing |
| `/payout-request` | Missing |
| `/sent-invoice` | Missing |

## Notifications and support

| Route | Website status |
|---|---|
| `/get-notification-history-list` | Implemented and verified |
| `/notification-mark-as-read` | Implemented; payload needs authenticated verification |
| `/notification-mark-all-as-read` | Implemented; authenticated verification required |
| `/contact-us` | Missing |
| `/policy` | Wrapper and verified read contract present; legal pages not connected |

## Firebase messaging

The APK uses Firebase Authentication and Firestore rather than the REST API for chat. See [CHAT_BACKEND_CONTRACT.md](CHAT_BACKEND_CONTRACT.md). Both observed projects reject unauthenticated reads. A secure server endpoint must mint short-lived Firebase custom tokens for authenticated Helpy users.

## Security findings

- A Firebase Admin service-account private key was embedded in the APK. The key value is not stored here. Treat it as compromised, revoke/rotate it, and keep Admin SDK operations server-side.
- The API accepted wildcard browser CORS during testing. Restrict production origins before enabling sensitive browser mutations.
- The APK allows cleartext traffic at manifest level although the observed primary API uses HTTPS.
- Booking, payment, account deletion and wallet mutations require staging, sandbox credentials, idempotency and explicit user confirmation.
