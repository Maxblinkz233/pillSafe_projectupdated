"""
PillSafe — Dispensing Mechanism Controller
Each of the six compartments (one per patient) is a rotating cylinder with
nine angular slots (40° apart). Every compartment is driven by its own
MG996R servo.

Dispensing is rotation-only: the compartment's servo rotates by one or more
40° steps so the target slot aligns with that compartment's fixed drop hole.

GPIO Wiring (BCM numbering, one signal pin per compartment):
  - Compartment 0..5 servo signals → config servo.pins
  - Each servo VCC → external 5V supply (≥5–6 A recommended for 6× MG996R)
  - Each servo GND → common GND with the Pi (and the external PSU)

Modes (config servo.mode):
  - continuous (default): timed steps. Neutral duty stops the motor.
    Compartment angle (e.g. 40°/slot) is converted to motor degrees via the
    pinion:ring gear ratio (servo° = compartment° × ring_teeth / pinion_teeth).
    PWM starts at neutral — never from 0%. Tune degrees_per_second live.
  - positional: absolute/relative PWM angles. Use only with true position
    servos; set servo.travel_degrees to the real mechanical range (usually 180).
"""

from __future__ import annotations

import time

from utils.config import get_config
from utils.logger import setup_logger
from hardware import gpio_compat as gpio

logger = setup_logger("pillsafe.dispenser")


