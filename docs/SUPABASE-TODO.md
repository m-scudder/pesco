# Supabase integration TODO

The app currently stores expenses and budgets with AsyncStorage on **one device only**. Household and Personal are UI scopes, not enforced privacy boundaries. Do not invite actual users or store sensitive financial data expecting cloud protection until the steps below are complete.

## Setup
- [ ] Create a Supabase project and keep service-role/secret keys off client devices and out of Git.
- [ ] Configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (publishable/anon key).
- [ ] Configure Apple Sign In, Google Sign In, callback/deep-link settings for iOS and Android.
- [ ] Add profiles, households, household_members, invitations, categories, expenses, budgets and attachments migrations.
- [ ] Enforce creator-only inserts/updates/deletes and private-personal reads through PostgreSQL RLS.
- [ ] Make household read access dependent on active membership, including aggregate queries and receipt URLs.
- [ ] Implement atomic single-use invitation acceptance; maximum two active members per household.
- [ ] Add private Storage bucket and signed receipt access protected by expense visibility.
- [ ] Switch local DataProvider to authenticated backend repository, with explicit migration/import approval for existing local entries.
- [ ] Connect realtime change invalidation and clear caches on sign-out.
- [ ] Add negative authorization tests for partner edits, personal reads, household exits and account changes.
- [ ] Implement error/loading states, double-submit protection, and network retry policies.
- [ ] Agree household-exit and account-deletion retention policies before production release.

## Current limitations
- Local AsyncStorage is unencrypted at rest and should be treated as a prototype store.
- Budgets are repeated overall limits per scope rather than month-specific history.
- Filtering occurs in-memory and needs server pagination for very large lists.
- Appearance preference is not yet persisted after app restart.
- No authentication, partner sync, receipt upload, or multi-device support.

Keep these tasks separate from the current local-first functionality until backend credentials are configured.
