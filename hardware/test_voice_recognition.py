#!/usr/bin/env python
# coding: utf-8

"""
PillSafe Voice Recognition Test

Standalone script for testing the voice recogniser module on a development PC.

Usage:
  python test_voice_recognition.py --list-challenge
  python test_voice_recognition.py --verify
  python test_voice_recognition.py --verify --user-id 7
  python test_voice_recognition.py --enrol --user-id 7
  python test_voice_recognition.py --setup --user-id 7

Notes:
  - Verification prompts for the user's name (DB lookup) unless --user-id is given.
  - Enrolment / setup still need --user-id (or name prompt) so the template is stored correctly.
  - The script prints friendly errors if audio dependencies are missing.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent
os.chdir(PROJECT_ROOT)
sys.path.insert(0, str(PROJECT_ROOT))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Test PillSafe voice recognition")
    parser.add_argument("--user-id", type=int, default=None, help="User ID to verify or enrol (skips name prompt)")
    parser.add_argument("--list-challenge", action="store_true", help="Print a random challenge prompt and exit")
    parser.add_argument("--verify", action="store_true", help="Run one voice verification attempt")
    parser.add_argument("--enrol", action="store_true", help="Record samples and save a voice template")
    parser.add_argument("--setup", action="store_true", help="Enrol first if needed, then run verification")
    return parser


def find_users_by_name(db, name: str) -> list[dict]:
    """Case-insensitive substring match on full_name."""
    needle = name.strip().lower()
    if not needle:
        return []
    return [
        u for u in db.get_all_users()
        if needle in (u.get("full_name") or "").lower()
    ]


def prompt_for_user(db, voice) -> dict | None:
    """Ask for a name (or numeric ID), resolve to a DB user, show voice-template status."""
    users = db.get_all_users()
    if not users:
        print("[FAIL] No users in the database. Enrol a user first with enroll_new_user.py")
        return None

    print("\nRegistered users:")
    for u in users:
        has_voice = voice.is_enrolled(u["user_id"])
        flag = "voice OK" if has_voice else "no voice template"
        print(f"  ID {u['user_id']}: {u['full_name']}  [{flag}]")

    raw = input("\nType your user name (or user ID): ").strip()
    if not raw:
        print("[FAIL] No name entered.")
        return None

    if raw.isdigit():
        user = db.get_user(int(raw))
        if user is None:
            print(f"[FAIL] No user with ID {raw}")
            return None
        return user

    matches = find_users_by_name(db, raw)
    if not matches:
        print(f"[FAIL] No user matching '{raw}'")
        return None
    if len(matches) > 1:
        print(f"[FAIL] Multiple users match '{raw}':")
        for u in matches:
            print(f"  ID {u['user_id']}: {u['full_name']}")
        print("Type a more specific name, or use the numeric ID.")
        return None
    return matches[0]


def resolve_user(args, db, voice) -> dict | None:
    """Resolve --user-id or interactive name prompt to a user dict."""
    if args.user_id is not None:
        user = db.get_user(args.user_id)
        if user is None:
            # Allow verify/enrol against a template even if DB row is missing
            print(f"[WARNING] No DB record for user_id={args.user_id}; using ID only")
            return {"user_id": args.user_id, "full_name": f"user_{args.user_id}"}
        return user
    return prompt_for_user(db, voice)


def run_verification(voice, user_id: int, full_name: str) -> int:
    print("[INFO] Starting voice verification...")
    challenge = voice.get_random_challenge()
    print(f"[PROMPT] {challenge}")
    print(f"[INFO] Verifying as: {full_name} (ID {user_id})")
    print("[INFO] Press ENTER when you are ready to start voice verification.")
    input()
    print("[INFO] Speak the prompt aloud when recording begins.")

    if not voice.is_enrolled(user_id):
        print(f"[FAIL] No voice template for {full_name} (ID {user_id}).")
        print("  Run with --enrol or --setup first.")
        return 1

    try:
        result = voice.verify_user(user_id)
    except Exception as exc:
        print(f"[ERROR] Verification failed: {exc}")
        return 1

    if result.get("error"):
        err = result["error"]
        if err == "no_speech":
            rms = result.get("rms", 0.0)
            print(f"[FAIL] No speech detected (RMS={rms}). Speak the prompt clearly into the mic.")
        else:
            print(f"[FAIL] Verification error: {err}")
        return 1

    verified = bool(result.get("verified"))
    similarity = result.get("similarity", 0.0)
    rms = result.get("rms")
    rms_note = f" rms={rms}" if rms is not None else ""
    print(f"[RESULT] user={full_name} (ID {user_id}) verified={verified} similarity={similarity}{rms_note}")
    if verified:
        print(f"[OK] Voice matches {full_name}.")
    else:
        print(f"[FAIL] Voice does not match {full_name}.")
    return 0 if verified else 2


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        from utils.config import load_config, get_config
        from utils.logger import setup_logger
        from core.voice_recogniser import VoiceRecogniser
        from database.db_manager import DatabaseManager
    except Exception as exc:
        print(f"[ERROR] Failed to import project modules: {exc}")
        return 1

    setup_logger("pillsafe.test_voice")

    try:
        load_config()
        cfg = get_config()
    except Exception as exc:
        print(f"[ERROR] Configuration load failed: {exc}")
        return 1

    voice = VoiceRecogniser()
    db = DatabaseManager()

    if args.list_challenge:
        try:
            print(voice.get_random_challenge())
            return 0
        except Exception as exc:
            print(f"[ERROR] Failed to generate challenge prompt: {exc}")
            return 1

    selected_modes = sum(bool(flag) for flag in (args.enrol, args.verify, args.setup))
    if selected_modes > 1:
        print("[ERROR] Choose only one mode: --enrol, --verify, or --setup")
        return 1

    if not args.enrol and not args.verify and not args.setup:
        print("[INFO] No mode selected, defaulting to --verify")
        args.verify = True

    voice_cfg = getattr(cfg, "voice", None)
    if voice_cfg is not None:
        print(
            f"[OK] Voice config loaded: sample_rate={voice_cfg.sample_rate}, "
            f"duration={voice_cfg.record_duration_sec}s, "
            f"threshold={voice_cfg.similarity_threshold}"
        )

    print(f"[OK] Project root: {PROJECT_ROOT}")

    user = resolve_user(args, db, voice)
    if user is None:
        return 1

    user_id = user["user_id"]
    full_name = user["full_name"]
    print(f"[OK] Selected user: {full_name} (ID {user_id})")

    if args.enrol:
        print("[INFO] Starting voice enrolment...")
        print("[INFO] Speak clearly when recording begins.")
        try:
            result = voice.enrol_user(user_id)
        except Exception as exc:
            print(f"[ERROR] Enrolment failed: {exc}")
            return 1

        if result.get("success"):
            print(f"[OK] Voice template saved for {full_name} (ID {user_id})")
            return 0

        print(f"[FAIL] Enrolment failed: {result.get('error', 'unknown error')}")
        return 1

    if args.setup:
        print("[INFO] Starting setup flow: enrolment followed by verification.")
        print("[INFO] Speak clearly during enrolment prompts and again for verification.")
        try:
            enrol_result = voice.enrol_user(user_id)
        except Exception as exc:
            print(f"[ERROR] Enrolment failed during setup: {exc}")
            return 1

        if not enrol_result.get("success"):
            print(f"[FAIL] Setup enrolment failed: {enrol_result.get('error', 'unknown error')}")
            return 1

        print(f"[OK] Voice template saved for {full_name} (ID {user_id})")

    return run_verification(voice, user_id, full_name)


if __name__ == "__main__":
    raise SystemExit(main())
