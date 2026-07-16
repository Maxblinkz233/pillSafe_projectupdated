# PillSafe — Full Hardware Wiring Guide (Raspberry Pi 5)

Complete electrical connection instructions for every device in the hub:
power supplies, Pi GPIO, servos, IR sensors, buzzer, RTC, camera, SIM800C,
optional mic, and the **passive parts** (resistors, capacitors) required for a
safe build.

Matches `config.yaml`, `docs/bom.csv`, and the drivers under `hardware/`.

**Companion files**

| File | Purpose |
|------|---------|
| [`bom.csv`](bom.csv) | Parts list |
| [`fritzing_connections.csv`](fritzing_connections.csv) | Net-by-net checklist |
| [`FRITZING_GUIDE.md`](FRITZING_GUIDE.md) | Drawing the circuit in Fritzing |

---

## 0. Safety rules (read before wiring)

1. **Three separate power domains** — never share “+” rails across them:
   - Pi: official **27 W USB-C PD** only
   - Servos: external **5 V ≥ 5–6 A** only
   - SIM800C: **3.7–4.2 V LiPo** only
2. **One common ground** — every supply’s GND must join a single GND bus that
   also ties to Pi GND. Without this, UART/GPIO signals float and damage GPIO.
3. **Pi GPIO is 3.3 V only** — never feed 5 V into a GPIO input pin.
4. **Do not power six MG996R from the Pi 5 V pins** — brown-outs and SD
   corruption are likely.
5. Power-up order: connect all wires → common GND verified → servo PSU →
   LiPo (GSM) → Pi USB-C last.

---

## 1. Power architecture (full picture)

```
                    ┌─────────────────────────────────────────┐
  Mains ───────────►│ Official Pi 5 27W USB-C PD              │──► Pi 5 only
                    └─────────────────────────────────────────┘

                    ┌─────────────────────────────────────────┐
  Mains ───────────►│ External 5V PSU  (≥5–6 A, regulated)    │──► 6× MG996R VCC
                    │   +5V rail                              │
                    │   GND ──────────────────────────────────┼──┐
                    └─────────────────────────────────────────┘  │
                                                                 │
                    ┌─────────────────────────────────────────┐  │
  LiPo 3.7–4.2V ───►│ SIM800C VCC (+), antenna, SIM           │  │
                    │   GND ──────────────────────────────────┼──┤
                    └─────────────────────────────────────────┘  │
                                                                 │
                    ┌─────────────────────────────────────────┐  │
                    │ COMMON GND BUS (terminal block)         │◄─┘
                    │   • Pi GND (pins 6,9,14,20,25,30,34,39) │
                    │   • All module GNDs                     │
                    │   • Servo PSU GND + LiPo GND            │
                    └─────────────────────────────────────────┘

  Pi 3.3V (Pin 1) ──► DS3231 VCC, both FC-51 VCC, (optional INMP441 VDD)
  Pi 5V   (Pin 2/4) ► 5V active buzzer VCC only (not servos, not GSM)
```

### Recommended passive parts on the power rails

| Part | Value | Where | Why |
|------|-------|-------|-----|
| Electrolytic capacitor | **1000 µF / 16 V** | Across external 5 V servo rail (+ to GND), near servo connectors | Absorbs MG996R stall spikes |
| Ceramic capacitor | **100 nF** | Across servo rail near each servo cluster (optional) | High-frequency noise |
| Electrolytic capacitor | **1000 µF / 10 V** (or module onboard) | Across SIM800C VCC–GND, close to module | GSM TX current bursts (~2 A) |
| Fuse / polyfuse (optional) | **5–7 A** | In series with external 5 V + | Protects wiring on short |
| Terminal block | 2–3 position | Common GND + 5 V rail distribution | Clean star grounding |

---

## 2. Raspberry Pi 5 — 40-pin header map (used pins)

Odd pins left column, even pins right (looking at the Pi with USB ports down;
confirm against the silkscreen on your board).

