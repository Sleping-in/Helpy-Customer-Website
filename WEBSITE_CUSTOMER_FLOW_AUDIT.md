# Website customer journey and missing screens

Date: 12 October 2026. Scope: customer website, including payment and aftercare; excludes the React Native app and vendor/admin dashboards.

This is a source audit, not an end-to-end production test. “Existing” means the active desktop website implements a surface; it does not certify that every operation works against the deployed backend. A surface can be a full page, dialog, section, or state of a shared page. One API endpoint does not imply one screen.

## Evidence and source boundary

- Active website routing: `src/desktop/DesktopWebsite.tsx`, `src/desktop/DesktopLiveViews.tsx`, `src/desktop/DesktopAccountViews.tsx`.
- Client contracts: `src/api/helpy.ts`, `src/api/auth.ts`, `src/api/chat.ts`, `src/context/HelpyDataContext.tsx`.
- URL and history behavior: `src/context/NavContext.tsx`.
- Under 768px, `src/App.tsx` switches to separate older website components. The desktop inventory below cannot be treated as proof of phone-browser parity.
- Backend: `/Users/mo/Downloads/helpy-backend-abdullah`, checked against `/Users/mo/Downloads/helpy-backend-main.zip`.
- The routes and inspected booking, payment, promo-code, review-controller, payout-controller, and wallet-service files match the ZIP. The local `UserController.php` includes About me saving absent from the ZIP; the local `ServiceSetup.php` includes review counts and a pagination-count correction absent from the ZIP. The ZIP also contains debugging `dd(...)` calls in OTP/Apple-token error handling. Deployed behavior must be checked before relying on these differences.

Legend: **Existing** = active UI exists; **Partial** = existing UI needs extension or correct integration; **Missing** = required customer flow has no active implementation; **Conditional** = supported or desirable only if included in the product.

## 1. First visit and getting an account

| Surface | What the customer should see/do | Current website | Backend contract |
|---|---|---|---|
| Public entry/home | Browse without signing in; clear sign-in and account-creation choices; recover from catalogue failure. | Existing home/guest bootstrap; registration entry missing. | `GET guest-user`, `GET get-banner-list`, `GET get-category-list`, `GET get-settings-data` |
| Sign in | Enter the supported email/phone identifier; explain where the code will arrive. | Partial: email OTP for returning accounts exists. | `POST otp-send` with `type=login`, `POST login`; `GET get-otp-type` is available if authentication should follow server configuration. |
| Create account | Name, email, phone, relevant terms/privacy links, and verification. An unknown email must have a path forward rather than just a sign-in error. | Missing. | `POST otp-send` with `type=register`, `POST user-register`; registration requires name, email, phone, and six-digit OTP. Password is nullable. |
| Verify identity | Code entry, resend, change email/phone, invalid/expired-code feedback, retry protection. | Partial: login code entry/resend exists; registration verification and the complete recovery path do not. | `otp-send`, `login`, `user-register` |
| Complete missing contact details | Collect information still needed for contact, payment, or a selected social-login method. | Missing as a distinct onboarding state. | `get-user-profile`, `update-user-profile`; `store-personal-info` exists specifically for Apple-related contact completion, not a generic onboarding substitute. |
| Resume intended action after sign-in | Return to the selected business, service, saved action, or checkout draft. | Missing reliable flow: current successful login resets navigation to home. | Frontend state/routing; no separate endpoint needed. |
| Authentication alternatives | Google/Apple sign-in and any required follow-up details. | Conditional; not wired into active website auth. | `social-media-login`, `get-apple-token`, `store-personal-info` |
| Password management/recovery | Change password; emailed reset link and reset result. | Conditional: current website is passwordless, so these must not become mandatory OTP screens. | `change-password`, `forgot-password`, `reset-password`; verify customer suitability of shared handlers first. |

## 2. Location and discovering the right service