class Dispenser:
    """Controls six per-compartment rotating cylinders via servo PWM."""

    def __init__(self):
        cfg = get_config()
        servo = cfg.servo
        self.frequency = servo.frequency_hz
        self.num_compartments = servo.num_compartments
        self.num_slots = int(getattr(servo, "num_slots", 9))
        self.min_duty = float(servo.min_duty)
        self.max_duty = float(servo.max_duty)
        self.hold_time = float(servo.hold_time)
        # Compartment (ring gear) angle per dose slot — not the servo horn angle.
        self.angle_per_slot = float(getattr(servo, "angle_per_slot", 40.0))
        self.mode = str(getattr(servo, "mode", "continuous")).strip().lower()
        # Physical PWM range of a positional servo (almost always 180°).
        self.travel_degrees = float(getattr(servo, "travel_degrees", 180.0))
        # Gear train: servo pinion → compartment ring.
        # θ_servo = θ_compartment × (compartment_teeth / pinion_teeth)
        self.pinion_teeth = max(1, int(getattr(servo, "pinion_teeth", 17)))
        self.compartment_teeth = max(
            1, int(getattr(servo, "compartment_teeth", 135))
        )
        self.gear_ratio = self.compartment_teeth / float(self.pinion_teeth)
        # Continuous-rotation calibration (servo shaft speed, after gearing).
        self.neutral_duty = float(getattr(servo, "neutral_duty", 7.5))
        # Keep offset modest — large offsets slam positional MG996Rs toward 0°/180°.
        self.run_duty_offset = float(getattr(servo, "run_duty_offset", 1.5))
        self.degrees_per_second = float(
            getattr(servo, "degrees_per_second", 200.0)
        )
        # Optional override: run time for ONE compartment slot (40° on the ring).
        # When unset, duration = (compartment° × gear_ratio) / degrees_per_second.
        raw_pulse = getattr(servo, "slot_pulse_seconds", None)
        self.slot_pulse_seconds = (
            float(raw_pulse) if raw_pulse not in (None, "", 0, 0.0) else None
        )
        self.settle_time = float(getattr(servo, "settle_time", 0.15))
        # Each successful verify advances this many slots (normally 1 → 40° ring).
        self.dispense_slots = max(1, int(getattr(servo, "dispense_slots", 1)))

        pins = getattr(servo, "pins", None)
        if not pins:
            legacy = getattr(servo, "pwm_pin", 18)
            pins = [legacy]
        self.pins = list(pins)
        if len(self.pins) < self.num_compartments:
            logger.warning(
                "servo.pins has %d entries but num_compartments=%d — "
                "compartments without a pin cannot be dispensed",
                len(self.pins), self.num_compartments,
            )

        self._pwms: dict[int, gpio.PWM] = {}
        self._current_slot: dict[int, int] = {}
        self._current_angle: dict[int, float] = {}
        self._setup_gpio()
        logger.info(
            "Dispenser mode=%s, compartment %.1f deg/slot -> servo %.1f deg/slot "
            "(pinion %dT : ring %dT, ratio %.3f:1), dps=%.1f, pulse=%s",
            self.mode,
            self.angle_per_slot,
            self.compartment_to_servo_degrees(self.angle_per_slot),
            self.pinion_teeth,
            self.compartment_teeth,
            self.gear_ratio,
            self.degrees_per_second,
            f"{self.slot_pulse_seconds:.3f}s" if self.slot_pulse_seconds else "auto",
        )

    def _setup_gpio(self) -> None:
        if not gpio.AVAILABLE:
            logger.info(
                "Dispenser GPIO simulated (%s) — pins %s",
                gpio.BACKEND, self.pins,
            )
            return
        # Claim each pin once via PWM only (avoid double-claim under lgpio).
        # Start at neutral (≈1.5 ms) — NOT 0%. Duty 0 then a high run duty makes
        # a standard positional MG996R slam to ~180° instead of a 40° step.
        for compartment, pin in enumerate(self.pins):
            try:
                pwm = gpio.PWM(pin, self.frequency)
                # Arm briefly at neutral, then idle at 0% so continuous-rotation
                # MG996Rs do not creep when neutral_duty is slightly off.
                pwm.start(self.neutral_duty)
                time.sleep(self.settle_time)
                pwm.ChangeDutyCycle(0)
                self._pwms[compartment] = pwm
            except Exception as exc:
                raise RuntimeError(
                    f"Cannot claim servo GPIO {pin} (compartment {compartment}): "
                    f"{exc}"
                ) from exc
        logger.info(
            "MG996R servos on GPIO %s at %d Hz [%s] (idle PWM 0%% after neutral arm)",
            self.pins, self.frequency, gpio.BACKEND,
        )

    def compartment_to_servo_degrees(self, compartment_degrees: float) -> float:
        """
        Convert ring/compartment rotation to servo-shaft rotation.

        θ_servo = θ_compartment × (compartment_teeth / pinion_teeth)

        Example (17T pinion, 135T ring, 40° compartment slot):
            θ_servo = 40 × (135/17) ≈ 317.65°
        """
        return float(compartment_degrees) * self.gear_ratio

    def _move_duration_seconds(self, compartment_degrees: float) -> float:
        """How long to run the continuous servo for a compartment angle."""
        deg = abs(float(compartment_degrees))
        if self.slot_pulse_seconds is not None and self.angle_per_slot > 0:
            # Explicit pulse = time for one compartment slot (40° on the ring).
            return self.slot_pulse_seconds * (deg / self.angle_per_slot)
        servo_deg = self.compartment_to_servo_degrees(deg)
        return servo_deg / max(1.0, self.degrees_per_second)

    def _slot_angle(self, slot_index: int) -> float:
        return round(slot_index * self.angle_per_slot, 1)

    def _angle_to_duty(self, angle: float) -> float:
        """Map a mechanical angle onto the positional PWM span."""
        travel = max(1.0, self.travel_degrees)
        clamped = max(0.0, min(float(angle), travel))
        return round(
            self.min_duty
            + (clamped / travel) * (self.max_duty - self.min_duty),
            2,
        )

    def _shortest_slot_delta(self, current: int, target: int) -> int:
        """Signed slot steps on a circular magazine (−4 … +4 for 9 slots)."""
        raw = int(target) - int(current)
        half = self.num_slots // 2
        while raw > half:
            raw -= self.num_slots
        while raw < -half:
            raw += self.num_slots
        return raw

    def _stop_pwm(self, pwm: gpio.PWM) -> None:
        # Neutral stops continuous-rotation servos; then release to avoid buzz.
        try:
            pwm.ChangeDutyCycle(self.neutral_duty)
            time.sleep(self.settle_time)
        except Exception:
            pass
        try:
            pwm.ChangeDutyCycle(0)
        except Exception:
            pass

    def _rotate_continuous_by_degrees(
        self, compartment_index: int, degrees: float
    ) -> bool:
        """
        Timed move for continuous-rotation MG996R units.

        ``degrees`` is the **compartment / ring** angle. Motor run time uses
        the pinion:ring gear ratio so one 40° slot on the cylinder becomes
        ≈317.65° at the servo for a 17T:135T mesh.
        """
        if abs(degrees) < 0.5:
            return True
        pwm = self._pwms.get(compartment_index)
        if gpio.AVAILABLE and pwm is None:
            logger.error("No servo configured for compartment %d", compartment_index)
            return False

        direction = 1.0 if degrees > 0 else -1.0
        # Modest offset: extreme duties (≈2.5% / 12.5%) look like 0°/180° on
        # positional MG996Rs and cause a full end-to-end swing.
        run_duty = self.neutral_duty + direction * self.run_duty_offset
        run_duty = max(self.min_duty + 0.5, min(self.max_duty - 0.5, run_duty))
        servo_degrees = self.compartment_to_servo_degrees(degrees)
        duration = self._move_duration_seconds(degrees)

        logger.info(
            "Compartment %d ring %+.1f deg -> servo %+.1f deg "
            "(duty %.2f%%, %.2fs, ratio %.3f:1)",
            compartment_index,
            degrees,
            servo_degrees,
            run_duty,
            duration,
            self.gear_ratio,
        )

        if not gpio.AVAILABLE:
            time.sleep(min(duration, 5.0))
            return True

        # Always arm at neutral first so the first edge is a short speed pulse,
        # not a jump from PWM-off (0%) to a high duty (≈180° on positional units).
        pwm.ChangeDutyCycle(self.neutral_duty)
        time.sleep(self.settle_time)
        pwm.ChangeDutyCycle(run_duty)
        time.sleep(duration)
        self._stop_pwm(pwm)
        return True

    def _rotate_positional_to_angle(
        self, compartment_index: int, angle: float
    ) -> bool:
        """Absolute move for true positional servos (usually 0–180°)."""
        target_angle = max(0.0, min(float(angle), self.travel_degrees))
        duty = self._angle_to_duty(target_angle)
        logger.info(
            "Compartment %d positional → %.1f° (duty %.2f%%)",
            compartment_index, target_angle, duty,
        )

        if not gpio.AVAILABLE:
            time.sleep(self.hold_time)
            self._current_angle[compartment_index] = target_angle
            return True

        pwm = self._pwms.get(compartment_index)
        if pwm is None:
            logger.error("No servo configured for compartment %d", compartment_index)
            return False
        pwm.ChangeDutyCycle(duty)
        time.sleep(self.hold_time)
        # Hold position (do not drop to 0% — that can twitch toward an end-stop).
        self._current_angle[compartment_index] = target_angle
        return True

    def _rotate_positional_by_degrees(
        self, compartment_index: int, degrees: float
    ) -> bool:
        """Relative step for positional servos (e.g. +40° per dose)."""
        current = float(self._current_angle.get(compartment_index, 0.0))
        target = current + float(degrees)
        # Keep within mechanical travel; wrap if the mechanism allows multi-turn
        # indexing in software only (PWM still clamped to travel_degrees).
        travel = max(1.0, self.travel_degrees)
        while target > travel:
            target -= travel
        while target < 0.0:
            target += travel
        return self._rotate_positional_to_angle(compartment_index, target)

    def rotate_to_angle(self, compartment_index: int, angle: float) -> bool:
        """
        Drive toward an absolute mechanism angle.
        Continuous mode treats this as a relative move from the last known angle.
        """
        if compartment_index < 0 or compartment_index >= self.num_compartments:
            logger.error(
                "Invalid compartment: %d (range 0–%d)",
                compartment_index, self.num_compartments - 1,
            )
            return False

        if self.mode == "positional":
            return self._rotate_positional_to_angle(compartment_index, angle)

        current_slot = self._current_slot.get(compartment_index, 0)
        current_angle = self._slot_angle(current_slot)
        delta = float(angle) - current_angle
        # Normalize onto (−180, 180] for shortest spin.
        while delta > 180:
            delta -= 360
        while delta <= -180:
            delta += 360
        return self._rotate_continuous_by_degrees(compartment_index, delta)

    def rotate_to(self, compartment_index: int, slot_index: int = 0) -> bool:
        """
        Rotate so ``slot_index`` aligns with the drop hole.
        Each step is ``angle_per_slot`` degrees (default 40°).
        """
        if compartment_index < 0 or compartment_index >= self.num_compartments:
            logger.error(
                "Invalid compartment: %d (range 0–%d)",
                compartment_index, self.num_compartments - 1,
            )
            return False
        if slot_index < 0 or slot_index >= self.num_slots:
            logger.error(
                "Invalid slot: %d (range 0–%d)",
                slot_index, self.num_slots - 1,
            )
            return False

        current = self._current_slot.get(compartment_index, 0)
        if self.mode == "positional":
            delta_slots = self._shortest_slot_delta(current, slot_index)
            degrees = delta_slots * self.angle_per_slot
            # Prefer relative stepping so each dose is +40°, not a jump that
            # can look like a full 180° end-stop throw from an unknown start.
            if abs(delta_slots) <= 1:
                ok = self._rotate_positional_by_degrees(compartment_index, degrees)
            else:
                target_angle = self._slot_angle(slot_index)
                if target_angle > self.travel_degrees + 0.1:
                    logger.error(
                        "Slot %d needs %.1f° but positional travel is only %.1f°. "
                        "Use servo.mode: continuous for a 9-slot / 360° cylinder, "
                        "or dispense one 40° step at a time.",
                        slot_index, target_angle, self.travel_degrees,
                    )
                    return False
                ok = self._rotate_positional_to_angle(compartment_index, target_angle)
        else:
            delta_slots = self._shortest_slot_delta(current, slot_index)
            degrees = delta_slots * self.angle_per_slot
            logger.info(
                "Compartment %d slot %d -> %d (delta %d slot(s) = %+.1f deg)",
                compartment_index, current, slot_index, delta_slots, degrees,
            )
            ok = self._rotate_continuous_by_degrees(compartment_index, degrees)

        if ok:
            self._current_slot[compartment_index] = slot_index
            logger.info(
                "Compartment %d at slot %d (%.1f°)",
                compartment_index, slot_index, self._slot_angle(slot_index),
            )
        return ok

    def advance(self, compartment_index: int, slots: int = 1) -> bool:
        """Advance ``slots`` pockets (default 1 → one 40° step)."""
        current = self._current_slot.get(compartment_index, 0)
        target = (int(current) + int(slots)) % self.num_slots
        return self.rotate_to(compartment_index, target)

    def dispense(self, compartment_index: int, slot_index: int | None = None) -> bool:
        """
        Post-verification move.

        - If ``slot_index`` is None (preferred): advance ``dispense_slots``
          (default 1 → exactly 40°).
        - If ``slot_index`` is given: rotate to that absolute magazine slot
          (may be multiple 40° steps).
        """
        if slot_index is None:
            return self.advance(compartment_index, self.dispense_slots)
        return self.rotate_to(compartment_index, int(slot_index))

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
                self._stop_pwm(pwm)
                pwm.stop()
            except Exception:
                pass
        if self.pins:
            gpio.cleanup(self.pins)
        logger.info("Servo PWM stopped")