| Physical pin | Function | Connected to |
|-------------:|----------|--------------|
| 1 | 3.3 V | DS3231 VCC, IR#1 VCC, IR#2 VCC, (INMP441 VDD) |
| 2 | 5 V | Active buzzer VCC |
| 3 | GPIO 2 (SDA1) | DS3231 SDA |
| 4 | 5 V | Spare / alternate buzzer VCC |
| 5 | GPIO 3 (SCL1) | DS3231 SCL |
| 6 | GND | Common GND bus |
| 8 | GPIO 14 (TXD0) | SIM800C **RX** (after level care — §7) |
| 9 | GND | IR sensors GND |
| 10 | GPIO 15 (RXD0) | SIM800C **TX** (via divider if 5 V — §7) |
| 11 | GPIO 17 | Servo compartment 3 signal |
| 13 | GPIO 27 | Servo compartment 5 signal |
| 14 | GND | DS3231 GND |
| 16 | GPIO 23 | IR drop (chute) OUT |
| 18 | GPIO 24 | IR pickup (tray) OUT |
| 20 | GND | Buzzer GND |
| 22 | GPIO 25 | Buzzer signal |
| 32 | GPIO 12 | Servo compartment 0 signal |
| 33 | GPIO 13 | Servo compartment 1 signal |
| 36 | GPIO 16 | Servo compartment 2 signal |
| 37 | GPIO 26 | Servo compartment 4 signal |
| CSI | Camera connector | Pi Camera ribbon |

Unused for Phase 1 (leave free): GPIO 18/19/20 reserved for optional INMP441.

---

## 3. Component-by-component wiring

### 3.1 Pi Camera (CSI)

| From | To | Notes |
|------|----|-------|
| Camera ribbon (contacts toward HDMI side on Pi 5 — check board silkscreen) | Pi 5 **CAM/DISP** port | Power off while inserting |
| — | — | No breadboard wires; enable Camera in `raspi-config` |

Mechanical only after electrical: mount camera facing the user at dose time.

---

### 3.2 DS3231 RTC (I2C)

Modules almost always include **4.7 kΩ pull-ups** on SDA/SCL and a battery holder.

| DS3231 pin | Goes to | Wire |
|------------|---------|------|
| VCC | Pi Pin 1 (3.3 V) | Red |
| GND | Pi Pin 14 (GND) → common GND | Black |
| SDA | Pi Pin 3 (GPIO 2) | Blue |
| SCL | Pi Pin 5 (GPIO 3) | Purple |
| BAT / CR2032 | Insert CR2032 in holder | Keeps time when Pi is off |

**Extra resistors:** none if the module has onboard pull-ups (typical).  
If you use a bare DS3231 IC (no module): add **2× 4.7 kΩ** from SDA→3.3 V and SCL→3.3 V.

Verify: `sudo i2cdetect -y 1` → device at **0x68**.

---

### 3.3 FC-51 IR obstacle sensors × 2

Each FC-51 board has onboard IR LED + phototransistor + comparator +
**trim pot**; no external resistors required for the standard 3-pin module.

| Sensor | Module pin | Pi / rail | Physical |
|--------|------------|-----------|----------|
| **IR #1 Drop** (chute) | VCC | 3.3 V | Pin 1 |
| | GND | GND | Pin 9 |
| | OUT | GPIO 23 | Pin 16 |
| **IR #2 Pickup** (tray) | VCC | 3.3 V | Pin 1 (shared rail) |
| | GND | GND | Pin 9 (shared) |
| | OUT | GPIO 24 | Pin 18 |

**Software expectation** (`ir_sensor.py`):

- Drop: OUT goes **LOW** when a pill interrupts the beam.
- Pickup: OUT goes **HIGH** when the pill is removed from the tray (adjust pot / mount so this matches your mechanical layout).

**Optional:** if OUT is open-collector on your clone, add a **10 kΩ pull-up** from OUT to 3.3 V. Most FC-51 boards already drive HIGH/LOW.

Mount:

1. IR #1 across the **delivery tube / chute** after the drop hole.
2. IR #2 at the **collection tray** so presence/absence is reliable.

---

### 3.4 Active 5 V buzzer module

