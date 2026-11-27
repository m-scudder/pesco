# Automatic transaction tracking

PESCO finds payments in bank and UPI messages so users don't type them in.
Every detected payment is reviewed by the user before it becomes an expense.

## How messages reach PESCO

| Platform | Route | User setup |
|---|---|---|
| Android | `SmsReceiver` (works while the app is closed) + one-time 30-day inbox import | One "Allow SMS access" tap |
| iPhone | Shortcuts Message automation → "Log Bank Message in PESCO" App Intent | One-time guided automation (Settings → Automatic tracking) |
| Both | Paste a bank message on Detected payments | None |

Privacy rules built into the code:
- Native code keeps only messages from commercial senders (DLT headers such as `VM-HDFCBK`, Android) that mention an amount and a payment; OTPs and personal chats are never stored.
- Parsing runs on the device (`src/lib/transactionParser.ts`). Nothing from a message is uploaded until the user adds it as an expense.
- Long numbers are masked in the stored preview.

## Code map

- `src/lib/transactionParser.ts`: parser, duplicate detection, merge (unit-tested in `tests/transactionParser.test.cjs`)
- `src/lib/AutoCaptureContext.tsx`: detected list, merchant → category memory, add/dismiss
- `app/detected.tsx`, `app/auto-capture.tsx`: review screen and setup screen
- `modules/pesco-capture/`: local Expo module (Android receiver and inbox reader, iOS queue bridge)
- `modules/pesco-capture/ios-app/LogBankMessageIntent.swift`: App Intent, added to the app target by `plugins/withPescoCaptureIntent.cjs`

## Google Play: SMS permission declaration

`RECEIVE_SMS` and `READ_SMS` need Google's approval before release:
1. Play Console → App content → Sensitive permissions → declare SMS use under the **SMS-based money management** exception.
2. Describe the core feature: "Detects bank and UPI payment messages so users can add them as expenses after review."
3. Attach a short video showing Settings → Automatic tracking (the disclosure, the permission prompt, a detected payment).
4. The Data safety form and privacy policy must state that financial SMS are processed on the device.
5. The app must keep working if permission is denied (it does: manual entry and paste remain).

Submit early; approval is case by case.

## Device test checklist

Native code cannot be built in CI yet; test on real devices with a development build:

Android
- [ ] Settings → Automatic tracking shows the disclosure, then the system permission prompt
- [ ] "Find payments from the last 30 days" lists real past payments
- [ ] With PESCO closed, a new bank SMS appears in Detected payments on next open
- [ ] Personal SMS and OTPs never appear
- [ ] Denying permission keeps the app usable; "Open app settings" appears after "Don't ask again"

iPhone
- [ ] "Log Bank Message in PESCO" is listed under PESCO in the Shortcuts app
- [ ] A Message automation with "Rs" and Run Immediately runs without asking
- [ ] "Message" is pre-filled with Shortcut Input (or can be set to it)
- [ ] A new bank text appears in Detected payments on next open; setup screen shows "Working"

Both
- [ ] Adding a detected payment creates the expense; the same merchant pre-selects its category next time
- [ ] The same payment captured twice appears once
