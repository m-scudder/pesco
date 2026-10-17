# PESCO Plus — feature branch

Branch: `feat/pesco-plus`. **Do not merge to main yet.**

## Implemented on this branch
- Compact, text-light paywall preview at `/plus`; plan choices are illustrative, not purchasable.
- Single diamond-shaped entry point in the Settings profile header, rather than Plus badges across screens.
- Household invite shares the six-character code and `pesco://onboarding` deep link to open the installed app.
- Existing Category Budgets screen has not been replaced or duplicated.
- Expense details contain a compact `Add Receipt` control for the expense owner and attachment thumbnails for authorized viewers.
- Photo library, camera and file picker options; upload and remove workflows.
- Private Supabase receipt bucket with 5 MB per-file limit and member/owner access policies.

## Required setup before testing
1. Run `npx expo install expo-image-picker expo-document-picker` locally to install SDK-compatible versions and **regenerate package-lock.json** (not updated by remote file edits).
2. Apply `supabase/migrations/20261018000000_expense_receipts.sql` in the intended PESCO Supabase environment. Review existing migration history first; don't blindly run `supabase db push`.
3. Build a fresh iOS/Android development client for the native picker modules.
4. Run `npm run typecheck` and `npm test`, then verify camera permissions and receipt RLS on two real accounts.
5. Test pending/offline expenses: receipt attachment requires the expense to be present in the cloud.

## Still to implement
- StoreKit/Play Billing through a billing provider; household entitlement validation server-side.
- Expand household size from 2 to 6 *only after* schema/RPC enforcement and subscription verification.
- Enforce premium/category-budget limits on the server while preserving existing free-user data.
- Receipt entitlement checks, quotas, and cleanup of orphaned storage objects after expense deletion.
- A public app-store download or universal link in invitations (current `pesco://onboarding` deep link opens an already-installed app).
- E2E/device tests and subscription restore/expiry handling.

Prices on the paywall are placeholders until product pricing and billing are configured.
