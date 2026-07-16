"""
PillSafe — Buzzer Controller
Active buzzer for audio alerts (NFR-18).

GPIO Wiring (5V active buzzer module):
  - Signal → GPIO 25 (BCM) / Pin 22
  - VCC    → 5V (Pin 2 or 4)  | GND → GND (Pin 20)
  Do NOT power a 5V buzzer from the Pi's 3.3V rail.
"""

import time
import threading
from utils.config import get_config
from utils.logger import setup_logger
from hardware import gpio_compat as gpio

logger = setup_logger("pillsafe.buzzer")


class Buzzer:
    def __init__(self):
        cfg = get_config()
        self.pin = cfg.buzzer.pin
        self.patterns = {
            "dose_ready": cfg.buzzer.dose_ready_pattern,
            "success": cfg.buzzer.success_pattern,
            "failure": cfg.buzzer.failure_pattern,
            "missed": cfg.buzzer.missed_pattern,
        }
        self._setup_gpio()

    def _setup_gpio(self):
        if not gpio.AVAILABLE:
            logger.info("Buzzer simulated on GPIO %d (%s)", self.pin, gpio.BACKEND)
            return
        gpio.setup_out(self.pin)
        gpio.output(self.pin, False)
        logger.info("Buzzer on GPIO %d [%s]", self.pin, gpio.BACKEND)

    def _play_pattern(self, pattern: list[float]):
        for i, duration in enumerate(pattern):
            state = (i % 2 == 0)
            if gpio.AVAILABLE:
                gpio.output(self.pin, state)
            time.sleep(duration)
        if gpio.AVAILABLE:
            gpio.output(self.pin, False)

    def play(self, pattern_name: str, blocking: bool = False):
        pattern = self.patterns.get(pattern_name)
        if not pattern:
            return
        if blocking:
            self._play_pattern(pattern)
        else:
            threading.Thread(
                target=self._play_pattern, args=(pattern,), daemon=True
            ).start()

    def cleanup(self):
        if gpio.AVAILABLE:
            gpio.output(self.pin, False)
            gpio.cleanup([self.pin])