| Surface | What the customer should see/do | Current website | Backend contract |
|---|---|---|---|
| Service-location chooser | Choose saved Home/Work/Other, select a default, or use a map; show which location discovery is based on. | Partial: saved-address management exists; a consistent discovery-location selection/persistence flow is incomplete. | `GET get-addresses`; `POST store-address` accepts `is_default`. Catalogue distance uses `lan`/`long` headers; current client defaults them to central Doha. |
| Add/edit/delete address | Search/pin location, complete building/street/zone/municipality/area, confirm edits or deletion, and return to the calling checkout. Include permission-denied/manual entry paths. | Existing dialog and CRUD calls; needs end-to-end testing, default-address support and reliable return to checkout. | `get-addresses`, `get-state`, `get-city`, `store-address` (`user_address_id` for edit), `DELETE delete-address/{id}` |
| Categories and service-type results | Home → category → service type/business choices. Empty category and unavailable service states. | Existing category/listing surfaces; not every backend discovery option is exposed. | `get-category-list`, `get-services-list`, `get-featured-services-List`, `featured-services-List`, `get-top-service-provider-list` |
| Search results | Search across services/businesses; query shown, clear search, no-results feedback, complete results. | Partial: active website filters its already-loaded catalogue locally. | `POST global-search` is available; not connected in the website client. |
| Filters, sort, and more results | Service type, price range, distance and supported sort orders; load beyond the first page. | Missing/partial: category filtering exists, but catalogue loads page 1 with a 100-row limit. | `featured-services-List`: `category_id`, `service_id`, price range, distance, sort, page/limit; `get-max-price-service` can provide a filter bound. Rating filtering in the inspected query is commented out, so do not advertise it as working. |
| Map-based discovery | See available businesses/services spatially and open the matching details. | Conditional additional view. | `POST map-featured-services-List`; not required to duplicate the existing address map. |
| Offers/promotion destination | Banner goes to the right item; an offer page shows actual offer conditions and eligible services. | Partial: deals/offers routes share the generic catalogue view. | Banner data and `validate-promocode` exist; no dedicated customer offers-list/detail endpoint was found. Do not invent a complete promotions catalogue. |
| Business overview | Correct business identity/logo, available profile information, categories, ratings/reviews, its services, and a way to contact it. | Partial: business overview/service selection exists inside `service-detail`; it uses catalogue-grouped services rather than explicitly loading the complete vendor offering. | `POST vendor-details` requires a service mapping ID; `POST vendor-service-offered` requires vendor ID **and** category ID. `vendor-business-info` is vendor-only and cannot be used as a customer business-profile API. |
| Service details | Description/images, price, duration, service type, location expectations, ratings/reviews; choose this specific service. | Existing service preview/selection; service-type expectations and some returned metadata need completion. | `vendor-details`, ServiceSetup accessors, `bookingType` relation |
| Read reviews | Rating distribution/filter where supported, text, reviewer, date, images, and more results. | Partial: basic review route exists; discovery links, filters and complete review experience need finishing. | `POST get-reviews-list` accepts service mapping ID, rating, and optional page; review resource supplies text/image/reviewer information. Review-count availability differs between local source and ZIP. |
| Saved services | View, unsave, reopen the correct service/business; sign-in then resume a save action. | Existing service-level favourites integration; needs verification and consistent destinations. | `favorites-add-remove`, `my-favorites`; the contract is service mapping + provider + user, not an unrestricted business-level favourite. |

## 3. Building and reviewing a booking

