# PESCO Phase 3 — Regression and Release Checklist

## Setup
1. `git checkout feat/phase3-reliability-polish && git pull`.
2. `npm ci && npm run typecheck`; verify GitHub Actions is green.
3. Restart Expo with `npx expo start --clear`. Use two devices signed into the **same household** (different member accounts).
4. Turn **Settings → Development → Sample expenses** off for sync tests. You may turn it back on for long-list and CSV preview tests.
5. Keep a backup before attempting destructive edits or deletions of real expenses.

## Shared expense sync
- A creates a household expense; B sees it without manual refresh. Repeat with the app resumed after backgrounding.
- A edits an expense **created by A**; B receives the updated amount, category, date and note.
- A deletes an expense **created by A**; the expense disappears for both partners.
- B cannot edit or delete A's transaction. B can edit and delete B's own.
- Keep A open, place B offline and then reconnect: B must see the latest household record.
- Observe **Pending uploads** and the Home sync indicator. Errors should be visible and a Retry action should be available.

## Offline behavior
- With A online, open a previously synced expense that A owns. Go offline; edit it. The list should reflect the edit immediately and display a pending-change indicator.
- Force-close and relaunch A while offline. Pending edits must remain visible.
- Reconnect A. The pending edit should upload and disappear from Pending uploads; verify the updated record on B.
- Repeat for an offline deletion; it stays hidden on A and disappears on B after sync.
- Go offline and create a household expense; edit the **queued new expense** before reconnecting. The server must receive only one record, containing the final values.
- Delete a queued new expense before reconnecting; the server must receive **no** new record.
- Simulate a failed upload, retry several times, and confirm there are no duplicate rows.
- If an offline change cannot be uploaded, open **Settings → Pending uploads** and use **Discard pending change**. The server's version should reappear after refresh.
- If a conflict can be created with an identical signed-in owner on two devices, change a record remotely while the other device holds a pending edit. The older pending edit must not overwrite newer remote data silently.
- Try switching households with a pending item. Old-household changes must never be sent to the new household.

## Native CSV
- Open **Settings → Expense history & CSV**. Select a range containing household expenses and choose **Export CSV**.
- Verify the share sheet receives a real **.csv attachment** with a readable filename, not a wall of text.
- Save/open the CSV using Files, Excel, or Numbers. Check date, category, description, amount, and scope columns.
- Verify commas, quotation marks, and multiline notes remain in one CSV field.
- Test a note beginning with `=1+1` and ensure spreadsheet software does not execute it as a formula.
- With sample data enabled, verify demo entries are excluded by default and included only if explicitly checked.
- Cancel sharing and export again; both attempts should work.
- Verify that PESCO does not upload exports to any server.

## History, performance and visual QA
- Add or enable more than 60 entries in one month: Home should offer **Show more** and load another batch.
- Select a history range containing more than 50 expenses: **Show more** should load subsequent entries; export must still include all matching records.
- Test search, filters, switching Household/Personal, and date changes.
- On iOS, tap date range: a modal spinner should appear only on tap; Cancel must preserve the old date, Done must apply it.
- On Android, verify native date dialogs behave as expected.
- Check all affected screens in light and dark appearance, with large accessibility text sizes and long notes/categories.
- Confirm no stale loading spinner persists following a failed sync. Reopen the app after offline use and verify cached household data remains available.
- Review battery/network usage after extended foreground use: fallback full refresh is once per minute, with realtime and app-resume updates between polls.

## Privacy and access controls
- Both partner accounts can read household expenses and budgets.
- Each account can update/delete only expenses it created.
- Nonmembers cannot query another household's expenses, categories, budgets, or recurring rules.
- Unauthenticated `anon` database role has no direct table access to financial tables.
- Test that debug sample entries are never written to cloud tables.
- Temporary CSV files must be removed from PESCO's cache after the share flow.
- Review shared-device account switching separately: legacy personal records, personal categories, and budgets are locally persisted and are not yet encrypted at the application layer.

## Release gates
- [ ] GitHub CI `npm ci && npm run typecheck` passes on the final commit.
- [ ] Two physical-device household tests pass.
- [ ] Android and iOS CSV attachment tests pass.
- [ ] Offline update/delete/relaunch/retry/conflict tests pass.
- [ ] Security/RLS checks pass for member, nonmember and unauthenticated contexts.
- [ ] Light/dark, empty/loading/error and large-list UI reviewed.
- [ ] Only then mark the draft PR ready and merge.
