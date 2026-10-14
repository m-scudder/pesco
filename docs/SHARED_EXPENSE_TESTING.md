# Shared household expenses — test guide

Branch: `feat/household-first-onboarding`

## What changed

- Household expenses now use the Supabase `public.expenses` table once an anonymous user is a household member. Both members read the same rows under existing RLS policies.
- New Household expenses are uploaded immediately; edits and deletions go to Supabase. Only the creator may edit or delete.
- Home, Expenses and Insights refresh on focus, on app foreground, every 15 seconds while active, and on Realtime change notifications when publication is configured.
- Personal expenses remain local and private. Existing local Household expenses are **not silently uploaded**.
- A user who has local Household expenses and has joined a household sees **Share N existing expenses** on Home. Confirming explicitly uploads them, then removes each successful upload from local storage.
- Household budgets remain local to each device pending budget synchronization.

## Two-device acceptance test

1. On both simulators, switch to `feat/household-first-onboarding`, `npm install`, `npm run typecheck`, and restart Expo or build.
2. Confirm both are members of the same household under Settings → Household & invite code.
3. Select Household on both devices. Each should initially show the same Supabase total (possibly zero).
4. On phone A, add a **new** ₹25 Household expense. After refresh, check that phone B sees the same expense in Home and Expenses (allow up to ~15 seconds).
5. On phone B, add a ₹40 Household expense. Both should show ₹65 in their shared total. Phone A may view B's expense but should not see Edit/Delete for it.
6. If you wish to share **old** locally recorded Household expenses, use **Share N existing expenses** on each phone and confirm once. They should then appear on both phones.
7. Switch to Personal and add a record. Ensure it is absent on the other phone's Personal view.
8. Confirm no errors in Metro logs and no unauthorized access to partner-owned mutations.

## Limitations before merge

- Remote queries currently return the newest 100 records; implement cursor pagination before large-scale use or treat totals beyond 100 as incomplete.
- The import is not guaranteed crash-idempotent if an app terminates between a successful server insert and local persistence. Do not run imports repeatedly after an interruption without checking Supabase for duplicates.
- Realtime events may require publishing `expenses` in Supabase Realtime; the 15-second poll is the fallback.
- Personal expenses and budgets are not cloud-synced yet.
- Anonymous account recovery and global rate limiting on 6-character codes are not release-ready.
- Cloud logic has been committed but has **not** been typechecked or tested on iOS/Android simulators in the assistant environment.

Never uninstall PESCO or wipe its storage until existing local data has been backed up or intentionally imported.
