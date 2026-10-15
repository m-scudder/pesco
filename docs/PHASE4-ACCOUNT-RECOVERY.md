# Phase 4 — Mandatory Google sign-in and account deletion QA

## New app flow
1. Fresh install shows a centered PESCO welcome screen with **Continue with Google**; no household actions are shown until successful Google auth.
2. Cancel Google auth: app stays on the welcome screen. Household and Stats tabs cannot open.
3. Complete Google sign-in: first-time user sees **Create household**, **Join with code**, or **Use personal expenses only**.
4. On a fresh device, sign in with Google for a user already in a household: membership is detected and Home opens without requiring an invite again.
5. Existing legacy anonymous session: Continue with Google **links** to that identity, rather than signing in to another UID. Verify existing expenses and membership remain accessible.
6. Relaunch an authenticated app and ensure Home opens without re-authentication.

## Profile and Settings
- Settings contains **My profile**, **Household**, Categories, budgets, etc.; no Account recovery row.
- My profile shows display name, Google email, provider connected status and **Delete account**.
- Settings → Data contains **Expense history & CSV** and **Pending uploads** only; personal-expense total and Clear local data are gone.
- Check light/dark mode and small phone screens for balanced layout.

## Account deletion — disposable test accounts only
1. Set up an isolated household with a disposable Google test user, and optionally a partner test user.
2. Open My profile → Delete account. Cancel at either confirmation stage; verify nothing changed.
3. Verify an account with pending uploads cannot be deleted until its pending changes are resolved.
4. Confirm deletion with a disposable account. Verify the function returns success, the session closes, and the app returns to onboarding.
5. Sign in again with that Google identity. It should represent a **fresh account** without the deleted user's old expenses.
6. In a two-member household where the owner is deleted, verify remaining partner retains household ownership and only their own expense records persist.
7. In a one-member household, verify the empty household is cleaned up.
8. Confirm direct RPC access to `prepare_account_deletion` is forbidden to unauthenticated and normal authenticated clients.
9. Do not test deletion against real user accounts or financial history.

## Google consent domain
The `<project>.supabase.co` Google sign-in text is the upstream Supabase OAuth callback host, **not an app leak**. Supabase Auth custom domains (paid add-on) can provide a branded host such as `auth.pesco.example`. Google OAuth branding verification may also improve displayed app identity. Updating Expo UI alone does not alter Google's upstream consent host.

## Before merge
- GitHub TypeScript CI passes.
- Test fresh/new Google accounts, legacy identity linking and returning accounts on iOS and Android.
- Test account deletion end-to-end with **disposable** accounts; verify partner data preservation.
- Verify owned Google identities are not accessible after deletion and cloud data is fully cleaned.
- Review remaining local personal-data backup requirements for production launch.
