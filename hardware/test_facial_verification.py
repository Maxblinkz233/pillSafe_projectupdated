#!/usr/bin/env python
"""
PillSafe — Facial Verification Test
===================================
PC/webcam smoke test for the FaceNet verification pipeline
(detect → recognize via DecisionEngine).

Does not enroll users — use enroll_new_user.py for that.

Usage:
    python test_facial_verification.py
"""

import os
import sys
import time

import cv2

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)
os.chdir(PROJECT_ROOT)

from utils.config import load_config, get_config
from utils.logger import setup_logger
from core.camera import Camera
from core.detector import FaceDetector
from core.facenet_recogniser import FaceNetRecogniser
from core.decision import DecisionEngine, VerificationResult
from database.db_manager import DatabaseManager

logger = setup_logger("pillsafe.test_facial")

WINDOW_NAME = "PillSafe Face Verification"


def draw_overlay(frame, attempt, max_retries):
    """Return a copy of frame with verification status overlays."""
    disp = frame.copy()
    h, w = disp.shape[:2]

    top = disp.copy()
    cv2.rectangle(top, (0, 0), (w, 70), (0, 0, 0), -1)
    cv2.addWeighted(top, 0.6, disp, 0.4, 0, disp)
    cv2.putText(disp, "VERIFICATION", (15, 28),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
    cv2.putText(disp, f"Attempt {attempt}/{max_retries}", (15, 55),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

    bottom = disp.copy()
    cv2.rectangle(bottom, (0, h - 50), (w, h), (0, 0, 0), -1)
    cv2.addWeighted(bottom, 0.6, disp, 0.4, 0, disp)
    cv2.putText(disp, "Position your face in front of the camera", (15, h - 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 1)
    return disp


def print_outcome(outcome, db, elapsed):
    labels = {
        VerificationResult.ACCEPTED: "ACCEPTED",
        VerificationResult.REJECTED: "REJECTED",
        VerificationResult.NO_FACE: "NO_FACE",
        VerificationResult.MODEL_NOT_READY: "MODEL_NOT_READY",
    }
    print()
    print("=" * 60)
    print("VERIFICATION RESULT")
    print("=" * 60)
    print(f"Result:   {labels.get(outcome.result, outcome.result)}")
    print(f"Time:     {elapsed:.1f}s")
    print(f"Attempts: {outcome.attempt}")

    if outcome.result == VerificationResult.ACCEPTED:
        user = db.get_user(outcome.user_id) if db else None
        if user:
            print(f"User:     {user['full_name']} (ID {user['user_id']})")
            print(f"Compartment: {user['compartment_index']}")
        else:
            print(f"User ID:  {outcome.user_id} (no DB record)")
        if outcome.confidence is not None:
            print(f"Confidence: {outcome.confidence:.1f}")

    elif outcome.result == VerificationResult.REJECTED:
        print("Face detected but not recognized.")
        if outcome.confidence is not None:
            print(f"Confidence: {outcome.confidence:.1f}")

    elif outcome.result == VerificationResult.NO_FACE:
        print("No face detected — check camera and lighting.")

    elif outcome.result == VerificationResult.MODEL_NOT_READY:
        print("No trained embeddings. Enroll first:")
        print("  python enroll_new_user.py")

    print("=" * 60)


def main():
    load_config()
    get_config()

    camera = Camera(resolution=(640, 480))
    detector = FaceDetector()
    recogniser = FaceNetRecogniser()
    decision_engine = DecisionEngine(camera, detector, recogniser)

    try:
        db = DatabaseManager()
    except Exception as exc:
        print(f"WARNING: Database unavailable: {exc}")
        db = None

    print("=" * 60)
    print("PillSafe — Facial Verification Test")
    print("=" * 60)
    print(f"Model loaded:  {recogniser.model_loaded}")
    print(f"Embeddings:    {'yes' if recogniser.is_trained else 'no'} "
          f"({len(recogniser.user_embeddings)} user(s))")
    print(f"Max retries:   {decision_engine.max_retries}")
    print()

    if not recogniser.model_loaded:
        print("ERROR: MobileFaceNet model not loaded.")
        print(f"  Expected at: {recogniser.model_path}")
        return 1

    camera.start()
    if not camera.is_active:
        print("ERROR: Could not start the camera.")
        return 1

    print("Starting in 3 seconds — position your face in front of the camera.")
    for n in range(3, 0, -1):
        print(f"  {n}...")
        frame = camera.capture_frame()
        if frame is not None:
            cv2.imshow(WINDOW_NAME, draw_overlay(frame, 0, decision_engine.max_retries))
            cv2.waitKey(1)
        time.sleep(1)

    print("Verification running...\n")
    start = time.time()
    outcome = decision_engine.run_verification(expected_user_id=None)
    elapsed = time.time() - start

    cv2.destroyAllWindows()
    print_outcome(outcome, db, elapsed)

    camera.stop()
    print("Done.")
    return 0 if outcome.result == VerificationResult.ACCEPTED else 1


if __name__ == "__main__":
    sys.exit(main())