Use a **transistor-buffered active buzzer module** (3 pins: VCC, GND, I/O).  
Do **not** wire a bare piezo across a GPIO pin.

| Buzzer pin | Goes to | Physical |
|------------|---------|----------|
| VCC | Pi **5 V** | Pin 2 or 4 |
| GND | GND | Pin 20 |
| I/O / Signal | GPIO 25 | Pin 22 |

**Resistors:** none for a proper module (driver transistor + base resistor onboard).  
If you only have a bare active buzzer + NPN:

| Part | Value | Connection |
|------|-------|------------|
| Base resistor | **1 kΩ** | GPIO 25 → base of NPN |
| NPN (e.g. 2N2222) | — | Collector → buzzer − ; emitter → GND |
| Buzzer + | — | Pi 5 V |
| Flyback (if magnetic) | **1N4148** | Across buzzer, cathode to +5 V |

---

### 3.5 MG996R servos × 6 (one per compartment)

Each servo has three wires (typical colour):

| Wire | Function |
|------|----------|
| Red | VCC → **external 5 V only** |
| Brown/Black | GND → **common GND** |
| Orange/Yellow | Signal (PWM) → Pi GPIO |

| Compartment | Signal BCM | Physical pin | External |
|-------------|------------|--------------|----------|
| 0 | GPIO 12 | 32 | VCC→5 V PSU, GND→bus |
| 1 | GPIO 13 | 33 | same |
| 2 | GPIO 16 | 36 | same |
| 3 | GPIO 17 | 11 | same |
| 4 | GPIO 26 | 37 | same |
| 5 | GPIO 27 | 13 | same |

**Recommended series resistors on PWM (signal protection):**

| Part | Value | Connection |
|------|-------|------------|
| 6× series resistors | **220 Ω – 470 Ω** | Each Pi PWM pin → corresponding servo Signal |

These limit fault current if a servo shorts internally. Optional but recommended.

**Decoupling:** 1000 µF on the 5 V rail (§1). Star-wire thick (18–22 AWG) +5 V/GND to all six servos; thin Dupont only for Signal.

**Mechanical:** each servo turns a 9-slot cylinder (~40°/slot). No gate servo — gravity drop only.

---

### 3.6 SIM800C GSM (UART + separate LiPo)

**Enable first (software):**  
`raspi-config` → Interface Options → Serial Port →  
login shell: **No** → serial hardware: **Yes** → reboot.  
Device: `/dev/serial0` (see `alerts.serial_port` in `config.yaml`).

| SIM800C | Goes to | Notes |
|---------|---------|-------|
| VCC / VBAT | LiPo **+** (3.7–4.2 V) | Capable of ~2 A peaks |
| GND | Common GND + LiPo − | Mandatory shared ground |
| TX | Pi GPIO 15 (RX) Pin 10 | **Level-shift if TX is 5 V** — see below |
| RX | Pi GPIO 14 (TX) Pin 8 | Pi 3.3 V TX is usually OK for SIM800C RX |
| Antenna | SMA / u.FL antenna | Fit before SMS tests |
| SIM | Nano SIM (SMS plan) | Insert before powering module |

#### UART resistors — voltage divider on SIM800C TX → Pi RX

Many SIM800C breakouts output **~2.8–3.0 V** on TX (safe). Some clones label
logic as 5 V. **Measure TX idle voltage with a multimeter** before connecting
to the Pi.

If TX ≥ **3.6 V**, add a divider:

```
SIM800C TX ───[ R1 = 10 kΩ ]───┬─── Pi GPIO 15 (RX) / Pin 10
                               │
                              [ R2 = 20 kΩ ]
                               │
                              GND
```

| Part | Value | Role |
|------|-------|------|
| R1 | **10 kΩ** | Series from SIM TX |
| R2 | **20 kΩ** | To GND; Vout ≈ Vin × 2/3 |

Alternative pair: **1 kΩ + 2 kΩ** (same ratio, lower impedance).

**Pi TX → SIM RX:** usually direct. If your module requires 5 V logic on RX,
use a bidirectional level shifter (not a bare resistor). Prefer a **3.3 V TTL**
SIM800C board.

