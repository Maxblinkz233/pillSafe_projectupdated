"""
PillSafe — GPIO compatibility layer
===================================
Prefers lgpio (Raspberry Pi 5 / Bookworm), falls back to RPi.GPIO
(Pi 4 / older images), then a no-op simulation for desktop tests.

Public API (BCM numbering throughout):
  BACKEND, AVAILABLE
  setup_out(pin), setup_in(pin, pull_up=True)
  output(pin, high: bool), input(pin) -> int  (1=HIGH, 0=LOW)
  PWM(pin, frequency_hz) with start / ChangeDutyCycle / stop
  cleanup(pins=None), close_chip()
  HIGH, LOW
"""

from __future__ import annotations

import logging
from typing import Iterable

logger = logging.getLogger("pillsafe.gpio")

HIGH = 1
LOW = 0

BACKEND = "sim"
AVAILABLE = False

_chip = None
_lgpio = None
_RPi_GPIO = None
_owned_pins: set[int] = set()
_pwm_handles: dict[int, object] = {}


def _init_backend() -> None:
    global BACKEND, AVAILABLE, _chip, _lgpio, _RPi_GPIO

    try:
        import lgpio as _lg  # type: ignore

        chip = None
        # Pi 5 Bookworm typically exposes gpiochip4; older kernels use 0.
        for chip_id in (4, 0, 1):
            try:
                chip = _lg.gpiochip_open(chip_id)
                break
            except Exception:
                continue
        if chip is not None:
            _lgpio = _lg
            _chip = chip
            BACKEND = "lgpio"
            AVAILABLE = True
            logger.info("GPIO backend: lgpio (chip handle ready)")
            return
    except Exception as exc:
        logger.debug("lgpio unavailable: %s", exc)

    try:
        import RPi.GPIO as GPIO  # type: ignore

        GPIO.setwarnings(False)
        GPIO.setmode(GPIO.BCM)
        _RPi_GPIO = GPIO
        BACKEND = "RPi.GPIO"
        AVAILABLE = True
        logger.info("GPIO backend: RPi.GPIO")
        return
    except Exception as exc:
        logger.warning("No GPIO library available — simulation mode (%s)", exc)
        BACKEND = "sim"
        AVAILABLE = False


_init_backend()


def setup_out(pin: int) -> None:
    """Configure a BCM pin as digital output (idle LOW)."""
    _owned_pins.add(pin)
    if BACKEND == "lgpio":
        _lgpio.gpio_claim_output(_chip, pin, LOW)
    elif BACKEND == "RPi.GPIO":
        _RPi_GPIO.setup(pin, _RPi_GPIO.OUT, initial=_RPi_GPIO.LOW)


def setup_in(pin: int, pull_up: bool = True) -> None:
    """Configure a BCM pin as digital input."""
    _owned_pins.add(pin)
    if BACKEND == "lgpio":
        flags = _lgpio.SET_PULL_UP if pull_up else _lgpio.SET_PULL_DOWN
        _lgpio.gpio_claim_input(_chip, pin, flags)
    elif BACKEND == "RPi.GPIO":
        pud = _RPi_GPIO.PUD_UP if pull_up else _RPi_GPIO.PUD_DOWN
        _RPi_GPIO.setup(pin, _RPi_GPIO.IN, pull_up_down=pud)


def output(pin: int, high: bool) -> None:
    level = HIGH if high else LOW
    if BACKEND == "lgpio":
        _lgpio.gpio_write(_chip, pin, level)
    elif BACKEND == "RPi.GPIO":
        _RPi_GPIO.output(pin, _RPi_GPIO.HIGH if high else _RPi_GPIO.LOW)


def input(pin: int) -> int:  # noqa: A001 — mirrors RPi.GPIO.input
    if BACKEND == "lgpio":
        return int(_lgpio.gpio_read(_chip, pin))
    if BACKEND == "RPi.GPIO":
        return int(_RPi_GPIO.input(pin))
    return LOW


class PWM:
    """Software / hardware PWM wrapper with an RPi.GPIO-like surface."""

    def __init__(self, pin: int, frequency_hz: float):
        self.pin = pin
        self.frequency = float(frequency_hz)
        self._duty = 0.0
        self._running = False
        _owned_pins.add(pin)
        _pwm_handles[pin] = self
        if BACKEND == "RPi.GPIO":
            self._pwm = _RPi_GPIO.PWM(pin, self.frequency)
        else:
            self._pwm = None
            if BACKEND == "lgpio":
                # Claim as output before tx_pwm
                try:
                    _lgpio.gpio_claim_output(_chip, pin, LOW)
                except Exception:
                    pass

    def start(self, duty: float = 0.0) -> None:
        self._duty = float(duty)
        self._running = True
        if BACKEND == "lgpio":
            _lgpio.tx_pwm(_chip, self.pin, self.frequency, self._duty)
        elif BACKEND == "RPi.GPIO" and self._pwm is not None:
            self._pwm.start(self._duty)

    def ChangeDutyCycle(self, duty: float) -> None:
        self._duty = float(duty)
        if not self._running:
            return
        if BACKEND == "lgpio":
            if self._duty <= 0.0:
                _lgpio.tx_pwm(_chip, self.pin, self.frequency, 0.0)
            else:
                _lgpio.tx_pwm(_chip, self.pin, self.frequency, self._duty)
        elif BACKEND == "RPi.GPIO" and self._pwm is not None:
            self._pwm.ChangeDutyCycle(self._duty)

    def stop(self) -> None:
        self._running = False
        if BACKEND == "lgpio":
            try:
                _lgpio.tx_pwm(_chip, self.pin, self.frequency, 0.0)
            except Exception:
                pass
        elif BACKEND == "RPi.GPIO" and self._pwm is not None:
            try:
                self._pwm.stop()
            except Exception:
                pass


def cleanup(pins: Iterable[int] | None = None) -> None:
    """Release claimed pins (or all owned pins)."""
    targets = set(pins) if pins is not None else set(_owned_pins)
    for pin in list(targets):
        pwm = _pwm_handles.pop(pin, None)
        if pwm is not None:
            try:
                pwm.stop()
            except Exception:
                pass
        if BACKEND == "lgpio":
            try:
                _lgpio.gpio_free(_chip, pin)
            except Exception:
                pass
        _owned_pins.discard(pin)
    if BACKEND == "RPi.GPIO" and pins is None:
        try:
            _RPi_GPIO.cleanup()
        except Exception:
            pass
    elif BACKEND == "RPi.GPIO" and pins is not None:
        try:
            _RPi_GPIO.cleanup(list(targets))
        except Exception:
            pass


def close_chip() -> None:
    """Close the lgpio chip handle (no-op for other backends)."""
    global _chip
    cleanup()
    if BACKEND == "lgpio" and _chip is not None:
        try:
            _lgpio.gpiochip_close(_chip)
        except Exception:
            pass
        _chip = None
