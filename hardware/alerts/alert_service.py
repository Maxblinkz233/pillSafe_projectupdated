"""
PillSafe — SMS Alert Service
Monitors the database for missed/rejected events and dispatches
SMS alerts via the GSM module (FR-38 to FR-43).

Primary path: hub SIM800L/C (GSM).
Fallback: if GSM fails, queue PENDING_PHONE_SMS so the React Native app
can send the same text via Africa's Talking from the user's phone.
"""

from __future__ import annotations

import json
import time
import threading
from datetime import datetime, timedelta

from database.db_manager import DatabaseManager
from hardware.gsm import GSMModule
from utils.config import get_config
from utils.logger import setup_logger

logger = setup_logger("pillsafe.alerts")

PENDING_PHONE_SMS = "PENDING_PHONE_SMS"


class AlertService:
    """Background service + single gateway for caregiver SMS."""

    def __init__(self, db: DatabaseManager, gsm: GSMModule):
        self.db = db
        self.gsm = gsm
        cfg = get_config()
        self.max_sms = int(getattr(cfg.alerts, "max_sms_per_event", 2) or 2)
        self.retry_interval = int(
            getattr(cfg.alerts, "retry_interval_minutes", 60) or 60
        )
        self._running = False
        self._thread = None
        # Per-event SMS accounting (FR-40 / FR-41). Keys are stable strings.
        self._sms_counts: dict[str, int] = {}
        self._first_sms_times: dict[str, datetime] = {}
        self._lock = threading.Lock()

    def start(self) -> None:
        """Start the alert monitoring loop in a background thread."""
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._thread.start()
        logger.info(
            "Alert service started (max_sms=%d, retry=%d min)",
            self.max_sms, self.retry_interval,
        )

    def stop(self) -> None:
        """Stop the alert monitoring loop."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)
        logger.info("Alert service stopped")

    # ── Rate-limit helpers ───────────────────────────────────

    def _event_key(self, kind: str, log_id: int | None = None,
                   schedule_id: int | None = None,
                   extra: str | None = None) -> str:
        if log_id is not None:
            return f"{kind}:log:{log_id}"
        parts = [kind, f"sched:{schedule_id}" if schedule_id is not None else "sched:?"]
        if extra:
            parts.append(extra)
        return ":".join(parts)

    def _allow_send(self, key: str, *, allow_retry: bool) -> bool:
        """
        Return True if another SMS may be sent for this key.
        First send always allowed (until max). Second+ only after retry_interval
        when allow_retry is True.
        """
        with self._lock:
            count = self._sms_counts.get(key, 0)
            if count >= self.max_sms:
                logger.info(
                    "SMS suppressed for %s — already sent %d/%d",
                    key, count, self.max_sms,
                )
                return False
            if count == 0:
                return True
            if not allow_retry:
                logger.info(
                    "SMS suppressed for %s — one-shot alert already sent",
                    key,
                )
                return False
            first_sent = self._first_sms_times.get(key)
            if not first_sent:
                return True
            elapsed = datetime.now() - first_sent
            if elapsed < timedelta(minutes=self.retry_interval):
                logger.info(
                    "SMS suppressed for %s — retry in %s",
                    key,
                    timedelta(minutes=self.retry_interval) - elapsed,
                )
                return False
            return True

    def _record_send(self, key: str) -> None:
        with self._lock:
            count = self._sms_counts.get(key, 0)
            self._sms_counts[key] = count + 1
            if count == 0:
                self._first_sms_times[key] = datetime.now()

    def _queue_phone_sms(
        self, user_id: int | None, phone: str, body: str, reason: str = "gsm_failed",
    ) -> int | None:
        """Ask the mobile app to send this SMS via Africa's Talking."""
        payload = json.dumps({
            "to": phone,
            "body": body,
            "reason": reason,
        }, ensure_ascii=False)
        try:
            nid = self.db.add_notification(PENDING_PHONE_SMS, payload, user_id=user_id)
            logger.warning(
                "GSM failed — queued %s id=%s for phone Africa's Talking fallback",
                PENDING_PHONE_SMS, nid,
            )
            return nid
        except Exception as e:
            logger.error("Failed to queue %s: %s", PENDING_PHONE_SMS, e)
            return None

    def _deliver_sms(
        self,
        phone: str,
        body: str,
        *,
        user_id: int | None = None,
    ) -> bool:
        """
        Try hub GSM first. On failure, queue PENDING_PHONE_SMS for the app.
        Returns True if GSM succeeded OR the phone-fallback was queued.
        """
        ok = False
        try:
            ok = bool(self.gsm.send_sms(phone, body))
        except Exception as e:
            logger.error("GSM send_sms raised: %s", e)
            ok = False
        if ok:
            return True
        queued = self._queue_phone_sms(user_id, phone, body)
        return queued is not None

    # ── Background monitor (MISSED / REJECTED retries) ───────

    def _monitor_loop(self) -> None:
        while self._running:
            try:
                self._check_and_alert()
            except Exception as e:
                logger.error("Alert service error: %s", e)
            time.sleep(30)

    def _check_and_alert(self) -> None:
        """Retry SMS for unacknowledged MISSED / REJECTED / MECHANICAL_ERROR."""
        events = self.db.get_unacknowledged_missed()
        for event in events:
            log_id = event["log_id"]
            key = self._event_key(event["outcome"], log_id=log_id)
            if not self._allow_send(key, allow_retry=True):
                continue
            if self._dispatch_db_event(event):
                self._record_send(key)
                self.db.mark_sms_sent(log_id)
                logger.info(
                    "SMS alert dispatched for log_id=%d (outcome=%s, count=%d)",
                    log_id, event["outcome"], self._sms_counts.get(key, 0),
                )

    def _message_for_db_event(self, event: dict) -> str | None:
        outcome = event["outcome"]
        if outcome in ("MISSED", "MECHANICAL_ERROR"):
            return (
                f"[PillSafe ALERT] Missed Dose\n"
                f"Patient: {event['full_name']}\n"
                f"Medication: {event['medication_name']}\n"
                f"Scheduled: {event['scheduled_time']}\n"
                f"Reply '1' or 'ACK' to acknowledge."
            )
        if outcome == "REJECTED":
            return (
                f"[PillSafe ALERT] Unauthorized Access at {event['scheduled_time']}.\n"
                f"Face verification failed after repeated attempts.\n"
                f"Dispensing sequence locked."
            )
        return None

    def _dispatch_db_event(self, event: dict) -> bool:
        body = self._message_for_db_event(event)
        phone = (event.get("caregiver_phone") or "").strip()
        if not body or not phone:
            return False
        return self._deliver_sms(
            phone, body, user_id=event.get("user_id"),
        )

    # ── Public API used by main.py ───────────────────────────

    def send_immediate_alert(
        self,
        user_id: int,
        schedule_id: int,
        outcome: str,
        scheduled_time: str,
        *,
        actual_time: str | None = None,
        log_id: int | None = None,
    ) -> bool:
        """
        Send (or retry-gate) an SMS for a logged outcome.

        MISSED / REJECTED / MECHANICAL_ERROR: counted under log_id (or
        schedule fallback) and eligible for retry until max_sms_per_event.
        TAKEN: one-shot under the same max (no timed retry).
        """
        user = self.db.get_user(user_id)
        schedule = self.db.get_schedule(schedule_id)
        if not user or not schedule:
            logger.error("Cannot send alert — user or schedule not found")
            return False
        phone = (user.get("caregiver_phone") or "").strip()
        if not phone:
            logger.warning("No caregiver_phone for user %d — SMS skipped", user_id)
            return False

        outcome = outcome.upper()
        allow_retry = outcome in ("MISSED", "REJECTED", "MECHANICAL_ERROR")
        key = self._event_key(
            outcome,
            log_id=log_id,
            schedule_id=schedule_id,
            extra=scheduled_time if log_id is None else None,
        )
        if not self._allow_send(key, allow_retry=allow_retry):
            return False

        if outcome == "REJECTED":
            body = (
                f"[PillSafe ALERT] Unauthorized Access at {scheduled_time}.\n"
                f"Face verification failed after repeated attempts.\n"
                f"Dispensing sequence locked."
            )
        elif outcome == "TAKEN":
            body = (
                f"[PillSafe] Dose Taken\n"
                f"Patient: {user['full_name']}\n"
                f"Medication: {schedule['medication_name']}\n"
                f"Scheduled: {scheduled_time}\n"
                f"Taken at: {actual_time or scheduled_time}"
            )
        else:
            body = (
                f"[PillSafe ALERT] Missed Dose\n"
                f"Patient: {user['full_name']}\n"
                f"Medication: {schedule['medication_name']}\n"
                f"Scheduled: {scheduled_time}\n"
                f"Reply '1' or 'ACK' to acknowledge."
            )

        ok = self._deliver_sms(phone, body, user_id=user_id)
        if ok:
            self._record_send(key)
            if log_id is not None:
                try:
                    self.db.mark_sms_sent(log_id)
                except Exception as e:
                    logger.debug("mark_sms_sent failed: %s", e)
            logger.info(
                "Immediate SMS dispatched outcome=%s key=%s count=%d",
                outcome, key, self._sms_counts.get(key, 0),
            )
        return ok

    def send_reject_warning(
        self,
        user_id: int,
        schedule_id: int,
        patient_name: str,
        medication_name: str,
        scheduled_time: str,
        sets: int,
    ) -> bool:
        """Face failed N times — one SMS, still under max_sms_per_event."""
        user = self.db.get_user(user_id)
        if not user:
            return False
        phone = (user.get("caregiver_phone") or "").strip()
        if not phone:
            logger.warning("No caregiver_phone for user %d — reject SMS skipped", user_id)
            return False

        key = self._event_key(
            "REJECT_WARNING",
            schedule_id=schedule_id,
            extra=scheduled_time,
        )
        if not self._allow_send(key, allow_retry=self.max_sms > 1):
            return False

        message = (
            f"[PillSafe ALERT] Face verification failed {sets} times\n"
            f"Patient: {patient_name}\n"
            f"Medication: {medication_name}\n"
            f"Scheduled: {scheduled_time}\n"
            f"Dispensing not locked yet — further attempts allowed."
        )
        ok = self._deliver_sms(phone, message, user_id=user_id)
        if ok:
            self._record_send(key)
            logger.info(
                "Reject-warning SMS dispatched (set %d, schedule %d, count=%d)",
                sets, schedule_id, self._sms_counts.get(key, 0),
            )
        return ok

    def send_low_inventory(
        self,
        user_id: int,
        compartment_index: int,
        slot_index: int,
        message: str,
    ) -> bool:
        """Low-stock SMS — gated by max_sms_per_event per compartment/slot."""
        user = self.db.get_user(user_id)
        if not user:
            return False
        phone = (user.get("caregiver_phone") or "").strip()
        if not phone:
            return False
        key = self._event_key(
            "LOW_INVENTORY",
            extra=f"c{compartment_index}-s{slot_index}",
        )
        if not self._allow_send(key, allow_retry=self.max_sms > 1):
            return False
        ok = self._deliver_sms(phone, "[PillSafe] " + message, user_id=user_id)
        if ok:
            self._record_send(key)
        return ok
