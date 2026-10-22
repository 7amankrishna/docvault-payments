# DocVault Payments

Secure Vercel serverless backend for DocVault Android PayU Checkout Pro payments. It replaces Firebase Functions, so Firebase Blaze is not required for payment code.

## What it does

- `POST /api/create-payment` reads the plan and price from Firestore `config/app`, creates a server-owned order, and returns only the PayU merchant key to the signed-in user.
- `POST /api/generate-hash` creates PayU SDK hashes with the merchant salt held in Vercel.
- `POST /api/verify-payment` verifies the transaction directly with PayU, then grants `isPremium` and `premiumUntil` in Firestore.

Every request requires `Authorization: Bearer <Firebase ID token>`. The Android app must send the current user's Firebase ID token. Never send a PayU salt to the app.

## Deploy

1. Import this GitHub repository into Vercel as a **new project** (separate from the clothing application).
2. In Vercel → Project → Settings → Environment Variables, add the values below for **Production**, **Preview**, and **Development** as appropriate:

   | Name | Value |
   | --- | --- |
   | `PAYU_KEY` | PayU merchant key (test or production) |
   | `PAYU_SALT` | Matching PayU merchant salt |
   | `PAYU_ENVIRONMENT` | `test` or `production` |
   | `PAYU_SUCCESS_URL` | Required in production: your PayU success callback URL |
   | `PAYU_FAILURE_URL` | Required in production: your PayU failure callback URL |
   | `FIREBASE_SERVICE_ACCOUNT_JSON` | Full JSON of a Firebase Admin service account for project `darajnii`, entered as one line |

3. In Google Cloud Console for `darajnii`, create a dedicated service account with the **Cloud Datastore User** role (Firestore read/write only). Create a JSON key, paste the full file contents into `FIREBASE_SERVICE_ACCOUNT_JSON`, then delete the local JSON key file. Do not commit it.
4. Deploy. Copy the Vercel production URL, for example `https://docvault-payments.vercel.app`.
5. Give the URL to the Android project update. The app must replace the three Firebase callable requests with HTTPS calls to:

   ```text
   /api/create-payment
   /api/generate-hash
   /api/verify-payment
   ```

6. Set the Firestore document `config/app` with valid pricing, for example:

   ```json
   {
     "subscriptionPrice": 99,
     "subscriptionCurrency": "INR",
     "subscriptionPlanName": "DocVault Premium",
     "subscriptionDurationDays": 30
   }
   ```

7. Test using PayU **test** credentials and a real Firebase user. Check the `payments` collection and the user's `isPremium`/`premiumUntil` only after PayU reports success. Change to production keys and real callback URLs only after a successful test payment.

## Local checks

```bash
npm install
npm test
```

## Security notes

- Do not put `PAYU_SALT`, Firebase service-account JSON, or `.env.local` in Git or the Android APK.
- Give the Vercel service account the minimum access needed. Rotate a leaked key immediately.
- Vercel is the payment authority; client callbacks alone never grant a subscription.