**Capacitor:** 1000 µF across SIM VCC–GND if not already on the breakout.

**Do not** power SIM800C from Pi 5 V or 3.3 V alone.

---

### 3.7 Optional — INMP441 I2S mic (voice deferred)

Leave `voice.enabled: false` and `hardware.i2s_mic.enabled: false` until fitted.

| INMP441 | Pi | Notes |
|---------|-----|-------|
| VDD | 3.3 V (Pin 1) | Not 5 V |
| GND | GND | |
| L/R | GND | Left channel |
| SCK | GPIO 18 | I2S BCLK |
| WS | GPIO 19 | I2S LRCLK |
| SD | GPIO 20 | I2S data |

No external resistors required for the typical breakout.

---

## 4. Full circuit netlist (every connection)

Use this as a wire-by-wire checklist. Suggested colours match
`fritzing_connections.csv`.

### Ground (all black / brown → common GND bus)

| # | From | To |
|---|------|----|
| G1 | Pi Pins 6, 9, 14, 20 (any/all used) | GND bus |
| G2 | External 5 V PSU GND | GND bus |
| G3 | LiPo − | GND bus |
| G4–G9 | Servo 0…5 GND | GND bus |
| G10 | DS3231 GND | GND bus |
| G11–G12 | IR#1 GND, IR#2 GND | GND bus |
| G13 | Buzzer GND | GND bus |
| G14 | SIM800C GND | GND bus |
| G15 | (opt) INMP441 GND | GND bus |
| G16 | (opt) Divider R2 bottom | GND bus |

### +3.3 V (red from Pi Pin 1)

| # | From | To |
|---|------|----|
| P33-1 | Pi Pin 1 | DS3231 VCC |
| P33-2 | Pi Pin 1 | IR#1 VCC |
| P33-3 | Pi Pin 1 | IR#2 VCC |
| P33-4 | Pi Pin 1 | (opt) INMP441 VDD |

### +5 V Pi rail (red from Pin 2/4) — buzzer only

| # | From | To |
|---|------|----|
| P5-1 | Pi Pin 2 or 4 | Buzzer VCC |

### +5 V external rail (thick red)

| # | From | To |
|---|------|----|
| P5E-1 | External PSU +5 V | Servo 0…5 VCC (all six) |
| P5E-2 | External PSU +5 V | + of 1000 µF capacitor |
| P5E-3 | Capacitor − | GND bus |

### +3.7–4.2 V LiPo

| # | From | To |
|---|------|----|
| PL-1 | LiPo + | SIM800C VCC |
| PL-2 | LiPo + | + of 1000 µF at SIM (if fitted) |
| PL-3 | Capacitor − | GND bus |

### Signal wires

| # | From | Via | To |
|---|------|-----|----|
| S0 | Pi Pin 32 (GPIO 12) | 220–470 Ω (opt) | Servo 0 Signal |
| S1 | Pi Pin 33 (GPIO 13) | 220–470 Ω (opt) | Servo 1 Signal |
| S2 | Pi Pin 36 (GPIO 16) | 220–470 Ω (opt) | Servo 2 Signal |
| S3 | Pi Pin 11 (GPIO 17) | 220–470 Ω (opt) | Servo 3 Signal |
| S4 | Pi Pin 37 (GPIO 26) | 220–470 Ω (opt) | Servo 4 Signal |
| S5 | Pi Pin 13 (GPIO 27) | 220–470 Ω (opt) | Servo 5 Signal |
| IR1 | IR#1 OUT | — | Pi Pin 16 (GPIO 23) |
| IR2 | IR#2 OUT | — | Pi Pin 18 (GPIO 24) |
| BZ | Pi Pin 22 (GPIO 25) | — | Buzzer Signal |
| SDA | Pi Pin 3 (GPIO 2) | — | DS3231 SDA |
| SCL | Pi Pin 5 (GPIO 3) | — | DS3231 SCL |
| UTX | Pi Pin 8 (GPIO 14 TX) | — | SIM800C RX |
| URX | SIM800C TX | 10k/20k divider if needed | Pi Pin 10 (GPIO 15 RX) |
| CSI | Camera ribbon | — | Pi CSI port |