| Surface | What the customer should see/do | Current website | Backend contract |
|---|---|---|---|
| Service and appointment selection | Select service, date, start/end time; understand duration, no availability, expired slots, and overnight appointments. | Existing selection; conflict recovery and complete time/duration handling need verification. | `vendor-service-offered`, `vendor-availability`, `slot-availability`; returned slot/result flags must be interpreted rather than treating every HTTP success as availability. |
| Service-type/location step | Doorstep: customer service address. On-premise: show where the customer goes. Digital: clear remote expectations. Collect only applicable details, with a supported backend payload. | Missing consistent branching: the active review currently always asks for a saved service address. | Booking types: On-Premise, Digital, Door-Step. `add-booking` currently requires location/address/address ID even for other booking types; the backend/product contract must resolve that before hiding required fields. |
| Requirements/instructions | Explain access, notes, and service-specific needs without exposing API implementation copy. | Existing notes input; validate how requirements are submitted/displayed. | `add-booking` has `requirements`; booking details returns them. |
| Multiple services from the same business | If supported in the product, select several services with an understandable total and appointment duration. | Conditional; current website uses a single selected service. | `add-booking` accepts a `services` array but uses one provider and one start/end interval. This does not establish a multi-business cart contract. |
| Booking review | Service/business, correct date/time and timezone, address or service location, instructions, itemized subtotal/discount/final amount, and an edit route for each selection. | Partial: review UI exists, stops before submission, and draft identity is not durable across reloads/auth. | `slot-availability`, `booking-preflight`, eventually `add-booking` |
| Apply promo code | Enter/remove a code; show discount and revised total; invalid/expired/not-yet-valid errors. | Missing. | `POST validate-promocode`: code + service mapping ID; returns promo ID and discount percentage. Booking accepts corresponding promo/discount fields. |
| Choose payment method | Wallet balance, amount covered, remainder; wallet-only, online, wallet+online, cash, wallet+cash when allowed. Do not expose an unsupported saved-card list. | Missing in the active live checkout. | `booking-preflight` accepts payment type and returns coverage/shortage/next step; `GET check-COD-available` requires vendor ID. Current preflight call discards its response and does not send a selected payment method. |
| Insufficient wallet/payment unavailable | Top up or choose another method; explain cash restrictions or gateway maintenance; retain the draft. | Missing. | Preflight `can_proceed`/`next_step`; payment routes can return maintenance 503; COD availability. |

## 4. Submission, payment, and returning to the website

| Surface | What the customer should see/do | Current website | Backend contract |
|---|---|---|---|
| Submit booking / processing | One clear confirmation action; disable duplicate submission; show validation/conflict recovery and retain the result ID. | Missing active write flow; intentionally disabled. | `POST add-booking` creates booking/items/payment records. A successful response is not automatically a completed online payment. |
| Online payment | Secure gateway checkout, necessary billing/contact details, any gateway-owned verification step, and a safe way back. | Missing live integration. Old demo payment components are not proof of a connected checkout. | `POST skipcash/create`; server can return SkipCash checkout data **or Tap configuration**, depending on server/user settings. Tap responses need not contain a pay URL. Do not force every response into a redirect-only implementation. |
| Payment return / verifying | “Checking your payment”; wait for backend confirmation, tolerate delayed callbacks, reload or returning in another tab. | Missing. | Gateway webhooks update backend records; `GET get-booking-details` supplies payment/booking state. `paymentReturnURL` currently echoes request data as JSON, not a working website-return page or proof of payment. |
| Confirmed booking | Real service/date/time/address, what happens next, payment breakdown and cash due where applicable; View booking / contact business. | Missing genuine success screen. Active `booking-success` says no booking was submitted. | `add-booking` plus reloaded booking details; wallet/free/cash and online paths have different completion conditions. |
| Payment failed / cancelled / still pending | Distinct explanations; retry or change method where supported; go to booking; avoid another charge or duplicate booking. | Missing. | Payment/booking states and gateway responses; resume checkout against the existing pending booking when valid. A safe retry contract must be verified. |
| Resume awaiting-payment booking | Find an unpaid booking after closing the gateway, signing out, refreshing, or returning later; continue payment or cancel. | Missing action flow; list mapper already recognizes awaiting-payment status. | `booking-list`, `get-booking-details`, `skipcash/create`; customer list/details can supply status without inventing a new customer payment-status route. |

## 5. Managing the booked service and aftercare

