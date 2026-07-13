# PillSafe — Demo Script (defense / viva)

Use this checklist for a live demonstration. Time budget: ~10–15 minutes.

## Before you start (5 min)

1. Power the Raspberry Pi and external 5 V servo supply (common GND).
2. Confirm service is running:
   ```bash
   sudo systemctl status pillsafe
   # or: cd /home/pi/pillsafe/hardware && python3 main.py
   ```
3. Phone joins **PillSafe-AP** (or same LAN as the Pi).
4. Open the React Native app → **Settings → Device Connection**:
   - API URL: `http://192.168.4.1:5000` (hotspot) or `http://<pi-ip>:5000`
   - Token: value from `hardware/config.yaml` → `api.token`
   - Tap **Test Connection** → select the demo user → **Save**
5. Optional dry-run seed (dev machine or Pi):
   ```bash
   cd hardware
   python3 scripts/dry_run_demo.py --db-only
   ```

## Demo A — Successful dose (TAKEN)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Show **Home** | Live schedules, device Online, stats from API |
| 2 | Wait for RTC schedule match (or create a schedule for *now* + 1 min) | Buzzer `dose_ready`, REMINDER notification |
| 3 | Open **Verify** → **Verify Now (Face)** | App POSTs `/dispense/request` |
| 4 | Enrolled patient faces Pi camera | FaceNet ACCEPT → servo rotates → IR drop → pickup |
| 5 | Show **Home / Alerts** | DISPENSED notification, adherence TAKEN |

**Voice variant:** Verify → Use Voice Instead → speak passphrase into hub mic.

## Demo B — Missed dose (MISSED + SMS)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Trigger a schedule; do **not** press Verify Now | Grace period (default 15 min — shorten in `config.yaml` for demos) |
| 2 | Let grace expire | Adherence MISSED, MISSED notification |
| 3 | Caregiver phone | SMS from SIM800L (if GSM configured) |
| 4 | Show **Alerts** filter **Missed** | Unread MISSED card |

**Shortcut for UI-only proof** (no waiting):

```bash
python3 scripts/dry_run_demo.py --db-only
```

Then refresh Home / Alerts on the phone.

## Demo C — Rejected identity (optional)

1. Start a dose for patient A.
2. Have patient B (or an unenrolled face) attempt verification.
3. After max retries → REJECTED log + SMS + Alerts card.

## Talking points

- Identity is bound to the **scheduled** user (not any enrolled face).
- App does not capture biometrics; the **Pi camera / mic** does.
- Offline-capable: hotspot + SQLite + DS3231 RTC.
- Dual auth: face **or** voice (`auth_mode` on `/dispense/request`).

## Failures & recovery

| Symptom | Fix |
|---------|-----|
| App offline / connection error | Device Connection URL/token; same Wi-Fi; `curl http://PI:5000/health` |
| 401 Invalid token | Match `api.token` / `PILLSAFE_API_TOKEN` |
| Verify accepted but no dispense | Check Pi logs: face reject, IR timeout, servo power |
| No SMS | SIM800L power (3.7 V LiPo), shared GND, `alerts.serial_port` |

## Backup (if hardware fails on the day)

1. Run `python3 scripts/dry_run_demo.py --db-only` and show live app screens.
2. Play a pre-recorded video of a successful physical dispense.
3. Walk examiners through `hardware/main.py` dispense flow and `DEMO.md`.
