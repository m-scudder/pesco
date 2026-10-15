# Phase 4 — Release gates

## Completed in this branch
- Google-first onboarding, optional Apple OAuth entry point, profile nickname, account deletion API, and appearance-aware UI
- Private cloud personal expense history with owner-scoped RLS (existing `expenses_read`, `expenses_insert`, `expenses_update`, `expenses_delete` policies)
- Stable `client_key` per local expense with a unique `(owner_id,client_key)` constraint; confirmation before local removal and automatic retry
- CI TypeScript and expense-history/CSV unit tests
- EAS development/internal-preview/production build profiles

## Before running on devices
- Apply migration `20261015161000_personal_expense_cloud_keys.sql` in every target Supabase environment. This was applied to the connected development environment.
- In Supabase → Authentication → Providers enable Apple after registering the Apple Service ID and signing key. Configure the standard Supabase Apple callback URL in Apple Developer. Once it is working in a dev build, set `EXPO_PUBLIC_ENABLE_APPLE_SIGN_IN=true` in the build environment to show the iOS button. **Apple login does not work until configured.**
- Apple Developer account, app identifiers, signing/entitlements, and OAuth callback are required. Do not commit signing keys to Git.
- Set the permanent production iOS bundle identifier and Android package identifier before release. `com.anonymous.pesco` is a development placeholder. Ensure the corresponding identifiers match Apple/Google authentication settings.
- Set up EAS project and store signing credentials (`eas build:configure`); then build `eas build --profile preview --platform all`.
- Provide a public privacy-policy URL and support contact. Declare personal financial data and account deletion accurately in the store privacy forms.
- Verify Google OAuth consent branding and Apple button/login behavior on real devices.

## Personal expense recovery and isolation QA
1. Sign in as account A, create personal expenses on device A, and verify they appear in the remote `expenses` table with `scope='personal'`, `household_id is null`, and `owner_id=A`.
2. Force-close, reopen and verify transactions remain visible.
3. Sign in as account A on a fresh device B and verify the same personal history appears.
4. Update/delete a personal expense on B; verify A sees the change after refresh.
5. Disconnect A, create an expense; reconnect, and verify it uploads exactly once. Restart or retry imports, confirming no duplicates.
6. Check that account B cannot query account A's personal transactions. Household members must also be unable to see one another's personal expenses.
7. On a pre-Phase-4 device with personal history in local storage, upgrade, log in with the same existing identity, and verify imported records are not removed until server confirmation.
8. If a different Google account logs into the same device, verify old personal data is not carried across. This flow requires explicit manual QA; legacy app-local budgets, rules and categories remain device-local.
9. Test large histories (200+ items), pagination and CSV export.

## Deletion / authentication QA (use disposable accounts only)
- Delete a single-member account and verify `auth.users`, personal and household financial rows are removed.
- Delete one partner from a two-member household and verify surviving partner's transactions and household ownership remain.
- Cancel deletion at each confirmation and verify no changes.
- Verify Google account sign-in, Apple account sign-in, signing out and relaunch in light/dark modes.
- Verify Apple identities that hide email still work with profile fallback.
- Run builds on iOS and Android to check OAuth redirects.

## Known release blockers
- Apple provider cannot be activated without Apple Developer credentials and Supabase provider setup.
- No signed iOS/Android production artifacts or store submissions have been generated.
- Device-only budgets, recurring rules, and personal category customizations are not yet backed up; a dedicated backup policy is still required.
- Automated tests cover expense history and CSV safety; full RLS multi-user integration and offline sync end-to-end tests remain manual.
- App Store and Google Play compliance, privacy disclosures and beta testing require an owner review and publishing accounts.