| Surface | What the customer should see/do | Current website | Backend contract |
|---|---|---|---|
| My bookings and unread activity | Upcoming, in progress, completed, cancelled, rejected, awaiting payment; useful date/time and service details. Mark activity viewed on entry. | Existing list/status mapping; unread lifecycle incomplete. | `booking-list`, `unseen-order-count`, `mark-orders-as-viewed` |
| Booking details/status | Schedule/end time, business, items, location, requirements, subtotal/discount/wallet/online/cash amounts, status and available actions; cancellation/rejection reasons when returned. | Existing details and basic payment summary; action/state coverage needs completion. | `get-booking-details`, Booking/BookingItems/BookingDetails/Payments relations; no customer live-GPS tracking endpoint found. |
| Reschedule | Select valid replacement date/time; old/new summary; confirm; conflict, not-eligible and success states. | Missing. | `vendor-availability`, `slot-availability`, `POST reschedule-booking`; server-side ownership/status eligibility needs review before enabling. |
| Cancel booking + refund explanation | Customer cancellation reasons, cancellation policy, fee/refund destination before committing; success and revised booking/wallet state. | Missing. | `get-booking-cancel-reason-list`, `POST cancel-booking`, `wallet-history`. WalletService applies time-based penalties and credits eligible refunds to the wallet. No cancellation-quote endpoint found, so exact authoritative pre-confirmation fee/refund needs a backend addition or agreed contract. |
| Receipt / invoice | Read itemized paid/due breakdown; email invoice; sending/error/sent feedback. Download only when a customer-authorized URL exists. | Missing invoice action. | `POST sent-invoice` emails generated PDF; download route found in `routes/web.php` is admin-only, not a customer download API. |
| Write review + submitted review | Completed-booking stars/text, optional image, service(s) reviewed, submission/result, already-reviewed state. | Missing write flow. | `POST add-review` expects service mapping **array**, provider, booking, text, rating 1–5, optional image; booking response includes `is_review_added`. No review edit/delete endpoint found. Server eligibility/ownership must be verified. |
| Book again | Reopen correct business/service and choose a fresh slot; refresh price and availability rather than duplicating old payment data. | Missing convenient action; can reuse existing screens. | Existing catalogue/details/availability endpoints; no new repeat-booking endpoint required. |
| Contact the business / conversations | Start the correct provider conversation from business or booking; list, thread, send, session-error/retry and return to originating booking. | Existing chat UI, but complete session lifecycle and provider entry points need finishing. | Firebase/Firestore chat, not a customer Laravel chat-history API. Fresh custom-token renewal remains a backend gap. |

## 6. Wallet, ongoing account use, and exit

| Surface | What the customer should see/do | Current website | Backend contract |
|---|---|---|---|
| Wallet balance/history + transaction detail | Credits/debits/refunds/top-ups, signed amounts, date/status, related booking, readable breakdown. | Existing balance/history; a transaction-detail/result surface and clearer associations are incomplete. | `get-user-profile`, `wallet-history`, transaction model data |
| Add wallet funds | Choose amount, understand payment, handle missing address before checkout, enter gateway. | Missing active flow. | `POST wallet-topup-create`; amount >= 1, requires a saved address. |
| Wallet top-up result/recovery | Verifying/success/failed/pending states; refresh balance only after authoritative confirmation; resume after leaving payment. | Missing. | `GET wallet-topup-status` scoped to user + transaction ID, gateway webhooks, refreshed profile/history |
| Withdraw funds | Amount/destination, confirmation and pending/approved/rejected history. | Conditional and backend-dependent, not a ready customer feature. | `payout-request` appears in customer and vendor route groups with the same method/URI; handler writes vendor-shaped withdrawal records, and `payout-history` is vendor-only. Resolve customer authorization, destination and history contract first. |
| Profile editing/photo | Name/email/phone and profile image, validation and saved/error states. About me only when the deployed backend actually persists it. | Existing text editing; photo upload missing. About me differs between source copies. | `get-user-profile`, `update-user-profile` supports `profile_photo`; ZIP lacks the local About me update. |
| Notifications | List, unread/read, relevant booking/conversation destination, updated unread state and expired target recovery. | Existing calls/UI; destination IDs and refresh behavior need verification. | `get-notification-history-list`, `notification-mark-as-read`, `notification-mark-all-as-read` |
| Language/preferences | If English/Arabic are offered: selection, translated content, RTL layout and persistence. | Conditional; no complete Arabic website experience. | `POST user-language` (`en`/`ar`), language headers and bilingual model fields. No customer notification-preferences mutation endpoint found. |
| Support/help | Contact form with accurate account/contact/booking context; submitted/error states; help and policies reachable before/after login. | Existing support/policy surfaces; FAQ-style help content and context can be improved. | `POST contact-us`, `GET policy`; no customer ticket-history or dispute-tracking endpoint found. |
| Account deletion | Explain consequences, confirm, handle blocked ongoing bookings, successful exit and session cleanup. | Missing. | `POST delete-account`; blocks statuses 0/1 in inspected controller. Pending payment/wallet treatment needs an explicit policy. |
| Sign out/session expired | Sign out, clear account/Firebase state; prompt on expired session and return to intended action after reauthentication. | Partial: sign-out handling exists; full expiry/resume flow needs completion. | `POST logout`, authentication failures; frontend route/draft restoration. |

