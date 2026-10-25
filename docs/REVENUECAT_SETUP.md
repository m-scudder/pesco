# PESCO Plus — RevenueCat integration

The app-side billing client and Supabase webhook endpoint live on `feat/pesco-plus`. Paid purchases must remain disabled until the RevenueCat products and webhook are configured. A successful native purchase is **not** itself the source of truth for household access: the webhook updates `household_entitlements`, and server-side feature guards read that table.

## RevenueCat dashboard

1. Create an app/project in RevenueCat.
2. Add the iOS app using bundle ID `com.mayankagarwal.pesco` and Android app using package `com.mayankagarwal.pesco`.
3. Connect the App Store Connect and Google Play service credentials.
4. Create monthly and annual auto-renewable subscription products in the stores; attach them to RevenueCat entitlements.
5. Create an entitlement whose identifier is exactly `pesco_plus`.
6. Create a current offering with monthly and annual packages. The app displays the localized price strings returned by RevenueCat; it does not hardcode prices.
7. Add platform public SDK keys to the EAS environment as `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`.
8. Set `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=pesco_plus` and set `EXPO_PUBLIC_REVENUECAT_PURCHASES_ENABLED=true` only after the webhook is deployed and verified.

## Supabase webhook

1. Deploy `supabase/functions/revenuecat-webhook/index.ts` as the `revenuecat-webhook` Edge Function.
2. Set Edge Function secrets `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `REVENUECAT_WEBHOOK_AUTHORIZATION`. The last value must be a long random secret.
3. Configure a RevenueCat webhook URL pointing at the deployed function and use the same secret in its Authorization header (for example, `Bearer <secret>`). The function compares the complete header value, so the configured secret must include the `Bearer ` prefix if you use that format.
4. Enable events for initial purchase, renewal, uncancellation, product change, subscription extension, and expiration. Test with RevenueCat's webhook test event and then a sandbox purchase on each platform.
5. Verify that a household's row in `public.household_entitlements` becomes `tier='plus'` with a future `valid_until`, and returns to free after expiry. Do not grant access by editing client state.

## Native build and validation

- Install the SDK with `npx expo install react-native-purchases`, then commit the updated `package.json` and `package-lock.json`.
- Build a new EAS development/preview build after installing the native module; Expo Go cannot run RevenueCat's native purchase SDK.
- Run `npm run typecheck` and `npm test`, then test purchase, cancellation, restore, expired subscription, and both stores' sandbox flows on physical devices.
- Keep purchases disabled until both the webhook and store products are ready. No live prices or products are assumed by the app.

## Important follow-up

The webhook currently handles one household membership per purchaser, consistent with PESCO's current one-household membership model. If multi-household memberships are introduced, subscription ownership and the household to which Plus applies must be made explicit before expanding the model.
