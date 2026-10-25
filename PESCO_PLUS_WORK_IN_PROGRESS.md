# PESCO Plus — testing handoff

Branch: `feat/pesco-plus` (keep `main` untouched until billing verification and store setup are complete).

## Implemented on this branch
- Streamlined paywall at `/plus`, entered from the diamond beside the Settings profile header.
- RevenueCat client integration for current offerings, localized package prices, purchase initiation, and restore purchases.
- Purchases are gated behind `EXPO_PUBLIC_REVENUECAT_PURCHASES_ENABLED=true` and a platform API key; the default is disabled.
- Paywall reads the server-managed `household_entitlements` row to determine whether Plus is active. Client purchase state alone does not unlock Plus.
- Supabase Edge Function at `supabase/functions/revenuecat-webhook/index.ts` to process RevenueCat entitlement events and update household entitlements.
- Setup and release checklist: `docs/REVENUECAT_SETUP.md`.
- Existing household invitation, receipt, category-budget, and creator-nickname work remains on this branch.

## Existing backend
The following migrations were previously applied to the connected PESCO Supabase project:
- `20261018000000_expense_receipts.sql`
- `20261018001000_household_entitlements.sql`
- `20261018002000_plus_receipt_guard.sql`
- `20261018003000_plus_category_limit.sql`

The old temporary internal test entitlement expired on **24 October 2026 (UTC)**. It was not a store purchase and must not be extended as a substitute for purchase verification.

## Before local/EAS build
The RevenueCat SDK and its dependencies are locked in `package-lock.json`. The feature-branch CI now uses `npm ci` to validate reproducible installs.

```bash
git fetch origin
git switch feat/pesco-plus
git pull origin feat/pesco-plus
npm ci
npm run typecheck
npm test
```

A fresh native development/preview build is required after installing the native purchase SDK. Expo Go can preview the UI but cannot make real purchases.

## External setup still required
1. Create the RevenueCat project and configure App Store Connect and Google Play credentials.
2. Create monthly/annual store products and RevenueCat packages; create entitlement ID `pesco_plus`.
3. Set EAS environment variables for platform SDK keys and `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=pesco_plus`.
4. Deploy the `revenuecat-webhook` Edge Function with JWT verification disabled and set `REVENUECAT_WEBHOOK_AUTHORIZATION` to the same shared-secret header configured in RevenueCat.
5. Test sandbox purchase, cancellation, expiration, and restore on physical iOS and Android devices. Keep purchases disabled until the webhook has been tested.

## Other release gates
- Public App Store / Play Store URLs and universal links for household invitations.
- Orphan receipt cleanup when an expense is deleted and comprehensive offline receipt retry.
- Full iOS and Android physical-device acceptance run.
