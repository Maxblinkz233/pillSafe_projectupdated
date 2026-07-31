"""
PillSafe — Buzzer Controller
Active buzzer for audio alerts (NFR-18).

GPIO Wiring (5V active buzzer module):
  - Signal → GPIO 25 (BCM) / Pin 22
  - VCC    → 5V (Pin 2 or 4)  | GND → GND (Pin 20)
  Do NOT power a 5V buzzer from the Pi's 3.3V rail.

The buzzer is used only for dose-due alerts (45–60 s), never during
dispensing. Call stop() before any servo move.
"""

from __future__ import annotations

import threading
import time

from utils.config import get_config
from utils.logger import setup_logger
from hardware import gpio_compat as gpio

logger = setup_logger("pillsafe.buzzer")


class Buzzer:
    def __init__(self):
        cfg = get_config()
        buzzer_cfg = getattr(cfg, "buzzer", None)
        self.pin = getattr(buzzer_cfg, "pin", 25) if buzzer_cfg else 25
        self.active_low = bool(
            getattr(buzzer_cfg, "active_low", False) if buzzer_cfg else False
        )
        self.dose_ready_duration = float(
            getattr(buzzer_cfg, "dose_ready_duration_seconds", 50)
            if buzzer_cfg
            else 50
        )
        self.beep_on = float(
            getattr(buzzer_cfg, "dose_ready_beep_seconds", 0.4)
            if buzzer_cfg
            else 0.4
        )
        self.beep_off = float(
            getattr(buzzer_cfg, "dose_ready_gap_seconds", 0.6)
            if buzzer_cfg
            else 0.6
        )
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._lock = threading.Lock()
        self._setup_gpio()

    def _setup_gpio(self):
        if not gpio.AVAILABLE:
            logger.warning(
                "Buzzer GPIO unavailable (%s) — alerts will be silent",
                gpio.BACKEND,
            )
            return
        gpio.setup_out(self.pin)
        self._set(False)
        logger.info(
            "Buzzer on GPIO %d [%s] active_low=%s",
            self.pin,
            gpio.BACKEND,
            self.active_low,
        )

    def _set(self, on: bool) -> None:
        if not gpio.AVAILABLE:
            return
        level = (not on) if self.active_low else bool(on)
        gpio.output(self.pin, level)

    def stop(self) -> None:
        """Silence the buzzer immediately (must be called before dispensing)."""
        self._stop.set()
        thread = self._thread
        if (
            thread is not None
            and thread.is_alive()
            and thread is not threading.current_thread()
        ):
            thread.join(timeout=1.5)
        with self._lock:
            self._thread = None
            self._set(False)

    def _alert_loop(self, duration_sec: float) -> None:
        logger.info(
            "Dose-due buzzer started for %.0f seconds (GPIO %d, available=%s)",
            duration_sec,
            self.pin,
            gpio.AVAILABLE,
        )
        deadline = time.monotonic() + max(1.0, duration_sec)
        beeps = 0
        try:
            while not self._stop.is_set() and time.monotonic() < deadline:
                self._set(True)
                beeps += 1
                if self._stop.wait(self.beep_on):
                    break
                self._set(False)
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    break
                if self._stop.wait(min(self.beep_off, max(0.05, remaining))):
                    break
        finally:
            self._set(False)
            logger.info("Dose-due buzzer stopped after %d beeps", beeps)

    def alert_dose_due(self, duration_sec: float | None = None) -> None:
        """
        Sound an intermittent dose-due alert for ~45–60 seconds in the
        background so the hub can still accept Verify Now / notifications.
        """
        self.stop()
        self._stop.clear()
        seconds = float(
            self.dose_ready_duration if duration_sec is None else duration_sec
        )
        seconds = max(45.0, min(60.0, seconds))
        if not gpio.AVAILABLE:
            logger.error(
                "Cannot sound buzzer — GPIO backend is '%s'. "
                "Check wiring on GPIO %d and that lgpio is installed.",
                gpio.BACKEND,
                self.pin,
            )
        with self._lock:
            self._thread = threading.Thread(
                target=self._alert_loop,
                args=(seconds,),
                daemon=True,
                name="pillsafe-buzzer",
            )
            self._thread.start()

    def play(self, pattern_name: str, blocking: bool = False):
        """Legacy API — only dose_ready is supported (maps to long alert)."""
        if pattern_name != "dose_ready":
            logger.debug("Ignoring non dose-due buzzer pattern: %s", pattern_name)
            return
        self.alert_dose_due()

    def cleanup(self):
        self.stop()
        if gpio.AVAILABLE:
            gpio.cleanup([self.pin])
