# Phase 4 — Google Account Recovery Setup

PESCO uses **Google OAuth through Supabase**. Existing anonymous users must **link** Google to their current session; returning users sign in with Google. Do not use `signInWithOAuth` to protect an existing anonymous user because it could switch their Supabase user ID.

## Required configuration
1. In Google Cloud Console, configure the OAuth consent screen and create a **Web** OAuth client for Supabase. Add Supabase's **OAuth callback URL** (from Authentication → Providers → Google) as an authorized redirect URI in Google Cloud.
2. In Supabase Authentication → Providers, enable **Google** and enter the Google OAuth client ID and secret.
3. In Supabase Authentication settings, enable **Manual Linking** to let anonymous users attach their Google identity.
4. In Supabase Authentication → URL Configuration → Additional Redirect URLs, allow `pesco://auth/callback`.
5. `app.json` already declares scheme `pesco`. Test on a newly built iOS/Android dev client. Rebuild after adding `expo-web-browser`:
   - `npm ci && npx expo run:ios`
   - `npm ci && npx expo run:android`
6. No Google OAuth client secret belongs in source control, Expo `EXPO_PUBLIC_*` variables, or the app binary.

## Acceptance checks
- Existing household user: Settings → Account recovery → Continue with Google. Confirm Supabase UID is unchanged and old household expenses are visible. Google now appears under Auth user identities.
- Cancel browser login: original session stays active; no account changes.
- Existing account on another device: fresh install → Continue with Google → same Google identity → same cloud household membership, categories, shared budgets, expenses.
- Guard on device with an active household/personal expenses prevents switching to another Google account.
- Wrong Google account previously linked elsewhere produces a visible error and does not silently migrate the user's expenses.
- Verify account recovery in iOS and Android standalone builds; test web authentication redirects and app restart.
- Personal expenses and personal budgets remain device-local and are not part of cloud recovery.

## Remaining Phase 4 gates
Data isolation for multiple accounts, backup/recovery for device-local personal data, automated end-to-end tests, production environment and store builds remain separate work.