## Cross-cutting missing states

- Preserve entity IDs and checkout/booking context across refresh, browser Back/Forward, sign-in, copied links, and payment return. Current hash-only navigation keeps parameters in React memory and clears them on browser navigation.
- Loading/skeleton, empty, disconnected, error/retry, unauthorized, deleted/unavailable service/business, unavailable slot, and duplicate-submit protection throughout the journey.
- Gateway verification/challenge is normally owned by the payment integration; it does not need an invented Helpy card-verification page.
- Use real server-confirmed booking/payment state; never show success just because a gateway return URL was opened.
- Make website flow/functionality consistent below and above 768px. This is a browser requirement independent of the paused native app work.

## Backend decisions/fixes before enabling the full flow

1. **Payment authority and safe retries:** preflight accepts a supplied final price; booking creation accepts many client-provided totals/discount fields. Establish server-side pricing, eligible promo calculation, ownership and idempotency before launch. Verify mixed wallet/online accounting and callback processing in a sandbox.
2. **Website payment return:** connect gateway callbacks/redirects to a real website route and recover the exact booking/top-up. The current return handler only emits JSON. Verify Tap configuration and SkipCash response formats independently.
3. **Cancellation/refund preview:** expose authoritative fee, refund amount/destination and eligibility before confirmation. Current wallet rules are time-sensitive, and the customer cancellation result does not supply a standalone refund quote.
4. **Action authorization:** reschedule fetches booking by ID without scoping its initial lookup to the authenticated user; invoice and add-review handlers also need ownership/eligibility verification before exposing those actions. Do not infer safe eligibility from a visible button or route name.
5. **Service-type location requirements:** resolve why every booking currently requires an address ID even for digital/on-premise services. Do not fabricate a placeholder address to satisfy validation.
6. **Chat lifecycle:** authenticated renewal of server-minted Firebase custom tokens and session/reconnection behavior.
7. **Source parity:** settle About me persistence, review-count fields, pagination totals and clean OTP error responses between the checked ZIP, local source and deployed API.
8. **Customer withdrawal contract:** fix or clarify duplicate payout routing and provide customer-owned destination/history semantics if withdrawals are included.

## What does not automatically belong in this customer build

Vendor subscriptions/Apple in-app purchases, vendor dashboards, availability management, vendor service creation, vendor bank setup, earnings, payouts and quick-reply administration are vendor-side flows. Webhooks are server integrations, not customer pages. Saved-card management, live provider GPS tracking, ticket history, review editing, a multi-business cart and a dedicated promotions catalogue do not have verified customer contracts in the inspected backend. They require separate product decisions and, where needed, backend work.

## Suggested build sequence

1. New-customer registration + verification + resume after sign-in; durable website route/draft identity.
2. Consistent chosen location, complete catalogue/search and business/service/type selection.
3. Booking review, promo validation, payment-method/preflight handling and complete submission contract.
4. Gateway integration, authoritative result/recovery, awaiting-payment continuation; sandbox verification before enabling writes.
5. Reschedule, cancellation/refund explanation, invoice and reviews.
6. Wallet top-ups/results, profile photo/account deletion, chat lifecycle and notifications.
7. Conditional product features only after scope/contract decisions; browser-size parity and end-to-end QA throughout.
