"""
PillSafe — Dispensing Mechanism Controller
Each of the six compartments (one per patient) is a rotating cylinder with
nine angular slots (~40° apart). Every compartment is driven by its own
MG996R (continuous-rotation / 360° capable) servo.

Dispensing is rotation-only: the compartment's servo rotates so the target
slot aligns with that compartment's fixed drop hole, and the pill falls by
gravity to the collection base. There is no gate.

GPIO Wiring (BCM numbering, one signal pin per compartment):
  - Compartment 0..5 servo signals → config servo.pins (default 12,13,16,17,26,27)
  - Each servo VCC → external 5V supply (≥5–6 A recommended for 6× MG996R)
  - Each servo GND → common GND with the Pi (and the external PSU)

Calibrate min_duty / max_duty / hold_time in config.yaml per servo unit.
"""

import time
from utils.config import get_config
from utils.logger import setup_logger
from hardware import gpio_compat as gpio

logger = setup_logger("pillsafe.dispenser")


class Dispenser:
    """Controls six per-compartment rotating cylinders via servo PWM."""

    def __init__(self):
        cfg = get_config()
        self.frequency = cfg.servo.frequency_hz
        self.num_compartments = cfg.servo.num_compartments
        self.num_slots = getattr(cfg.servo, "num_slots", 9)
        self.min_duty = cfg.servo.min_duty
        self.max_duty = cfg.servo.max_duty
        self.hold_time = cfg.servo.hold_time
        self.max_angle = float(getattr(cfg.servo, "max_angle", 360.0))

        pins = getattr(cfg.servo, "pins", None)
        if not pins:
            legacy = getattr(cfg.servo, "pwm_pin", 18)
            pins = [legacy]
        self.pins = list(pins)
        if len(self.pins) < self.num_compartments:
            logger.warning(
                "servo.pins has %d entries but num_compartments=%d — "
                "compartments without a pin cannot be dispensed",
                len(self.pins), self.num_compartments,
            )

        self.angle_per_slot = self.max_angle / self.num_slots
        self._pwms: dict[int, gpio.PWM] = {}
        self._current_slot: dict[int, int] = {}
        self._setup_gpio()

    def _setup_gpio(self) -> None:
        if not gpio.AVAILABLE:
            logger.info(
                "Dispenser GPIO simulated (%s) — pins %s",
                gpio.BACKEND, self.pins,
            )
            return
        for compartment, pin in enumerate(self.pins):
            gpio.setup_out(pin)
            pwm = gpio.PWM(pin, self.frequency)
            pwm.start(0)
            self._pwms[compartment] = pwm
        logger.info(
            "MG996R servos on GPIO %s at %d Hz [%s]",
            self.pins, self.frequency, gpio.BACKEND,
        )

    def _slot_angle(self, slot_index: int) -> float:
        return round(slot_index * self.angle_per_slot, 1)

    def _angle_to_duty(self, angle: float) -> float:
        """Convert an angle (0–max_angle) to a PWM duty cycle."""
        return round(
            self.min_duty + (angle / self.max_angle) * (self.max_duty - self.min_duty),
            2,
        )

    def rotate_to(self, compartment_index: int, slot_index: int = 0) -> bool:
        """
        Rotate the given compartment so ``slot_index`` aligns with its drop
        hole. The pill then falls by gravity to the collection base.
        Returns True on success.
        """
        if compartment_index < 0 or compartment_index >= self.num_compartments:
            logger.error("Invalid compartment: %d (range 0–%d)",
                         compartment_index, self.num_compartments - 1)
            return False
        if slot_index < 0 or slot_index >= self.num_slots:
            logger.error("Invalid slot: %d (range 0–%d)",
                         slot_index, self.num_slots - 1)
            return False

        target_angle = self._slot_angle(slot_index)
        duty = self._angle_to_duty(target_angle)

        logger.info("Compartment %d → slot %d (%.1f°, duty %.2f%%)",
                    compartment_index, slot_index, target_angle, duty)

        if gpio.AVAILABLE:
            pwm = self._pwms.get(compartment_index)
            if pwm is None:
                logger.error("No servo configured for compartment %d", compartment_index)
                return False
            pwm.ChangeDutyCycle(duty)
            time.sleep(self.hold_time)
            pwm.ChangeDutyCycle(0)  # release to prevent jitter/buzz
        else:
            logger.debug("[SIM] Compartment %d servo → slot %d at %.1f°",
                         compartment_index, slot_index, target_angle)
            time.sleep(self.hold_time)

        self._current_slot[compartment_index] = slot_index
        return True

    def home(self, compartment_index: int | None = None) -> None:
        """Return one compartment (or all) to slot 0."""
        if compartment_index is None:
            for c in range(min(self.num_compartments, len(self.pins))):
                self.rotate_to(c, 0)
        else:
            self.rotate_to(compartment_index, 0)

    def current_slot(self, compartment_index: int) -> int | None:
        return self._current_slot.get(compartment_index)

    def cleanup(self) -> None:
        for pwm in self._pwms.values():
            try:
                pwm.stop()
            except Exception:
                pass
        if self.pins:
            gpio.cleanup(self.pins)
        logger.info("Servo PWM stopped")
