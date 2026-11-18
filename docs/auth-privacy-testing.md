# WhatsApp login, account deletion and testing

Implemented 5 November 2026:

- Temporary phone-only login is enabled on production while the WhatsApp authentication template is unavailable. The app reads `/customer-auth/login-options`, shows Continue and opens the existing client account by registered phone number. Unknown numbers are rejected. Set `PHONE_ONLY_LOGIN=false` and restart the API to restore OTP and revoke phone-only sessions. The latest production-API APK already supports this mode; restart the app to fetch the server setting.

- WhatsApp OTP remains available when phone-only mode is disabled; six-digit verification and clear delivery wording.
- Owner-supplied Privacy and Terms links on login and Account.
- Account deletion request screen with a fresh WhatsApp code. Access closes only after server confirmation. Personal-data removal remains a staff review task, surfaced in the Accounts Client Requests inbox.
- Session cleanup also clears local request/payment state after account expiry or sign-out.

Backend changes are integrated locally in the `InventoryManagementSystem` repository's `SAASModel` branch. The focused production phone-login patch was pushed to `main` and deployed as commit `5a88cd59`. See `docs/customer-app-auth-privacy.md` in the local backend checkout for API contracts, merge scope and the regression command.

Provider-boundary tests exercise real API/database/application logic with simulated WhatsApp/Stripe responses. Real WhatsApp delivery still requires the approved authentication template name/language and a designated recipient. Real checkout, wallet/3DS and native device testing remain separate checks. The tests never send production messages or charge cards.

The app policy links supplied by the owner are:

- https://2capacity.com/legal/privacy-policy.html
- https://2capacity.com/legal/terms-of-service.html
