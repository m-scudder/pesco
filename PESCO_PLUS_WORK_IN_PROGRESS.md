# PESCO Plus — testing handoff

Branch: `feat/pesco-plus` (do not merge to main while billing is a preview).

## Implemented and verified by CI
- Streamlined PESCO Plus paywall preview at `/plus`, entered from the diamond beside the Settings profile header. The preview has **no working payment flow**.
- Single household invite message with six-character invite code and `pesco://onboarding` installed-app deep link.
- Compact receipts on Expense Details and Edit Expense: Camera, Photo Library, File; 44×44 image thumbnails/PDF icon; remove action.
- Private receipt storage with Supabase row-level security; only the expense creator may add/remove; household members may view.
- Household entitlement model: 2 members free, up to 6 with active Plus (server-enforced in invitation RPCs).
- Free household category limit: first category free, additional categories require Plus; existing limits remain editable/readable.
- Actual creator nicknames displayed for multiple members, not a single hard-coded 'partner'.
- GitHub Actions CI checks TypeScript and regression tests on every feature-branch push.

## Connected PESCO Supabase backend
The following migrations were applied successfully:
- `20261018000000_expense_receipts.sql`
- `20261018001000_household_entitlements.sql`
- `20261018002000_plus_receipt_guard.sql`
- `20261018003000_plus_category_limit.sql`

The existing PESCO household received a **temporary internal test entitlement** (not a store purchase), valid until **24 October 2026 (UTC)**. It expires automatically and does not charge anyone. It should not be extended or used as a substitute for purchase verification in a public release.

## Local setup
```bash
git fetch origin
git switch feat/pesco-plus
git pull origin feat/pesco-plus
npx expo install expo-image-picker expo-document-picker
npm run typecheck
npm test
```
Commit `package-lock.json` after installing dependencies before any EAS build that uses `npm ci`. Make a fresh native development or preview build for camera/file-picker native code.

## Physical-device acceptance tests
1. Verify profile diamond opens the compact Plus preview and no extra Plus badges are scattered around the app.
2. Confirm the main budget screen layout is unchanged.
3. Edit an existing synced household expense: attach an image from the gallery and confirm the small thumbnail appears.
4. Add a receipt from Camera and a PDF using Files; test invalid MIME and over-5MB rejection.
5. Tap a thumbnail; verify image/PDF opens. Remove a receipt using its X control; verify it disappears after a refresh.
6. Open the same household expense on a second member's device: confirm thumbnails are visible but removal is unavailable to non-creators.
7. Create a 3rd and up to a 6th member with a new six-character code per invitation; ensure 7th cannot join.
8. Test an invitation via Share: the `pesco://onboarding` link opens an already-installed app. **There is no public store-installation link yet.**
9. Confirm the expense list and detail view show the correct creator nickname for all members.
10. Create a second category budget under active internal Plus, then verify the other household member sees it.
11. Test without Plus after test entitlement expiry: maximum two *new* members, first new category limit free, receipt upload directs to paywall. Existing >2 members, receipts, and budgets remain accessible.

## Not ready for public paid release
- RevenueCat/StoreKit/Google Play Billing account configuration and real purchase/restore actions.
- Signed server-side purchase verification and webhook entitlement updates.
- Store product IDs and localized prices; current ₹ amounts are illustrative only.
- Real public App Store / Play Store links, universal links.
- Orphan receipt cleanup on expense deletion and comprehensive offline receipt retry.
- Full Android and iOS physical-device acceptance run (requires your devices).
