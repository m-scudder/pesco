# Phase 1 verification — shared recurring bills & offline additions

## Setup
- Install the same branch on two devices, each with a different PESCO account.
- Join both accounts to one household.
- Confirm Supabase has applied the `household_recurring_rules`, `preserve_household_recurring_occurrences`, and `recurring_month_uniqueness` migrations.
- Run `npm install && npm run typecheck` locally. The repository has a TypeScript CI workflow, but GitHub checks may not run until Actions are enabled.

## Recurring expenses
- [ ] Creator adds a shared monthly rule with today's or an earlier due day; expense appears once in both accounts.
- [ ] Both devices open Recurring bills and refresh simultaneously; still only one charge for the same rule/month.
- [ ] Creator changes the due day after the current month's charge is generated; no duplicate charge.
- [ ] Creator pauses a shared rule; due charges stop. Resume and verify later due months generate.
- [ ] Delete an individual generated expense; reload the app and verify it does **not** reappear.
- [ ] Delete a recurring rule; existing expense history remains.
- [ ] Remove the creator of a shared rule from the household; the rule no longer generates additional charges.
- [ ] Verify a different household cannot read or modify these rules.
- [ ] Verify a partner can view a rule but cannot modify another member's rule.
- [ ] Create, pause, resume and edit a personal recurring rule; skipped months remain skipped.

## Offline household expense creation
- [ ] With an authenticated, previously synced account, disconnect the device from the network.
- [ ] Relaunch PESCO: cached household information remains visible.
- [ ] Add a household expense offline; it appears with **Waiting to sync** and increments the pending counter.
- [ ] Force-close and reopen while offline: the expense remains queued.
- [ ] Reconnect: the item uploads, the pending counter decreases, and the partner sees exactly one transaction.
- [ ] Create two different expenses while the first network upload is stalled; neither is lost.
- [ ] Interrupt an upload after the server insert but before the client gets a response; retry using the same ID and verify no duplicate.
- [ ] Open Settings → Pending uploads; retry and discard an unuploaded item.
- [ ] Remove the member with a pending expense, or change their household: the old pending item must not upload into the new household.
- [ ] Open the same household on the partner's device and verify pending local changes are not shown there until uploaded.

## Current boundaries
- Offline creation of household expenses is queued; editing/deleting already-synced household expenses still requires a connection.
- Shared recurring rule creation and editing requires a connection. Generation runs when an authenticated member syncs; it is not a scheduled server cron job.
- Only recent cloud expenses (up to 100 in the current data query) are cached. Pagination remains future work.
- The last household snapshot is retained in device storage for offline access; revoked memberships take effect when connectivity returns and the next successful membership refresh occurs.
- The local expense import utility remains a legacy direct-write flow and needs separate interruption tests before use for bulk migrations.
