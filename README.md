# Helpy customer website

Desktop customer experience connected to contracts observed in the Helpy Android application.

## Documentation

- [Agent handoff](AGENT_HANDOFF.md)
- [Verified backend integration audit](BACKEND_INTEGRATION_AUDIT.md)
- [APK endpoint inventory](APK_ENDPOINT_INVENTORY.md)
- [Secure chat backend contract](CHAT_BACKEND_CONTRACT.md)

## Local development

```powershell
npm install
Copy-Item .env.example .env
npm run dev -- --host 127.0.0.1 --port 4173
```

The Helpy backend is always enabled and defaults to `https://admin.helpyapp.tech/api/v1`. Override `VITE_HELPY_API_BASE` only when intentionally targeting another Helpy environment. Booking currently stops at final review and creates no order or payment.

## Current customer integration boundary

The website reads the live catalogue, availability, account, bookings, notifications, wallet history and saved services. Authenticated customers can submit support requests, save or unsave services, and add, edit or delete addresses. Terms and privacy links come from the backend `policy` response. Checkout rechecks the selected slot and calls the read-only booking preflight, but **does not call `add-booking` or any payment endpoint**. These authenticated write paths still need an end-to-end staging check before production release.
