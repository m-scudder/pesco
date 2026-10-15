#!/usr/bin/env bash
set -euo pipefail

# Run from anywhere inside the PESCO repository.
cd "$(dirname "$0")/.."

if [[ ! -f package.json || ! -f eas.json ]]; then
  echo 'Error: PESCO package.json and eas.json are required.' >&2
  exit 1
fi

for binary in node npm npx git; do
  if ! command -v "$binary" >/dev/null 2>&1; then
    echo "Error: Missing $binary" >&2
    exit 1
  fi
done

if [[ -x node_modules/.bin/eas ]]; then
  EAS=(node_modules/.bin/eas)
elif command -v eas >/dev/null 2>&1; then
  EAS=(eas)
else
  echo 'EAS CLI is missing. Install with: npm install -g eas-cli' >&2
  exit 1
fi

printf '\n=== PESCO | Physical Device QA ===\n'
echo "Branch: $(git branch --show-current)"
echo "Commit: $(git rev-parse --short HEAD)"
if [[ -n $(git status --porcelain) ]]; then
  echo 'WARNING: Uncommitted changes may affect the build.'
  read -r -p 'Continue? [y/N] ' dirty_answer
  [[ "$dirty_answer" =~ ^[Yy]$ ]] || exit 0
fi

"${EAS[@]}" whoami || { echo 'Sign in with: eas login'; exit 1; }

printf '\n--- Registered iOS devices ---\n'
if ! "${EAS[@]}" device:list; then
  echo 'Could not list registered devices. Check your EAS access and network.' >&2
  exit 1
fi

while true; do
  read -r -p $'\nRegister another iOS device? [y/N] ' add_device
  case "$add_device" in
    [Yy])
      "${EAS[@]}" device:create
      printf '\n--- Updated registered iOS devices ---\n'
      "${EAS[@]}" device:list
      ;;
    [Nn]|'') break ;;
    *) echo 'Please enter y or n.' ;;
  esac
done

printf '\nWhich preview build do you want?\n'
printf '  1) iOS\n  2) Android\n  3) Both\n  4) Exit\n'
while true; do
  read -r -p 'Choice [1-4]: ' choice
  case "$choice" in
    1|2|3|4) break ;;
    *) echo 'Choose 1, 2, 3, or 4.' ;;
  esac
done
[[ "$choice" != 4 ]] || exit 0

printf '\n--- Pre-build validation ---\n'
npm run typecheck
npx expo-doctor

printf '\n--- EAS Preview Build ---\n'
case "$choice" in
  1) "${EAS[@]}" build --platform ios --profile preview ;;
  2) "${EAS[@]}" build --platform android --profile preview ;;
  3) "${EAS[@]}" build --platform all --profile preview ;;
esac

printf '\nOpen the EAS build URL shown above to install on your device.\n'
printf 'New iOS devices must be included in the ad hoc provisioning profile for the build.\n'
