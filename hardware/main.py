"""
PillSafe — Main Control Loop
Entry point that initialises all modules and coordinates the
dispensing workflow as described in the SDR §9.

Startup Sequence:
  1. Load configuration
  2. Initialise database
  3. Initialise hardware (camera, servo, IR sensors, buzzer, RTC, GSM)
  4. Load FaceNet (TFLite) recognition model
  5. Start Flask API server as a background thread
  6. Start the scheduling daemon
  7. Start the SMS alert service
  8. Enter idle state — wait for dispensing events

Operational Workflow (per event):
  1. Scheduler detects a time match → creates DispenseEvent
  2. Buzzer plays "dose_ready" pattern
  3. Camera activates → face detection + FaceNet (TFLite) verification
  4. On ACCEPT: servo rotates to compartment → IR confirms pill drop → IR confirms pickup → log TAKEN
  5. On REJECT (3 failures): log REJECTED → send alert
  6. On TIMEOUT (grace period): log MISSED → send alert
  7. Return to idle
"""

import os
import sys
import signal
import threading
import uuid
from datetime import datetime, timedelta

# Ensure project root is on the Python path
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)
os.chdir(PROJECT_ROOT)

from utils.config import load_config, get_config
from utils.logger import setup_logger

# Load config first
load_config()
logger = setup_logger("pillsafe.main")

from database.db_manager import DatabaseManager
from core.camera import Camera
from core.detector import FaceDetector
from core.facenet_recogniser import FaceNetRecogniser
from core.decision import DecisionEngine, VerificationResult
from hardware.dispenser import Dispenser
from hardware.ir_sensor import IRSensorManager
from hardware.buzzer import Buzzer
from hardware.rtc import RealTimeClock
from hardware.gsm import GSMModule
from scheduler.schedule_controller import ScheduleController, DispenseEvent
from alerts.alert_service import AlertService
from enrollment.enrol_user import EnrolmentManager
from api.routes import create_app

try:
    from core.voice_recogniser import VoiceRecogniser
except Exception:  # pragma: no cover - optional when sounddevice/librosa missing
    VoiceRecogniser = None


