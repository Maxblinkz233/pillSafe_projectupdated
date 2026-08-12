#!/usr/bin/env bash
# Start Expo Metro for PillSafe (headless, LAN mode).
# Used by pillsafe-expo.service on the Raspberry Pi.
set -euo pipefail

EXPO_DIR="/home/boison08/Documents/pillSafe_projectupdated/pillsafe-expo"
export HOME="/home/boison08"

if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  # shellcheck source=/dev/null
  source "$HOME/.nvm/nvm.sh"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install Node 18+ before enabling pillsafe-expo."
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$NODE_MAJOR" -lt 18 ]]; then
  echo "Node.js $(node -v) is too old; Expo SDK 54 needs Node 18+."
  exit 1
fi

cd "$EXPO_DIR"

if [[ ! -f package.json ]]; then
  echo "Missing $EXPO_DIR/package.json — sync pillsafe-expo to the Pi first."
  exit 1
fi

if [[ ! -d node_modules/expo ]]; then
  echo "Installing npm dependencies in $EXPO_DIR ..."
  npm install
fi

export CI=1
export EXPO_NO_TELEMETRY=1
export EXPO_NO_DOTENV=1

# --lan: phone on PillSafe-AP or same Wi-Fi can load the bundle from the Pi.
exec npx expo start --lan --non-interactive
