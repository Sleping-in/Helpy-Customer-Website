# Backend updates needed

This is the server-side work identified for the Messages/Firebase authentication issue as of 2026-10-09. It is a backlog, not a record of completed backend changes. The inspected Laravel routes do not currently expose a chat-token renewal endpoint.

## Messages authentication

- [ ] **Add an authenticated Firebase chat-token endpoint.** Validate the existing Helpy bearer token, resolve the same canonical Firebase UID used at login (`Helper::resolveFirebaseId`), mint a fresh Firebase custom token with server-held Admin credentials, and return a documented response such as `{ "customToken": "..." }`. Reject guest and invalid sessions. Do not cache the response; rate-limit requests and return clear 401/5xx errors.
- [ ] **Stop treating the login custom token as a reusable credential.** The current backend creates a one-hour token during login and saves it in the user's `firebaseToken` field. Return a login token for existing mobile clients as needed, but mint a new token for each authenticated renewal request; avoid retaining expired custom tokens in the database. Check mobile compatibility before removing that field.
- [ ] **Rotate the exposed Firebase Admin credential and keep its replacement server-side.** The previously inspected APK contained an Admin service-account private key. Revoke the exposed key, provision its replacement in protected backend configuration, and confirm no mobile or web build contains it.
- [ ] **Review and test Firestore access rules.** With two staging users, verify that each can load only permitted directories and conversations and cannot impersonate the other sender or write to an unrelated conversation.
- [ ] **Run lifecycle tests.** Confirm chat works immediately after login, when first opened more than an hour later, after an established Firebase ID token refreshes, and after the Helpy session expires. Record the endpoint schema and deployment configuration for web and mobile clients.

The affected browser's login custom token had the expected Firebase audience/project/UID but was expired when Messages first exchanged it, producing `INVALID_CUSTOM_TOKEN`. A new sign-in temporarily supplies a fresh token; it is not the backend fix. The frontend's retry and user-facing error handling are separate client tasks, not backend updates.
