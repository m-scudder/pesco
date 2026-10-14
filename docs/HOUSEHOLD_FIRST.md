# Household-first rebuild

Branch: `feat/household-first-onboarding` — created from `main`. Do not merge before device and RLS testing.

## Priority order

1. **Household identity and joining:** silent Supabase anonymous user; create household; generate a six-character key; redeem it on a separate user/device. No Google/Apple prerequisite.
2. **Shared expense CRUD:** replace local-only household scope with Supabase rows, respecting immutable creator ownership and RLS.
3. **Personal privacy:** private expense scope and budgets linked to the user only.
4. **Account recovery:** optional email OTP linking/upgrade from anonymous account. The recovery flow must preserve the existing user ID; do not accidentally create a second account. Phone OTP can be assessed later because SMS provider configuration and per-message fees apply.
5. **Quality:** automated RLS tests, concurrency/rate limits, pagination, offline failure states, receipt storage and release testing.

## Six-character code

- Example: `K7M2Q9`; six characters, uppercase; no prefix.
- Server migration: `supabase/migrations/20261014000500_six_character_join_keys.sql`.
- The six-character SQL was manually executed using the dashboard, **but the Supabase CLI migration history does not list it**. Reconcile version history before running `supabase db push`; do not rerun a migration that creates existing objects.
- The short-code space is only 32^6 (~30 bits). Current per-anonymous-user attempts are insufficient against users creating many anonymous identities. Before public launch implement gateway/IP/device-aware rate limiting, abusive anonymous signup protection, and security tests.
- Keys expire in 24 hours and are consumed once. Generating another key supersedes the existing pending invite.
- Current local-only expenses **do not sync** when joining a household. No automatic transfer of private expenses.

## UI rules

- Compact layouts: 16px horizontal gutters, 12px screen spacing, 14px card padding, 24px titles.
- Household flow has one main decision: Create or Join. Inputs are center-aligned for the code and left-aligned for household name.
- Short copy, one prominent primary action, no unnecessary explanation cards.
- Household setup accessible on Home and Settings.

## Acceptance tests (required before merge)

- Fresh install without credentials: explicit, recoverable setup error; with valid credentials and anonymous provider enabled: automatic session.
- User A creates household, generates six-character key.
- User B on a different anonymous account redeems exactly once; User C cannot join full household; reused/expired codes fail.
- Repeated invalid codes are limited; confirm the limiter cannot be trivially bypassed by rotating anonymous accounts before public release.
- Only creator can issue a key; guest cannot issue one; Personal expenses remain inaccessible to others.
- UI renders in light/dark, small screens, and iOS/Android; test form alignment and keyboard overlap.
- TypeScript/Expo checks pass and app builds. These tests **have not yet been executed in this environment**.
