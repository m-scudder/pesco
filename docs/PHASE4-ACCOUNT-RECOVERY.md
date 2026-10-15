# Phase 4 — Account Recovery Setup and QA

## Supabase configuration
- Enable **Anonymous Sign-Ins** (already used by PESCO).
- Enable **Email** authentication, email confirmation, and **Manual Linking** in Supabase Auth settings. Manual linking is required for conversion of an anonymous identity.
- Configure SMTP delivery and email templates before public release. Default development email limits are not suitable for scale.
- Configure allowed redirect URLs/deep links for verification and password recovery. The initial in-app verification-code flow avoids depending solely on links; reset-password links still require a supported app return flow.
- Do not enable a second anonymous identity automatically on expired-session errors. Recover the prior session whenever possible.

## Protect an existing account (same device)
1. Create or join a household. Add one expense.
2. Open **Settings → Account recovery**.
3. Enter a new email and choose **Send verification email**.
4. Verify through the email-change OTP (if provided), or follow the verification link and return to the app.
5. Confirm the screen recognizes the verified identity and asks for a password.
6. Set a password of at least 12 characters.
7. Verify your household and the existing expense still belong to the **same Supabase user ID** after identity linking.
8. Repeat the flow with an unverified email and make sure password creation is blocked.

## Recover on a fresh device
1. Install PESCO on a second device with no prior local expense data.
2. Select **Recover existing account** on onboarding.
3. Sign in with the verified email and password.
4. Verify household membership and cloud expenses return without joining via invite code again.
5. On an existing device containing household data, verify the recovery sign-in is blocked; use Settings → Account recovery instead.

## Privacy / identity caveats
- **Do not sign out of an anonymous account** before linking and verifying its email; the original household identity may be unrecoverable.
- Personal expenses, personal categories and overall local budgets are currently device-local, not restored by account recovery. Cloud household expenses and shared categories/budgets are restored.
- Password-reset email sending is implemented; consuming password-reset deep links inside the app requires an additional verified end-to-end test before claiming full reset support.
- Multiple account switching on one device remains disabled; this avoids accidental exposure of local personal data across identities.

## Release readiness backlog
- Unit tests for CSV serialization, expense filtering and offline conflict resolution.
- Two-account RLS integration tests (including nonmember and former member scenarios).
- Encrypted or account-scoped local personal data and explicit backup policy.
- Production Supabase environment, email deliverability/rate limits, EAS build credentials, privacy policy and App Store / Play Console submissions.
