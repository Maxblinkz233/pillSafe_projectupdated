# PillSafe

Smart medication dispenser (Raspberry Pi hub) + **React Native** caregiver/patient app.

**KNUST — Department of Computer Engineering | BSc Final Year Project**

| Layer | Location | Role |
|-------|----------|------|
| Pi backend | [`hardware/`](hardware/) | Face/voice verify, schedules, servos, SMS, Flask API |
| Mobile app | [`src/`](src/) | React Native UI wired to the Pi REST API |
| Demo script | [`DEMO.md`](DEMO.md) | Viva / defense walkthrough |

## Quick start — mobile app

```sh
npm install
npm start
# another terminal:
npm run android   # or: npm run ios
```

1. Join the Pi hotspot **PillSafe-AP** (or same LAN).
2. In the app: **Settings → Device Connection**
   - URL: `http://192.168.4.1:5000`
   - Token: from `hardware/config.yaml` → `api.token`
3. **Test Connection** → pick user → **Save**
4. Use **Home / Schedule / Alerts / Verify** against live hub data.

## Quick start — Raspberry Pi hub

Follow the full guide in [`hardware/README.md`](hardware/README.md).

```sh
cd hardware
python3 main.py
# dry-run TAKEN + MISSED for UI proof:
python3 scripts/dry_run_demo.py --db-only
```

## Architecture (app ↔ hub)

- App stores API URL + Bearer token in AsyncStorage.
- **Verify Now** → `POST /dispense/request` with `user_id`, optional `schedule_id`, `auth_mode` (`face` \| `voice`).
- Home / Schedule / Alerts load `/schedules`, `/adherence`, `/notifications`, `/health`.

## Docs

- [Hardware README](hardware/README.md) — wiring, deploy, API reference
- [DEMO.md](DEMO.md) — live demo checklist (taken + missed dose)
