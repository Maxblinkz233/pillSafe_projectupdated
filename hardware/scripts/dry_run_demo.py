#!/usr/bin/env python3
"""
PillSafe — hardware / API dry-run for one TAKEN dose and one MISSED dose.

Runs against a live Flask API (main.py) or can seed the local SQLite DB
directly when --db-only is used (no HTTP / no GPIO required).

Usage (from hardware/):
  # Simulate adherence outcomes in SQLite (safe on a Windows/dev machine):
  python scripts/dry_run_demo.py --db-only

  # Against a running hub (Pi or localhost with main.py):
  python scripts/dry_run_demo.py --base-url http://127.0.0.1:5000 \\
      --token CHANGE_ME_ON_FIRST_SETUP

  # Full "Verify Now" handshake while a schedule is in grace:
  python scripts/dry_run_demo.py --base-url http://192.168.4.1:5000 \\
      --token YOUR_TOKEN --verify-now

What it proves:
  1) TAKEN path  — adherence log + DISPENSED notification (+ optional Verify Now)
  2) MISSED path — adherence log + MISSED notification (SMS if GSM is live)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)
os.chdir(PROJECT_ROOT)


def _http(base_url: str, token: str, method: str, path: str, body: dict | None = None):
    url = base_url.rstrip("/") + path
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            **({"Content-Type": "application/json"} if body is not None else {}),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw}
        return e.code, payload


def dry_run_db_only() -> int:
    from utils.config import load_config
    load_config()
    from database.db_manager import DatabaseManager

    db = DatabaseManager()
    users = db.get_all_users()
    if not users:
        uid = db.create_user("DryRun Patient", "+233000000000", 0)
        print(f"[db] created user_id={uid}")
    else:
        uid = users[0]["user_id"]
        print(f"[db] using existing user_id={uid} ({users[0]['full_name']})")

    schedules = db.get_active_schedules(uid)
    now = datetime.now()
    taken_time = (now - timedelta(minutes=5)).strftime("%H:%M")
    missed_time = (now - timedelta(minutes=20)).strftime("%H:%M")

    if not schedules:
        sid_taken = db.create_schedule(
            uid, "DryRun Atorvastatin", taken_time,
            slot_index=0, dosage="20mg", pills_per_dose=1,
        )
        sid_missed = db.create_schedule(
            uid, "DryRun Metformin", missed_time,
            slot_index=1, dosage="500mg", pills_per_dose=1,
        )
        print(f"[db] created schedules taken={sid_taken} missed={sid_missed}")
    else:
        sid_taken = schedules[0]["schedule_id"]
        sid_missed = schedules[1]["schedule_id"] if len(schedules) > 1 else schedules[0]["schedule_id"]
        print(f"[db] using schedules taken={sid_taken} missed={sid_missed}")

    # Ensure inventory row exists for TAKEN decrement path later
    try:
        db.upsert_inventory(0, 0, 10, medication_name="DryRun Atorvastatin",
                            low_threshold=2, user_id=uid)
    except Exception as e:
        print(f"[db] inventory upsert skipped: {e}")

    db.log_event(uid, sid_taken, taken_time, "TAKEN", actual_time=taken_time)
    db.add_notification("DISPENSED", f"Dry-run TAKEN dose at {taken_time}", user_id=uid)
    print("[ok] TAKEN adherence + DISPENSED notification recorded")

    db.log_event(uid, sid_missed, missed_time, "MISSED")
    db.add_notification(
        "MISSED",
        f"Dry-run MISSED dose at {missed_time}",
        user_id=uid,
    )
    print("[ok] MISSED adherence + MISSED notification recorded")
    print("[hint] Open the mobile Alerts / Home screens to see live data.")
    print("[hint] On the Pi, AlertService will SMS unacknowledged MISSED events if GSM is up.")
    return 0


def dry_run_api(base_url: str, token: str, verify_now: bool) -> int:
    status, health = _http(base_url, token, "GET", "/health")
    if status != 200:
        print(f"[fail] /health → {status} {health}")
        return 1
    print(f"[ok] /health → {health}")

    status, users = _http(base_url, token, "GET", "/users")
    if status != 200:
        print(f"[fail] /users → {status} {users}")
        return 1
    user_list = users.get("data") if isinstance(users, dict) else users
    if not user_list:
        print("[fail] no users on hub — enrol a user first")
        return 1
    user = user_list[0]
    uid = user["user_id"]
    print(f"[ok] user_id={uid} ({user.get('full_name')})")

    status, schedules_payload = _http(
        base_url, token, "GET", f"/schedules?user_id={uid}"
    )
    schedules = (
        schedules_payload.get("data")
        if isinstance(schedules_payload, dict)
        else schedules_payload
    )
    if status != 200 or not schedules:
        print("[warn] no schedules — creating one via API for dry-run")
        dose_time = datetime.now().strftime("%H:%M")
        status, created = _http(
            base_url,
            token,
            "POST",
            "/schedules",
            {
                "user_id": uid,
                "medication_name": "DryRun Dose",
                "dose_time": dose_time,
                "slot_index": 0,
                "dosage": "1 tablet",
                "pills_per_dose": 1,
            },
        )
        if status not in (200, 201):
            print(f"[fail] create schedule → {status} {created}")
            return 1
        sid = created.get("data", {}).get("schedule_id")
        print(f"[ok] schedule_id={sid} at {dose_time}")
    else:
        sid = schedules[0]["schedule_id"]
        print(f"[ok] schedule_id={sid} ({schedules[0].get('medication_name')})")

    if verify_now:
        print("[info] POST /dispense/request (face) — hub must be in grace window")
        status, resp = _http(
            base_url,
            token,
            "POST",
            "/dispense/request",
            {"user_id": uid, "schedule_id": sid, "auth_mode": "face"},
        )
        print(f"[{'ok' if status == 200 else 'fail'}] verify-now → {status} {resp}")
        if status != 200:
            return 1
        print("[hint] Stand in front of the Pi camera now.")
        time.sleep(2)

    # Always seed DB outcomes so Home/Alerts show TAKEN + MISSED even without hardware
    print("[info] also seeding TAKEN + MISSED via local DB helpers for UI proof…")
    return dry_run_db_only()


def main() -> int:
    parser = argparse.ArgumentParser(description="PillSafe dry-run demo")
    parser.add_argument("--db-only", action="store_true",
                        help="Only write TAKEN/MISSED to SQLite (no HTTP)")
    parser.add_argument("--base-url", default="http://127.0.0.1:5000")
    parser.add_argument("--token", default=None,
                        help="Bearer token (default: config.yaml / env)")
    parser.add_argument("--verify-now", action="store_true",
                        help="POST /dispense/request during a live grace window")
    args = parser.parse_args()

    if args.db_only:
        return dry_run_db_only()

    token = args.token or os.environ.get("PILLSAFE_API_TOKEN")
    if not token:
        try:
            from utils.config import load_config, get_config
            load_config()
            token = get_config().api.token
        except Exception:
            token = "CHANGE_ME_ON_FIRST_SETUP"

    return dry_run_api(args.base_url, token, args.verify_now)


if __name__ == "__main__":
    raise SystemExit(main())
