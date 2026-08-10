#!/usr/bin/env bash
# Run ON the Raspberry Pi as boison08 (sudo for systemd).
# Backs up config.yaml, installs/refreshes pillsafe.service, enables on boot.
set -euo pipefail

HUB="/home/boison08/Documents/pillSafe_projectupdated/hardware"
UNIT_SRC="$HUB/services/pillsafe.service"
UNIT_DST="/etc/systemd/system/pillsafe.service"

cd "$HUB"

echo "==> Backup config.yaml"
cp -a config.yaml "config.yaml.bak.$(date +%Y%m%d%H%M%S)"

echo "==> Ensure data/ log dir exists"
mkdir -p data

echo "==> Install systemd unit from $UNIT_SRC"
sudo cp "$UNIT_SRC" "$UNIT_DST"
sudo systemctl daemon-reload
sudo systemctl enable pillsafe
sudo systemctl restart pillsafe

echo "==> Status"
sudo systemctl --no-pager --full status pillsafe || true
echo
echo "==> Recent logs"
sudo journalctl -u pillsafe -n 40 --no-pager || true

if grep -q 'REPLACE_WITH_' config.yaml 2>/dev/null; then
  echo
  echo "WARNING: config.yaml still has REPLACE_WITH_ placeholders."
  echo "Restore Africa's Talking keys from a config.yaml.bak.* file."
fi

echo
echo "Done. After reboot, check: systemctl is-active pillsafe"
