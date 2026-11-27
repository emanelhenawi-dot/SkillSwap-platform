# SkillSwap implementation notes

## Changes in this revision
- Added the missing `server/src/routes/wallet.js` route imported by `server.js`.
- Added `PaymentOrder` model and centralized wallet package configuration.
- Added authenticated wallet endpoints: `GET /api/wallet`, `POST /api/wallet/orders`, and `GET /api/wallet/orders/:id`.
- Added the Wallet UI at `/wallet`, linked it from the student header, and aligned shared layout styling with the supplied SkillSwap reference screens.
- Added a shared safeguarding footer and bilingual labels.
- Admin seeding now safely skips when admin credentials are not configured.

## Important payment limitation
The wallet currently creates pending payment orders only. Paymob/Fawry checkout initiation, provider-specific signature/HMAC verification, and verified payment webhooks are not implemented. No wallet balance is credited from a browser redirect or an unverified callback. Do not add real payment credentials until the official provider integration and webhook verification are completed.

## Environment
Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`, then fill in local MongoDB/JWT settings. Payment gateway values are intentionally blank.

## Verification performed
- Node syntax checks passed for the server entry point and new wallet modules.
- All project JSON files parsed successfully.
- Relative imports were checked and no missing local imports were found.
- A Vite production build could not be run in this environment because dependency installation timed out; `vite` was therefore unavailable. Run `npm ci && npm run build` in the Codespace using the project's Node 24 runtime.
