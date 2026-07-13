# PillSafe — Fritzing Circuit Guide

This document explains how to build the PillSafe hardware circuit in
**[Fritzing](https://fritzing.org/)** for your report, simulation planning, and
wiring verification. It matches `config.yaml` and the `hardware/` modules in
this repository.

**Companion files**

| File | Purpose |
|------|---------|
| [`bom.csv`](bom.csv) | Bill of materials with quantities |
| [`fritzing_connections.csv`](fritzing_connections.csv) | Every net — import as a wiring checklist |

> Fritzing cannot run the full PillSafe Python stack (Picamera2, FaceNet, Flask).
> Use Fritzing for **schematic + breadboard documentation**; use `python main.py`
> on a PC for **software simulation** (GPIO modules auto-fallback when off-Pi).

---

## 1. Install Fritzing

1. Download from [https://fritzing.org/download/](https://fritzing.org/download/)
2. Open a new sketch: **File → New**
3. You will work in three views (tabs at the bottom):
   - **Breadboard** — physical layout
   - **Schematic** — logical wiring (best for thesis figures)
   - **PCB** — optional; only if you design a custom HAT/board

Save the sketch as `pillsafe_hardware.fzz` inside this `docs/` folder when done.

---

## 2. Parts to add from the Fritzing library

Search the **Parts** panel (right side) and drag each item onto the breadboard.

### Core (always add)

| Search in Fritzing | Qty | PillSafe role |
|--------------------|-----|---------------|
| `Raspberry Pi 4` | 1 | Main controller |
| `Raspberry Pi Camera` | 1 | Face recognition (annotate “v2 / CSI”) |
| `servo` (generic hobby servo) | 6 | One per medication compartment |
| `Piezo Buzzer` or `Buzzer` | 1 | Active buzzer module (3.3 V) |
| `Power plug` or `Battery block` | 2 | Pi USB-C supply + external 5 V servo rail |
| `Ground` / `VCC` labels | several | Power annotation on schematic |

### Sensors & RTC

| Search in Fritzing | Qty | If not found |
|--------------------|-----|--------------|
| `DS3231` or `RTC` | 1 | Use generic **I2C EEPROM** block and label pins SDA/SCL/VCC/GND |
| `IR` or `phototransistor` | 2 | Use **generic 3-pin breakout**; label “FC-51 drop” and “FC-51 pickup” |

### GSM & voice (annotate as external)

Fritzing often lacks SIM800L and INMP441. Use one of:

- **Generic breakout board** (4–6 pins) + text labels, or
- **Import custom part** from [Fritzing Fab library](https://fab.fritzing.org/) / SnapEDA

| Real part | Fritzing placeholder | Connection |
|-----------|-------------------|------------|
| SIM800L + USB-TTL | `USB connector` + labeled box “SIM800L” | USB to Pi; 3.7 V LiPo separate |
| INMP441 I2S mic | 5-pin breakout labeled “INMP441” | GPIO 18/19/20 + 3.3 V |

---

## 3. Recommended breadboard layout (zones)

Split the breadboard into zones so the diagram stays readable:

```
┌─────────────────────────────────────────────────────────────────┐
│  [A] Raspberry Pi 4B  +  CSI Camera (ribbon, off-board note)   │
├─────────────────────────────────────────────────────────────────┤
│  [B] DS3231 RTC (I2C)     [C] Buzzer        [D] INMP441 (opt.)  │
├─────────────────────────────────────────────────────────────────┤
│  [E] FC-51 IR #1 (drop)   [F] FC-51 IR #2 (pickup)              │
├─────────────────────────────────────────────────────────────────┤
│  [G] Servo 0 … Servo 5  (six servos in a row)                   │
├─────────────────────────────────────────────────────────────────┤
│  [H] External 5 V supply → servo VCC rail                       │
│  [I] GND bus (Pi GND + servo PSU GND + LiPo GND)                │
├─────────────────────────────────────────────────────────────────┤
│  [J] Off-board: SIM800L + LiPo + USB-TTL (dashed box + note)    │
└─────────────────────────────────────────────────────────────────┘
```

**Tip:** For a thesis diagram, draw **one servo** on the breadboard and add a note
“×6 compartments — GPIO 12, 13, 16, 17, 26, 27” to avoid clutter. Keep all six
on the schematic view using a duplicate-servo pattern.

---

## 4. Wire every connection (BCM = what the code uses)

All GPIO numbers below are **BCM**, not physical pin numbers.

### Power rails (draw first)

```
Pi 3.3V  ──► DS3231 VCC, both FC-51 VCC, Buzzer VCC, INMP441 VDD
External 5V ──► all 6× servo VCC (red)
Common GND ──► Pi GND, all servo GND, DS3231 GND, IR GND×2, Buzzer GND,
               INMP441 GND, external 5V GND, SIM800L GND, LiPo GND
LiPo 3.7V+ ──► SIM800L VCC only
```

### GPIO signals

| Signal | BCM GPIO | Physical pin | Device |
|--------|----------|--------------|--------|
| Servo 0 PWM | 12 | 32 | Compartment 0 |
| Servo 1 PWM | 13 | 33 | Compartment 1 |
| Servo 2 PWM | 16 | 36 | Compartment 2 |
| Servo 3 PWM | 17 | 11 | Compartment 3 |
| Servo 4 PWM | 26 | 37 | Compartment 4 |
| Servo 5 PWM | 27 | 13 | Compartment 5 |
| IR drop OUT | 23 | 16 | FC-51 at chute |
| IR pickup OUT | 24 | 18 | FC-51 at base |
| Buzzer IN | 25 | 22 | Active buzzer |
| I2C SDA | 2 | 3 | DS3231 |
| I2C SCL | 3 | 5 | DS3231 |
| I2S BCLK | 18 | 12 | INMP441 SCK (optional) |
| I2S LRCLK | 19 | 35 | INMP441 WS (optional) |
| I2S DATA | 20 | 38 | INMP441 SD (optional) |

Full netlist: [`fritzing_connections.csv`](fritzing_connections.csv)

### Off-board connections (use dashed wires + notes in Fritzing)

| Link | Notes |
|------|-------|
| Pi CSI ↔ Camera v2 | 15-pin ribbon — not on breadboard |
| Pi USB ↔ USB-TTL ↔ SIM800L | Serial at 9600 baud (`/dev/ttyUSB0`) |
| LiPo ↔ SIM800L | Separate power; **never** from Pi 3.3 V/5 V |

---

## 5. Schematic view — build order

1. Place **Raspberry Pi 4** symbol (or GPIO header symbol if Pi part is too large).
2. Add **DS3231** on I2C: SDA→GPIO2, SCL→GPIO3, 3.3 V, GND.
3. Add **two IR sensors** as digital inputs to GPIO 23 and 24; annotate:
   - GPIO 23: LOW = pill in chute
   - GPIO 24: HIGH = pill removed from base
4. Add **buzzer** on GPIO 25.
5. Add **six servos** with PWM inputs on GPIO 12, 13, 16, 17, 26, 27; VCC to
   external 5 V rail; GND to common GND.
6. Add **power symbols**: +3.3 V, +5 V (servo), +3.7 V (GSM), GND.
7. Optional: **INMP441** on GPIO 18/19/20.
8. Add **note boxes** for Camera (CSI) and SIM800L (USB + LiPo).

Use **schematic → Export → PDF/PNG** for your final-year report.

---

## 6. Colour convention (breadboard wires in Fritzing)

| Colour | Use |
|--------|-----|
| Red | +3.3 V, +5 V servo, +3.7 V GSM |
| Black / brown | GND |
| Orange | Servo PWM signal |
| Yellow | IR sensor OUT |
| Green | Buzzer signal |
| Blue / purple | I2C SDA / SCL |

---

## 7. System block diagram (for Fritzing notes / report)

Paste this as a **Note** in Fritzing or into your report:

```
                    ┌──────────────────┐
   Pi Camera (CSI)──│  Raspberry Pi 4B │
   USB (GSM TTL)────│  Flask API       │
                    │  FaceNet + Voice │
                    └───┬──────────────┘
        GPIO          │ I2C      │ (optional I2S)
         │            │          │
    6× Servo      DS3231 RTC   INMP441
    2× FC-51 IR
    1× Buzzer

Mechanical (not electrical):
  6 cylinders (9 slots) → drop hole → tube → IR#1 → base → IR#2
  No gate servo — gravity dispense only
```

---

## 8. Two Fritzing sketches (recommended for clarity)

| Sketch | Contents | Use in report |
|--------|----------|---------------|
| **pillsafe_core.fzz** | Pi + RTC + 2× IR + buzzer + 1× servo example | “Control & sensing” figure |
| **pillsafe_power.fzz** | External 5 V rail, 6 servos, GND bus, LiPo + SIM800L | “Power distribution” figure |

---

## 9. Simulation limits in Fritzing

| What Fritzing can do | What it cannot do |
|--------------------|-------------------|
| Show correct wiring | Run `main.py` or Picamera2 |
| Export schematic/breadboard images | Simulate FaceNet or Flask API |
| Basic animation of nets | Model six mechanical cylinders |

**Software simulation (no hardware):** run on a PC — `hardware/*.py` uses
simulation mode when `RPi.GPIO` is missing (servos log `[SIM]`, IR always OK).

**Bench test jig (minimal hardware):** replace IR sensors with push-buttons to
GND (GPIO 23/24) and one servo on GPIO 12 before building all six compartments.

---

## 10. Export checklist for submission

- [ ] Breadboard view PNG (300 DPI)
- [ ] Schematic view PDF
- [ ] BOM table from [`bom.csv`](bom.csv)
- [ ] Pin table (Section 4) in report appendix
- [ ] Note: six servos on external 5 V, common GND
- [ ] Note: SIM800L on separate LiPo
- [ ] Note: no gate — rotation + gravity only

---

## 11. Verify wiring against the real Pi

After building physically, run on the Pi:

```bash
i2cdetect -y 1          # expect 0x68 (DS3231)
ls /dev/ttyUSB*         # GSM adapter
libcamera-hello -t 2000 # camera
python3 main.py         # full system
```

GPIO assignments must match `config.yaml` → `servo.pins`, `ir_sensors.*`,
`buzzer.pin`, and `hardware.i2s_mic.*`.