class PillSafeSystem:
    """Main system controller — orchestrates all PillSafe components."""

    def __init__(self):
        logger.info("=" * 60)
        logger.info("PillSafe Smart Pill Dispenser — Starting Up")
        logger.info("=" * 60) 

        cfg = get_config()

        # ── Step 1: Database ─────────────────────────────────
        logger.info("Initialising database...")
        self.db = DatabaseManager()

        # ── Step 2: Hardware ─────────────────────────────────
        logger.info("Initialising hardware modules...")
        self.camera = Camera()
        self.rtc = RealTimeClock()
        self.dispenser = Dispenser()
        self.ir_sensors = IRSensorManager()
        self.buzzer = Buzzer()
        self.gsm = GSMModule()

        # ── Step 3: Core AI ──────────────────────────────────
        logger.info("Initialising facial recognition pipeline...")
        self.detector = FaceDetector()
        self.recogniser = FaceNetRecogniser()
        voice_cfg = getattr(cfg, "voice", None)
        voice_enabled = bool(voice_cfg and getattr(voice_cfg, "enabled", False))
        self.voice_recogniser = None
        if voice_enabled and VoiceRecogniser is not None:
            try:
                self.voice_recogniser = VoiceRecogniser()
                logger.info("Voice recogniser initialised")
            except Exception as e:
                logger.warning("Voice recogniser unavailable: %s — voice auth disabled", e)
        elif not voice_enabled:
            logger.info("Voice auth disabled in config (voice.enabled=false)")
        else:
            logger.warning("Voice dependencies missing — voice auth disabled")
        self.decision_engine = DecisionEngine(
            self.camera, self.detector, self.recogniser, self.voice_recogniser
        )

        # ── Step 4: Enrolment Manager ────────────────────────
        self.enrolment = EnrolmentManager(
            self.camera, self.detector, self.recogniser, self.db, self.voice_recogniser
        )

        # ── Step 5: Alert Service ────────────────────────────
        self.alert_service = AlertService(self.db, self.gsm)

        # ── Step 6: Scheduler ────────────────────────────────
        self.scheduler = ScheduleController(self.db, self.rtc)
        self.scheduler.set_event_callback(self._handle_dispense_event)

        # Active scheduler grace-window event (if any). Used so the app's
        # blocking Verify Now can hand off to the camera already waiting.
        self._active_dispense_event: DispenseEvent | None = None
        self._active_dispense_lock = threading.Lock()

        # ── Step 7: Flask API ────────────────────────────────
        self.app = create_app(
            db=self.db,
            enrolment_manager=self.enrolment,
            rtc=self.rtc,
            gsm=self.gsm,
            camera=self.camera,
            verify_dispense_fn=self.verify_and_dispense,
        )

        self._running = False

    def start(self) -> None:
        """Start all background services and enter the main loop."""
        self._running = True

        # Register signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

        # Start the alert service
        self.alert_service.start()

        # Start the scheduler
        self.scheduler.start()

        # Start the Flask API in a background thread (FR-24)
        cfg = get_config()
        api_thread = threading.Thread(
            target=self.app.run,
            kwargs={
                "host": cfg.api.host,
                "port": cfg.api.port,
                "debug": False,
                "use_reloader": False,
            },
            daemon=True,
        )
        api_thread.start()
        logger.info("Flask API started on %s:%d", cfg.api.host, cfg.api.port)

        rtc_time = self.rtc.get_time_string("%Y-%m-%d %H:%M:%S")
        logger.info("System ready — RTC time: %s", rtc_time)
        logger.info("Entering idle state — waiting for dispensing events...")

        # Keep the main thread alive
        try:
            while self._running:
                signal.pause()
        except AttributeError:
            # signal.pause() not available on Windows
            import time
            while self._running:
                time.sleep(1)

    def _handle_dispense_event(self, event: DispenseEvent) -> None:
        """
        Handle a dispensing event triggered by the scheduler.
        This runs in its own thread for each event.
        Implements the full operational workflow from SDR §9.
        """
        logger.info("=" * 40)
        logger.info("DISPENSING EVENT: %s for %s at %s",
                     event.medication_name, event.full_name, event.scheduled_time)
        logger.info("Compartment: %d | Grace deadline: %s",
                     event.compartment_index,
                     event.grace_deadline.strftime("%H:%M:%S"))
        logger.info("=" * 40)

        with self._active_dispense_lock:
            self._active_dispense_event = event

        # Step 1: Notify the app + sound the buzzer to alert the user (NFR-18)
        self._notify(
            "REMINDER",
            f"Time to take {event.medication_name}"
            + (f" ({event.dosage})" if event.dosage else ""),
            user_id=event.user_id,
        )
        self.buzzer.play("dose_ready")

        # Step 2: Activate camera
        self.camera.start()

        cfg = get_config()
        dispense_cfg = getattr(cfg, "dispense", None)
        require_request = (
            getattr(dispense_cfg, "require_verify_request", True)
            if dispense_cfg is not None else True
        )

        try:
            if require_request:
                # App-initiated "Verify Now" handshake (FR-56/FR-57)
                self._run_verify_now_loop(event)
            else:
                # Autonomous timer-driven verification
                self._run_autonomous_verification(event)
        finally:
            # Return to idle
            self.camera.stop()
            self.dispenser.home(event.compartment_index)
            with self._active_dispense_lock:
                if self._active_dispense_event is event:
                    self._active_dispense_event = None
            logger.info("Returning to idle state")

    def verify_and_dispense(
        self,
        user_id: int,
        schedule_id: int | None,
        auth_mode: str = "face",
        timeout_seconds: float = 90.0,
    ) -> dict:
        """
        App-triggered Verify Now: run face/voice auth, then dispense.

        If the scheduler is already in a grace window for this user/schedule,
        hand off to that loop (camera already running). Otherwise run an
        on-demand verification + dispense for late / missed / manual doses.
        """
        with self._active_dispense_lock:
            active = self._active_dispense_event

        if active is not None:
            if active.user_id != user_id:
                return {
                    "ok": False,
                    "http_status": 409,
                    "error": "Another patient's dose is awaiting verification",
                    "result": "BUSY",
                    "dispensed": False,
                }
            if schedule_id is not None and int(schedule_id) != active.schedule_id:
                return {
                    "ok": False,
                    "http_status": 409,
                    "error": "A different dose is currently awaiting verification on the hub",
                    "result": "BUSY",
                    "dispensed": False,
                }
            return self._handoff_to_active_event(
                user_id=user_id,
                schedule_id=active.schedule_id,
                auth_mode=auth_mode,
                timeout_seconds=timeout_seconds,
            )

        if schedule_id is None:
            return {
                "ok": False,
                "http_status": 400,
                "error": "schedule_id required when no dose is currently due on the hub",
                "result": "MISSING_SCHEDULE",
                "dispensed": False,
            }

        return self._on_demand_verify_dispense(
            user_id=user_id,
            schedule_id=int(schedule_id),
            auth_mode=auth_mode,
        )

    def _handoff_to_active_event(
        self,
        user_id: int,
        schedule_id: int,
        auth_mode: str,
        timeout_seconds: float,
    ) -> dict:
        """Queue PENDING_AUTH for the grace-window loop and wait for its result."""
        token = uuid.uuid4().hex
        result_event = threading.Event()
        result_holder: dict = {}
        self.app.config["PENDING_AUTH"] = {
            "user_id": user_id,
            "schedule_id": schedule_id,
            "mode": auth_mode,
            "token": token,
            "result_event": result_event,
            "result_holder": result_holder,
        }

        if not result_event.wait(timeout=timeout_seconds):
            pending = self.app.config.get("PENDING_AUTH") or {}
            if pending.get("token") == token:
                self.app.config["PENDING_AUTH"] = None
            return {
                "ok": False,
                "http_status": 504,
                "error": "Hub did not complete verification in time. Stand in front of the hub camera and try again.",
                "result": "TIMEOUT",
                "dispensed": False,
            }

        return {
            "ok": bool(result_holder.get("ok", False)),
            "http_status": 200 if result_holder.get("ok") else 401,
            "result": result_holder.get("result", "UNKNOWN"),
            "dispensed": bool(result_holder.get("dispensed", False)),
            "confidence": result_holder.get("confidence"),
            "auth_mode": result_holder.get("auth_mode", auth_mode),
            "medication_name": result_holder.get("medication_name"),
            "error": result_holder.get("error"),
        }

    def _publish_verify_result(self, pending: dict | None, payload: dict) -> None:
        """Signal a blocking /dispense/verify caller (if any)."""
        if not pending:
            return
        holder = pending.get("result_holder")
        event = pending.get("result_event")
        if isinstance(holder, dict):
            holder.clear()
            holder.update(payload)
        if event is not None:
            try:
                event.set()
            except Exception:
                pass

    def _on_demand_verify_dispense(
        self, user_id: int, schedule_id: int, auth_mode: str,
    ) -> dict:
        """Start the hub camera, verify identity, then dispense for a schedule."""
        sched = self.db.get_schedule_with_user(schedule_id)
        if not sched or int(sched["user_id"]) != int(user_id):
            return {
                "ok": False,
                "http_status": 404,
                "error": "Schedule not found for this user",
                "result": "NOT_FOUND",
                "dispensed": False,
            }
        if not sched.get("is_active", 1):
            return {
                "ok": False,
                "http_status": 400,
                "error": "Schedule is inactive",
                "result": "INACTIVE",
                "dispensed": False,
            }

        user = self.db.get_user(user_id)
        if auth_mode == "face" and user and not user.get("enrolment_status"):
            return {
                "ok": False,
                "http_status": 400,
                "error": "Face enrolment required before verification",
                "result": "MODEL_NOT_READY",
                "dispensed": False,
            }

        event = DispenseEvent(
            user_id=int(sched["user_id"]),
            full_name=sched.get("full_name") or "Patient",
            medication_name=sched["medication_name"],
            compartment_index=int(sched["compartment_index"]),
            schedule_id=int(sched["schedule_id"]),
            scheduled_time=sched["dose_time"],
            grace_deadline=datetime.now() + timedelta(minutes=1),
            slot_index=int(sched.get("slot_index") or 0),
            dosage=sched.get("dosage"),
            pills_per_dose=int(sched.get("pills_per_dose") or 1),
        )

        with self._active_dispense_lock:
            if self._active_dispense_event is not None:
                return {
                    "ok": False,
                    "http_status": 409,
                    "error": "Hub is busy with another dispense event",
                    "result": "BUSY",
                    "dispensed": False,
                }
            self._active_dispense_event = event

        self.camera.start()
        try:
            logger.info(
                "On-demand Verify Now: user %d schedule %d mode=%s",
                user_id, schedule_id, auth_mode,
            )
            outcome = self.decision_engine.run_verification(
                expected_user_id=event.user_id,
                auth_mode=auth_mode,
            )
            return self._finalize_verify_outcome(event, auth_mode, outcome)
        finally:
            self.camera.stop()
            try:
                self.dispenser.home(event.compartment_index)
            except Exception as e:
                logger.error("Failed to home dispenser after on-demand verify: %s", e)
            with self._active_dispense_lock:
                if self._active_dispense_event is event:
                    self._active_dispense_event = None

    def _finalize_verify_outcome(
        self, event: DispenseEvent, auth_mode: str, outcome,
    ) -> dict:
        """Map a VerificationOutcome to API payload and side effects."""
        result_name = (
            outcome.result.value
            if hasattr(outcome.result, "value")
            else str(outcome.result)
        )
        base = {
            "result": result_name,
            "confidence": outcome.confidence,
            "auth_mode": auth_mode,
            "medication_name": event.medication_name,
            "schedule_id": event.schedule_id,
        }

        if outcome.result == VerificationResult.ACCEPTED:
            dispensed = self._perform_dispense(event, auth_mode=auth_mode)
            return {
                **base,
                "ok": True,
                "http_status": 200,
                "dispensed": dispensed,
                "error": None if dispensed else "Verified but dispensing failed",
            }

        if outcome.result == VerificationResult.REJECTED:
            self._log_and_alert_rejected(event, auth_mode=auth_mode)
            return {
                **base,
                "ok": False,
                "http_status": 401,
                "dispensed": False,
                "error": "Face did not match the enrolled patient",
            }

        if outcome.result == VerificationResult.NO_FACE:
            return {
                **base,
                "ok": False,
                "http_status": 400,
                "dispensed": False,
                "error": "No face detected — stand in front of the hub camera and try again",
            }

        if outcome.result == VerificationResult.MODEL_NOT_READY:
            return {
                **base,
                "ok": False,
                "http_status": 400,
                "dispensed": False,
                "error": "Face model not ready — complete face enrolment first",
            }

        return {
            **base,
            "ok": False,
            "http_status": 400,
            "dispensed": False,
            "error": f"Verification incomplete ({result_name})",
        }

    # ── Verification strategies ──────────────────────────────

    def _run_autonomous_verification(self, event: DispenseEvent) -> None:
        """Timer-driven path: verify immediately when the dose is due."""
        pending = self.app.config.get("PENDING_AUTH") or {}
        auth_mode = pending.get("mode", "face")

        outcome = self.decision_engine.run_verification(
            expected_user_id=event.user_id,
            auth_mode=auth_mode,
        )

        if outcome.result == VerificationResult.ACCEPTED:
            logger.info("User %d verified — dispensing medication", event.user_id)
            self._perform_dispense(event, auth_mode=auth_mode)
        elif outcome.result == VerificationResult.REJECTED:
            self._log_and_alert_rejected(event, auth_mode=auth_mode)
        elif outcome.result == VerificationResult.NO_FACE:
            logger.info("No face detected — waiting for grace period to expire")
            self._wait_for_grace_period(event)
        else:
            logger.error("Verification returned: %s", outcome.result)
            self._wait_for_grace_period(event)

    def _run_verify_now_loop(self, event: DispenseEvent) -> None:
        """
        Wait for the mobile app to send a "Verify Now" request
        (POST /dispense/request or /dispense/verify), then authenticate
        in the chosen mode. Repeats until success, hard rejection, or the
        grace deadline (FR-16).
        """
        import time

        cfg = get_config()
        dispense_cfg = getattr(cfg, "dispense", None)
        poll = getattr(dispense_cfg, "verify_request_poll_seconds", 2) if dispense_cfg else 2

        logger.info("Awaiting 'Verify Now' from the app until %s",
                    event.grace_deadline.strftime("%H:%M:%S"))

        while datetime.now() < event.grace_deadline and self._running:
            pending = self._consume_verify_request(event)
            if pending is None:
                time.sleep(poll)
                continue

            auth_mode = pending.get("mode", "face")
            logger.info("Verify Now received (mode=%s) for user %d",
                        auth_mode, event.user_id)
            outcome = self.decision_engine.run_verification(
                expected_user_id=event.user_id,
                auth_mode=auth_mode,
            )

            if outcome.result == VerificationResult.ACCEPTED:
                logger.info("User %d verified — dispensing medication", event.user_id)
                dispensed = self._perform_dispense(event, auth_mode=auth_mode)
                self._publish_verify_result(pending, {
                    "ok": True,
                    "result": VerificationResult.ACCEPTED.value,
                    "dispensed": dispensed,
                    "confidence": outcome.confidence,
                    "auth_mode": auth_mode,
                    "medication_name": event.medication_name,
                    "error": None if dispensed else "Verified but dispensing failed",
                })
                return
            if outcome.result == VerificationResult.REJECTED:
                self._log_and_alert_rejected(event, auth_mode=auth_mode)
                self._publish_verify_result(pending, {
                    "ok": False,
                    "result": VerificationResult.REJECTED.value,
                    "dispensed": False,
                    "confidence": outcome.confidence,
                    "auth_mode": auth_mode,
                    "medication_name": event.medication_name,
                    "error": "Face did not match the enrolled patient",
                })
                return
            # NO_FACE / model-not-ready / audio error → let the user try again
            result_name = (
                outcome.result.value
                if hasattr(outcome.result, "value")
                else str(outcome.result)
            )
            logger.info("Verification incomplete (%s) — awaiting another Verify Now",
                        outcome.result)
            self._publish_verify_result(pending, {
                "ok": False,
                "result": result_name,
                "dispensed": False,
                "confidence": outcome.confidence,
                "auth_mode": auth_mode,
                "medication_name": event.medication_name,
                "error": (
                    "No face detected — stand in front of the hub camera and try again"
                    if outcome.result == VerificationResult.NO_FACE
                    else f"Verification incomplete ({result_name})"
                ),
            })
            time.sleep(poll)

        # Grace deadline reached with no successful verification
        self._log_and_alert_missed(event)

    def _consume_verify_request(self, event: DispenseEvent) -> dict | None:
        """Return and clear a pending Verify-Now request for this event."""
        pending = self.app.config.get("PENDING_AUTH")
        if not pending:
            return None
        try:
            pending_uid = int(pending.get("user_id"))
        except (TypeError, ValueError):
            return None
        if pending_uid != event.user_id:
            return None
        sid = pending.get("schedule_id")
        if sid is not None:
            try:
                if int(sid) != event.schedule_id:
                    return None
            except (TypeError, ValueError):
                return None
        self.app.config["PENDING_AUTH"] = None
        pending = dict(pending)
        pending["user_id"] = pending_uid
        if sid is not None:
            pending["schedule_id"] = int(sid)
        return pending

    # ── Dispense + outcome helpers ───────────────────────────

    def _perform_dispense(self, event: DispenseEvent, auth_mode: str = "face") -> bool:
        """
        Rotate the compartment to the target slot, confirm the drop and the
        pickup via the IR sensors, then log TAKEN, update inventory and
        notify the app. Returns True if the dose was dispensed and collected.
        """
        # Rotate the compartment's cylinder so the slot aligns with the hole
        rotated = self.dispenser.rotate_to(event.compartment_index, event.slot_index)
        if not rotated:
            self._handle_mechanical_error(event, auth_mode=auth_mode)
            return False

        # IR confirms the pill fell through the delivery tube
        pill_dropped = self.ir_sensors.wait_for_pill_drop(timeout=5.0)
        if not pill_dropped:
            self._handle_mechanical_error(event, auth_mode=auth_mode)
            return False

        # IR confirms the user collected the pill from the base
        picked_up = self.ir_sensors.wait_for_pickup(timeout=120.0)
        if not picked_up:
            logger.warning(
                "Pill dropped for user %d but was not collected within timeout",
                event.user_id,
            )
            self.db.log_event(
                user_id=event.user_id,
                schedule_id=event.schedule_id,
                scheduled_time=event.scheduled_time,
                outcome="MECHANICAL_ERROR",
                auth_mode=auth_mode,
            )
            self.buzzer.play("failure")
            # Pill left the compartment — still decrement stock
            self._update_inventory_after_dispense(event)
            self._notify(
                "MECHANICAL_ERROR",
                f"{event.medication_name} dispensed for {event.full_name} "
                f"but not collected from the tray",
                user_id=event.user_id,
            )
            self.alert_service.send_immediate_alert(
                event.user_id, event.schedule_id,
                "MECHANICAL_ERROR", event.scheduled_time,
            )
            return False

        actual_time = datetime.now().strftime("%H:%M")
        self.db.log_event(
            user_id=event.user_id,
            schedule_id=event.schedule_id,
            scheduled_time=event.scheduled_time,
            outcome="TAKEN",
            actual_time=actual_time,
            auth_mode=auth_mode,
        )
        self.buzzer.play("success")
        self._update_inventory_after_dispense(event)
        self._notify(
            "DISPENSED",
            f"{event.medication_name} dispensed to {event.full_name} at {actual_time}",
            user_id=event.user_id,
        )
        logger.info("Dose TAKEN by user %d at %s (compartment %d, slot %d)",
                    event.user_id, actual_time, event.compartment_index, event.slot_index)
        return True

    def _update_inventory_after_dispense(self, event: DispenseEvent) -> None:
        """Decrement slot inventory and raise a low-stock alert if needed."""
        try:
            new_count = self.db.decrement_inventory(
                event.compartment_index, event.slot_index, event.pills_per_dose
            )
        except Exception as e:
            logger.error("Inventory update failed: %s", e)
            return

        if new_count is None:
            return  # this slot isn't inventory-tracked

        slot = self.db.get_slot_inventory(event.compartment_index, event.slot_index)
        threshold = int(slot["low_threshold"]) if slot else 0
        if (new_count <= threshold and
                self.db.claim_low_inventory_alert(
                    event.compartment_index, event.slot_index
                )):
            msg = (f"Low inventory: {event.medication_name} "
                   f"(compartment {event.compartment_index}, slot {event.slot_index}) "
                   f"— {new_count} pill(s) left")
            logger.warning(msg)
            self._notify("LOW_INVENTORY", msg, user_id=event.user_id)
            try:
                user = self.db.get_user(event.user_id)
                if user and user.get("caregiver_phone"):
                    self.gsm.send_sms(user["caregiver_phone"], "[PillSafe] " + msg)
            except Exception as e:
                logger.error("Low-inventory SMS failed: %s", e)

    def _log_and_alert_rejected(self, event: DispenseEvent, auth_mode: str = "face") -> None:
        logger.warning("Verification REJECTED for user %d — lockout", event.user_id)
        self.db.log_event(
            user_id=event.user_id,
            schedule_id=event.schedule_id,
            scheduled_time=event.scheduled_time,
            outcome="REJECTED",
            auth_mode=auth_mode,
        )
        self.buzzer.play("failure")
        self._notify(
            "REJECTED",
            f"Verification failed for {event.full_name} ({event.medication_name})",
            user_id=event.user_id,
        )
        self.alert_service.send_immediate_alert(
            event.user_id, event.schedule_id, "REJECTED", event.scheduled_time,
        )

    def _log_and_alert_missed(self, event: DispenseEvent, auth_mode: str | None = None) -> None:
        logger.warning("Grace period expired — dose MISSED for user %d", event.user_id)
        self.db.log_event(
            user_id=event.user_id,
            schedule_id=event.schedule_id,
            scheduled_time=event.scheduled_time,
            outcome="MISSED",
            auth_mode=auth_mode,
        )
        self.buzzer.play("missed")
        self._notify(
            "MISSED",
            f"Missed dose: {event.medication_name} for {event.full_name} "
            f"at {event.scheduled_time}",
            user_id=event.user_id,
        )
        self.alert_service.send_immediate_alert(
            event.user_id, event.schedule_id, "MISSED", event.scheduled_time,
        )

    def _notify(self, type: str, message: str, user_id: int | None = None) -> None:
        """Record an app-facing notification (best-effort)."""
        try:
            self.db.add_notification(type, message, user_id=user_id)
        except Exception as e:
            logger.error("Failed to record notification (%s): %s", type, e)

    def _wait_for_grace_period(self, event: DispenseEvent) -> None:
        """
        Wait until the grace period expires, periodically retrying verification.
        If no successful verification occurs, log as MISSED (FR-16).
        """
        import time

        logger.info("Entering grace period — retrying verification until %s",
                     event.grace_deadline.strftime("%H:%M:%S"))

        while datetime.now() < event.grace_deadline:
            # Retry verification every 30 seconds during grace period
            time.sleep(30)

            if not self._running:
                break

            pending = self.app.config.get("PENDING_AUTH") or {}
            auth_mode = pending.get("mode", "face")

            if auth_mode == "face":
                frame = self.camera.capture_frame()
                if frame is None:
                    continue
                detections = self.detector.detect_and_extract(frame)
                if len(detections) == 0:
                    continue

            outcome = self.decision_engine.run_verification(
                expected_user_id=event.user_id,
                auth_mode=auth_mode,
            )

            if outcome.result == VerificationResult.ACCEPTED:
                # Late but still within grace period
                if self._perform_dispense(event, auth_mode=auth_mode):
                    logger.info("Late dose dispensed within grace period")
                    return

        # Grace period expired — mark as MISSED
        self._log_and_alert_missed(event)

    def _handle_mechanical_error(self, event: DispenseEvent, auth_mode: str = "face") -> None:
        """Handle a mechanical dispensing failure."""
        logger.error("MECHANICAL ERROR during dispensing for user %d", event.user_id)
        self.db.log_event(
            user_id=event.user_id,
            schedule_id=event.schedule_id,
            scheduled_time=event.scheduled_time,
            outcome="MECHANICAL_ERROR",
            auth_mode=auth_mode,
        )
        self.buzzer.play("failure")
        self._notify(
            "MECHANICAL_ERROR",
            f"Dispensing error for {event.full_name} ({event.medication_name})",
            user_id=event.user_id,
        )
        self.alert_service.send_immediate_alert(
            event.user_id, event.schedule_id,
            "MECHANICAL_ERROR", event.scheduled_time,
        )

    def _signal_handler(self, signum, frame) -> None:
        """Handle SIGINT/SIGTERM for graceful shutdown."""
        logger.info("Shutdown signal received (signal %d)", signum)
        self.shutdown()

    def shutdown(self) -> None:
        """Gracefully shut down all components and release hardware."""
        logger.info("Shutting down PillSafe...")
        self._running = False

        self.scheduler.stop()
        self.alert_service.stop()
        self.camera.stop()
        self.dispenser.cleanup()
        self.ir_sensors.cleanup()
        self.buzzer.cleanup()
        self.rtc.cleanup()
        self.gsm.cleanup()

        # Final GPIO cleanup (lgpio chip or RPi.GPIO)
        try:
            from hardware import gpio_compat as gpio
            gpio.close_chip()
        except Exception:
            pass

        logger.info("PillSafe shut down complete")
        logger.info("=" * 60)


def main():
    system = PillSafeSystem()
    system.start()


if __name__ == "__main__":
    main()
