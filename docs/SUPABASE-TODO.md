# Supabase integration — implementation status

## Anonymous onboarding and joining keys (2026-10-14)

- [x] Database: `household_invitations`, single-use 24h cryptographic 80-bit joining keys, one household per user, two-member cap with household row locks.
- [x] Database: creator-only `issue_household_invite` and atomic `join_household_with_key` RPCs. Only SHA-256 hashes are stored; raw key returned once.
- [x] Mobile: anonymous session initialization, create/join screen via **Settings → Household and invitations**, and OS share sheet for issued keys.
- [ ] **User action:** Enable **Anonymous Sign-Ins** in Supabase Dashboard → Authentication → Providers → Anonymous Sign-Ins.
- [ ] **User action:** Configure `.env` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (publishable key), then restart Metro.
- [ ] End-to-end verify on two independent devices and confirm concurrent key redeems reject the second member.
- [ ] **Still pending:** Cloud expense data provider, migration consent and realtime synchronization. Joining a household does NOT YET synchronize existing local transactions.
- [ ] Anonymous account recovery/upgrade before a production release. Reinstallation may lose the account permanently.

## Deployed to PESCO project

Project ref: `kwwpswswavcjiplwsyde` (US East). Applied migrations are tracked in Supabase under `initial_schema` and `restrict_function_execution`. As of 2026-10-14 all five public application tables have RLS enabled and contain zero rows. Anonymous EXECUTE was revoked from privileged RPCs; `authenticated` can still execute `create_household` and `is_household_member` by design. Supabase security advisor still flags these two security-definer functions because they are accessible to authenticated users; verify their authorization logic with dedicated test users before production.

## Committed foundation
- [x] Migration: `supabase/migrations/20261014000100_initial_schema.sql` creates profiles, households, members, expenses and budgets.
- [x] Expense RLS: a user can read their own Personal entries and members can read Household entries; only the owner can update/delete their expenses.
- [x] Immutable expense identity: owner, household and scope cannot change in an UPDATE.
- [x] Atomic `create_household(name)` SQL function for an authenticated user.
- [x] Configurable Supabase JS client and persisted auth session management.
- [x] Cloud expense repository functions created (not yet connected to screens).

## Configure the project

1. Create a Supabase project at https://supabase.com/dashboard.
2. Find **Project Settings → API**. Copy the **Project URL** and the **publishable/anon client key**, not the service_role/secret key.
3. Copy `.env.example` to `.env` and populate:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
   ```
4. Run `npm install` and `npx expo install --check`. Restart Metro after changing env vars.
5. Review the SQL migration carefully. Apply it through the Supabase SQL Editor or CLI in a **new empty** project. The initial SQL and follow-up privileges migration have been applied to the dedicated PESCO project. Do not re-run initial SQL manually.
6. Configure Apple and Google identity providers and mobile app deep links before enabling the production sign-in flow.

## Still required before cloud mode is usable
- [ ] Test cross-account RLS and concurrency safety against the deployed schema (not yet tested end-to-end).
- [ ] Sign in with Apple and Google (OAuth redirect + token exchange + logout UI).
- [ ] Household invitation creation, acceptance, expiry and single-use semantics; enforce maximum two members with concurrency-safe transactions.
- [ ] Household departure/deletion policy and corresponding RPCs.
- [ ] Switch expense UI to remote repository only for authenticated users; provide loading/error/retry states and realtime refresh.
- [ ] **Explicit local data migration**: never silently upload or delete locally recorded expenses. Resolve ID collisions and duplicate imports.
- [ ] Add cloud budgets and monthly budget history.
- [ ] Receipt metadata, private Storage bucket, scoped signed URLs, and file-size/type restrictions.
- [ ] Postgres/RLS test suite for owner, partner, stranger and signed-out users; verify updates/deletes to others' entries fail.
- [ ] Pagination, robust offline recovery, account lifecycle and secure cache purge on sign-out.
- [ ] Test device and simulator builds; release readiness and monitoring.

## Safety and current behavior

**Configuring environment variables does not switch the app to Supabase-backed expense storage.** The existing app still uses local AsyncStorage for expenses and budgets; this prevents accidental mixing of local and cloud records.

This project is not ready for real shared financial data until OAuth and security tests are implemented. The SQL migration is a starting baseline, not a verified production deployment.

Never commit `.env`, service_role keys, or session tokens. Client-side publishable/anon keys are designed to be public; all confidentiality depends on RLS and Storage policies.
