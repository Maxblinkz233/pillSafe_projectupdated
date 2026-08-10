#!/usr/bin/env bash
# Allow the PillSafe service user to run nmcli without a password prompt.
# Run once on the Pi:  sudo bash scripts/install_nmcli_sudoers.sh
set -euo pipefail

USER_NAME="${1:-boison08}"
NMCLI="$(command -v nmcli || true)"
if [ -z "$NMCLI" ]; then
  echo "nmcli not found. Install NetworkManager first."
  exit 1
fi

FILE="/etc/sudoers.d/pillsafe-nmcli"
echo "$USER_NAME ALL=(root) NOPASSWD: $NMCLI" > "$FILE"
chmod 440 "$FILE"
visudo -cf "$FILE"
echo "Installed $FILE — $USER_NAME may run: sudo nmcli ..."
