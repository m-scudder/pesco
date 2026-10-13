# PESCO — Milestone 1 Starter

React Native + Expo Router + TypeScript. Designed for iOS and Android.

## Setup (on your development machine)

1. Install Node.js (LTS) and platform development tools.
2. Run `npm install` from this directory.
3. Run `npx expo install --fix` to align native dependencies with the installed Expo SDK.
4. Run `npm run typecheck`.
5. Run `npm start`, then `npm run ios` (requires macOS/Xcode) or `npm run android` (requires Android emulator or device).

`npm install` and builds have **not** been run in the artifact environment. If registry versions differ, `npx expo install --fix` is the canonical Expo compatibility step. No Supabase credentials are present.

## Implemented in this starter

- Four tabs: Home, Expenses, Insights, Settings.
- Household/Personal scope switch shared across screens.
- Light/dark/System appearance setting (currently held in memory only).
- Floating Add Expense button on Home and Expenses.
- Entry-screen skeleton with left labels/right inputs.
- Honest empty states and disabled backend behavior: tapping Save explicitly says nothing was saved.

## Deliberately not implemented

- Authentication, households, expense CRUD, Supabase configuration, budgets, search, receipt upload, persistent preferences, actual analytics.
- Device builds, tests or publishing.

## Configuration

Copy `.env.example` to `.env` only once Milestone 2 begins. Never include a Supabase service-role key in a mobile client.

## Branding

PESCO is a **working name**, pending trademark/app-store/domain clearance. Do not commit permanent platform bundle IDs before clearance.
