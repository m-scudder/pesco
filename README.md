# PESCO

Cross-platform household and personal expense tracker built with Expo Router, React Native and TypeScript.

## Current status

Local-first prototype: you can create, edit, delete, search and filter expenses, browse monthly Home summaries and Insights, and set optional budgets. Changes persist on the current device using AsyncStorage.

**No Supabase connection yet.** Household/Personal currently indicates local expense grouping. Real partner visibility, privacy policies, authentication, receipt uploads and synchronization are blocked until Supabase is configured. See [docs/SUPABASE-TODO.md](docs/SUPABASE-TODO.md).

## Run locally

```bash
npm install
npx expo install --check
npm run typecheck
npx expo run:ios
```

For Android, use `npx expo run:android`.

If the dependencies have already been installed locally, retain your tested `package-lock.json` and commit it after checking that the Expo versions match. Do not commit credentials or private signing material.

## Development practices

Make small, focused GitHub commits. Do not force-push over existing work. Keep Supabase setup as a separate reviewable milestone. No real multi-user claims until database access-control tests pass.

PESCO is a working brand pending legal/store clearance.
