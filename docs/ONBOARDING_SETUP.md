# Household-first onboarding: setup and test

This branch deliberately requires **no Google or Apple login**. Supabase creates an authenticated anonymous user invisibly. Email OTP is a future **account recovery** feature, not an onboarding requirement.

## Required project configuration

1. Supabase project: `kwwpswswavcjiplwsyde`.
2. Dashboard → Authentication → Providers (or Sign In / Providers) → **Anonymous Sign-Ins: Enabled**.
3. In your Mac's `.env` (never commit):
   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=https://kwwpswswavcjiplwsyde.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_KEY
   ```
4. Restart Expo/Metro (`npx expo start --clear`) and rebuild if dependencies changed.

## First launch

- New install or first launch after this branch → PESCO welcome screen with **Create household**, **Join with code**, **Continue without household**.
- Continue without household enters Personal tracking locally; household creation remains available in Settings.
- Create/Join requires anonymous Supabase session; the app shows the actual connection or auth error if setup is missing.
- Once the user completes or skips onboarding, the choice is persisted and the welcome screen is not repeated.

## Validation

- Test first-launch flow on simulator; test fresh and restored app sessions.
- Enter a valid six-character code on a **different authenticated user/session**.
- Ensure the server function returns exactly six characters and one-time redemption succeeds.
- **Not yet complete:** cloud expense sync, device account recovery, abuse-resistant gateway/IP rate limiting for short codes.
- The 6-character migration was executed manually in Supabase SQL Editor; its version isn't in remote migration history. Reconcile before CLI db push.
- Never clear a real user's app storage solely to test onboarding without backing up their local expenses.

## Troubleshooting

If `Anonymous sign-ins are disabled`: enable that provider in Supabase. If `Supabase is not configured`: correct `.env` and restart Metro. If there are network errors, verify the project URL and reachable network. Do not insert secret/service-role credentials into the app.

The app’s former local expense data does not automatically upload or synchronize with a household.
