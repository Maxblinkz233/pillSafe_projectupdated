"""
PillSafe — IR Sensor Module
FC-51 infrared sensors for pill detection and pickup confirmation.

GPIO Wiring:
  - IR Sensor 1 (pill detect)  → GPIO 23 (BCM) / Pin 16
  - IR Sensor 2 (pill pickup)  → GPIO 24 (BCM) / Pin 18
  - Both VCC → 3.3V (Pin 1)   | Both GND → GND (Pin 9)

FC-51 behaviour: LOW = obstacle detected, HIGH = clear.
"""

import time
from utils.config import get_config
from utils.logger import setup_logger
from hardware import gpio_compat as gpio

logger = setup_logger("pillsafe.ir_sensor")


class IRSensorManager:
    def __init__(self):
        cfg = get_config()
        self.pill_detect_pin = cfg.ir_sensors.pill_detect_pin
        self.pill_pickup_pin = cfg.ir_sensors.pill_pickup_pin
        self._setup_gpio()

    def _setup_gpio(self):
        if not gpio.AVAILABLE:
            logger.info(
                "IR sensors simulated on GPIO %d, %d (%s)",
                self.pill_detect_pin, self.pill_pickup_pin, gpio.BACKEND,
            )
            return
        gpio.setup_in(self.pill_detect_pin, pull_up=True)
        gpio.setup_in(self.pill_pickup_pin, pull_up=True)
        logger.info(
            "IR sensors on GPIO %d (detect), %d (pickup) [%s]",
            self.pill_detect_pin, self.pill_pickup_pin, gpio.BACKEND,
        )

    def pill_detected(self) -> bool:
        if not gpio.AVAILABLE:
            return True
        return gpio.input(self.pill_detect_pin) == gpio.LOW

    def pill_picked_up(self) -> bool:
        if not gpio.AVAILABLE:
            return True
        return gpio.input(self.pill_pickup_pin) == gpio.HIGH

    def wait_for_pill_drop(self, timeout: float = 5.0) -> bool:
        start = time.time()
        while time.time() - start < timeout:
            if self.pill_detected():
                logger.info("Pill detected at discharge chute")
                return True
            time.sleep(0.05)
        logger.warning("Pill NOT detected — possible mechanical error")
        return False

    def wait_for_pickup(self, timeout: float = 120.0) -> bool:
        start = time.time()
        if not self.pill_detected():
            logger.warning("No pill in tray — cannot wait for pickup")
            return False
        while time.time() - start < timeout:
            if self.pill_picked_up():
                logger.info("Pill picked up by user")
                return True
            time.sleep(0.1)
        logger.warning("Pill pickup timeout")
        return False

    def cleanup(self):
        gpio.cleanup([self.pill_detect_pin, self.pill_pickup_pin])
