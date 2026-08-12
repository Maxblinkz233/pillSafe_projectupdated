#!/usr/bin/env bash
# Run ON the Raspberry Pi as boison08 (sudo for systemd).
# Installs pillsafe-expo.service so Metro starts on every boot.
set -euo pipefail

HUB="/home/boison08/Documents/pillSafe_projectupdated/hardware"
EXPO="/home/boison08/Documents/pillSafe_projectupdated/pillsafe-expo"
UNIT_SRC="$HUB/services/pillsafe-expo.service"
UNIT_DST="/etc/systemd/system/pillsafe-expo.service"
START_SCRIPT="$HUB/scripts/start_pillsafe_expo.sh"

cd "$HUB"

if [[ ! -d "$EXPO" || ! -f "$EXPO/package.json" ]]; then
  echo "ERROR: $EXPO not found. Copy pillsafe-expo to the Pi first."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is not installed."
  echo "Install Node 18+ (e.g. https://github.com/nodesource/distributions or nvm), then re-run."
  exit 1
fi

echo "==> Node $(node -v), npm $(npm -v)"

echo "==> Ensure data/ log dir exists"
mkdir -p data

echo "==> Install npm dependencies (first run may take a few minutes)"
cd "$EXPO"
npm install

echo "==> Make start script executable"
chmod +x "$START_SCRIPT"

echo "==> Install systemd unit from $UNIT_SRC"
sudo cp "$UNIT_SRC" "$UNIT_DST"
sudo systemctl daemon-reload
sudo systemctl enable pillsafe-expo
sudo systemctl restart pillsafe-expo

echo "==> Status"
sudo systemctl --no-pager --full status pillsafe-expo || true
echo
echo "==> Recent logs"
sudo journalctl -u pillsafe-expo -n 30 --no-pager || true
echo
echo "Metro log tail:"
tail -n 20 "$HUB/data/pillsafe_expo_stdout.log" 2>/dev/null || true

echo
echo "Done. After reboot: systemctl is-active pillsafe-expo"
echo "On your phone: open Expo Go and connect to exp://<pi-ip>:8081 (same Wi-Fi or PillSafe-AP)."