---

## 5. Block / schematic overview

```
                         ┌──────────────────────┐
   CSI Camera ───────────│   Raspberry Pi 5     │
                         │   USB-C ← 27W PD     │
                         └──┬────┬────┬────┬────┘
              3.3V / GND    │    │    │    │  UART GPIO14/15
         ┌──────────────────┘    │    │    └──────────────┐
         │                       │    │                   │
    ┌────┴────┐  ┌──────────┐   │   ┌┴────────┐   ┌──────┴───────┐
    │ DS3231  │  │ 2× FC-51 │   │   │ Buzzer  │   │   SIM800C    │
    │ I2C     │  │ GPIO23/24│   │   │ GPIO25  │   │ TX/RX + ant  │
    │ 0x68    │  │ 3.3V     │   │   │ VCC=5V  │   │ VCC←LiPo     │
    └─────────┘  └──────────┘   │   └─────────┘   └──────────────┘
                                │
                    PWM GPIO 12,13,16,17,26,27
                                │
                    ┌───────────┴───────────┐
                    │  6× MG996R (signal)   │
                    │  VCC ← External 5V    │
                    │  GND ← Common bus     │
                    └───────────────────────┘

  Mechanical (not wires): cylinder slots → drop hole → tube → IR#1 → tray → IR#2
```

---

## 6. Passive parts summary (resistors & capacitors)

| Qty | Part | Value | Where |
|----:|------|-------|-------|
| 1 | Electrolytic cap | 1000 µF / 16 V | External 5 V servo rail |
| 1 | Electrolytic cap | 1000 µF / 10 V | SIM800C VCC (if not onboard) |
| 0–6 | Series resistor | 220–470 Ω | Each servo PWM line (recommended) |
| 0–2 | Divider resistors | 10 kΩ + 20 kΩ | SIM800C TX → Pi RX **only if TX > 3.3 V** |
| 0–2 | I2C pull-ups | 4.7 kΩ | Only if DS3231 is bare IC (not module) |
| 0–1 | Pull-up | 10 kΩ | IR OUT only if open-collector clone |
| 0–1 | Base resistor + NPN | 1 kΩ + 2N2222 | Only if using bare buzzer (not module) |
| 1 | CR2032 | Coin cell | DS3231 backup |
| 1 | Terminal block | — | Common GND (+ optional 5 V bus) |

FC-51, DS3231 modules, and active buzzer modules already include their own
board-level resistors — you do not duplicate those on the breadboard.

---

## 7. Build order (recommended)

1. Fit CR2032 in DS3231; wire RTC to 3.3 V / GND / SDA / SCL only. Boot Pi, run `i2cdetect -y 1`.
2. Add both IR sensors; toggle beams and watch GPIO (or run hub in sim logs).
3. Add buzzer on GPIO 25 + 5 V.
4. Build **common GND** + external 5 V rail + one servo; test rotation; then add remaining five.
5. Fit CSI camera; `libcamera-hello -t 2000`.
6. Wire SIM800C last: LiPo + GND + UART (with divider if needed); antenna + SIM; test AT via `minicom` / hub SMS.
7. Optional INMP441 after voice is enabled in config.

---

## 8. Post-wiring checks

```bash
sudo i2cdetect -y 1          # expect 0x68
ls -l /dev/serial0           # SIM800C UART
libcamera-hello -t 2000      # camera
# Multimeter: all GNDs continuity; servo rail ~5.0 V; LiPo ~3.7–4.2 V
# Multimeter: SIM800C TX idle < 3.3 V before connecting to Pi RX
cd ~/pillsafe && source venv/bin/activate && python3 main.py
```

If servos jitter or the Pi reboots when a servo moves: external PSU current
is too low, GND not shared, or capacitor missing on the 5 V rail.

---

## 9. What is *not* electrical

- 6× rotating cylinders (9 slots), delivery tube, collection tray  
- Enclosure / mounting brackets  
These are mechanical only; they do not add nets to the circuit.
