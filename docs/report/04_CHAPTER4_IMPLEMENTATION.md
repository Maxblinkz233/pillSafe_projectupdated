# Chapter 4 — Implementation and Construction

Word-ready body text. Insert figures from photos of your build and from `hardware/cad/` / `hardware/docs/`.

---

## 4.1 Introduction

This chapter describes how the PillSafe design was realised in hardware, embedded software, and the mobile client. It covers the bill of materials and wiring practice, the organisation of hub and app modules, biometric enrolment procedures, and the mechanical CAD decisions that support the six-compartment, nine-slot dispenser.

---

## 4.2 Bill of materials and wiring

### 4.2.1 Bill of materials (summary)

The authoritative parts list is maintained in `hardware/docs/bom.csv`. Major items include:

| Category | Component | Qty | Role |
|----------|-----------|-----|------|
| Controller | Raspberry Pi 5 | 1 | Hub computer |
| Power (Pi) | Official 27 W USB-C PD | 1 | Pi only |
| Storage | microSD 32 GB+ | 1 | Raspberry Pi OS |
| Vision | Pi Camera Module + CSI ribbon | 1 | Enrol / verify |
| Dispensing | MG996R continuous / 360° servo | 6 | One per compartment |
| Dispensing | External 5 V ≥5–6 A PSU | 1 | Servo VCC only |
| Sensors | FC-51 IR modules | 2 | Drop + pickup |
| Feedback | Active 5 V buzzer | 1 | Dose-due reminder |
| Time | DS3231 + CR2032 | 1 | RTC |
| GSM | SIM800C + LiPo + SIM + antenna | 1 set | Caregiver SMS |
| Voice (optional) | Voice HAT / I2S mic | 0–1 | Voice enrol/verify |
| Passives | 1000 µF rail caps, optional PWM series R, TX divider if needed | as BOM | Electrical safety |

Full notes and config cross-references remain in the BOM CSV.

### 4.2.2 Power architecture

Three **isolated positive rails** share a **single common ground**:

1. Pi — official USB-C PD only.  
2. Servos — external 5 V high-current supply (never the Pi 5 V pins for six MG996R).  
3. SIM800C — 3.7–4.2 V LiPo (GSM TX peaks must not collapse the Pi rail).

A bulk electrolytic capacitor (e.g. 1000 µF / 16 V) across the servo rail absorbs stall spikes. Power-up order: wiring complete → GND verified → servo PSU → LiPo → Pi last.

*[Insert Figure 4.2 — power domains diagram; may reproduce the ASCII/schematic from WIRING_GUIDE.md]*

### 4.2.3 Signal wiring summary

Detailed pin-by-pin instructions are in `hardware/docs/WIRING_GUIDE.md`, with a net checklist in `fritzing_connections.csv`.

| Function | BCM / interface | Notes |
|----------|-----------------|-------|
| Servo PWM | 12, 13, 22, 17, 26, 27 | One line per compartment; GPIO 16 reserved / Voice HAT |
| IR drop / pickup | 23 / 24 | 3.3 V logic |
| Buzzer | 25 | VCC from Pi 5 V if module is 5 V active |
| RTC | I2C (SDA/SCL) | DS3231 @ 0x68 |
| GSM | UART `/dev/serial0` | SIM800C TX→15, RX→14; 3.3 V TTL; divider if TX > 3.3 V |
| Camera | CSI | Stream + snapshot via API |
| Voice | Voice HAT / I2S | As fitted; keep `voice.enabled` false until ready |

GPIO access on Pi 5 uses the project compatibility layer (`hardware/gpio_compat.py`) so the same code path can run under lgpio, RPi.GPIO, or simulation for dry-run demos without hardware.

*[Insert Figure 4.3 — annotated 40-pin header map]*

---

## 4.3 Hub software implementation

### 4.3.1 Module map

| Module / area | Responsibility |
|---------------|----------------|
| `main.py` | Process entry, wiring of controllers, API start |
| `config.yaml` | Single source of tuneable thresholds and pins |
| `gpio_compat.py` | Pi 5–friendly GPIO backends |
| `core/` / face pipeline | Haar + MobileFaceNet TFLite match |
| Voice modules | Challenge, enrol, verify (when enabled) |
| Camera helpers | Shared camera for MJPEG / JPEG endpoints |
| `dispenser.py` | Continuous servo slot steps, IR wait policy |
| Schedule controller | Due / grace / MISSED / REMINDER coordination |
| `gsm.py` | SIM800C AT commands over UART |
| Buzzer driver | Dose-due pattern; stopped before dispense |
| `api/routes.py` | Flask REST surface for the phone |
| SQLite DB layer | Users, schedules, adherence, inventory, notifications |

*[Insert Figure 4.4 — module block diagram]*

### 4.3.2 Dispenser control

With `servo.mode: continuous`, a dispense command does not seek an absolute PWM angle. Instead it:

1. Selects the compartment pin for the patient / schedule.  
2. Runs the servo away from `neutral_duty` for a duration derived from `angle_per_slot` and `degrees_per_second`.  
3. Returns to neutral and settles.  
4. Advances the software slot index.  
5. Optionally waits for IR confirmation (`ir_sensors.required`); during bring-up this may be false so TAKEN can still be logged after a successful verify and move.

Calibration consists of adjusting `degrees_per_second` (and duty offsets) until one step visually matches ≈40° on the printed cylinder.

### 4.3.3 Scheduling and reminder policy

- Schedules and adherence events persist in SQLite.  
- The hub polls on a short interval (default 15 s).  
- On dose-due: buzzer pattern (~50 s typical); app may call `POST /alerts/dose-due-test` during lab tests.  
- When `require_verify_request` is true, the hub waits for `POST /dispense/request` from the app before running authentication.  
- After success, dispense runs and adherence is updated; after grace expiry, MISSED + SMS paths fire.

### 4.3.4 REST API (implemented)

The Flask service binds `0.0.0.0:5000` by default with a shared token. Implemented groups include health, camera snapshot/stream, user CRUD and enrolment, voice challenge/enrol, dispense request/verify, schedule CRUD, adherence, inventory, notifications, and dose-due test. This is a full operational surface, not a stub.

---

## 4.4 Mobile application implementation

### 4.4.1 Stack

The production-facing client is **React Native** under `src/`. A parallel **Expo Go** project (`pillsafe-expo/`) allows rapid UI iteration when native camera tooling is not required.

### 4.4.2 Key screens and behaviours

| Feature | Behaviour |
|---------|-----------|
| Device connection | Hub IP + API token; health check |
| Home / dashboard | Today’s doses, adherence-oriented stats |
| Schedules | Create with AM/PM picker; long-press edit/delete; block edit after TAKEN today where enforced |
| Reminders | Background-style poller while app usable; “Time Is Up”; deep link to Verify via nested navigation `MainApp` → `Verify` |
| Verify | Camera preview against hub stream/snapshot; disabled when no actionable dose |
| Monitor | Missed counts aligned with the same schedule + grace logic as Home |
| Enrolment UI | Face (and voice when enabled) against hub enrol endpoints |

---

## 4.5 Enrolment procedures

### 4.5.1 Face enrolment

1. Create or select the patient user on the hub (app or API).  
2. Ensure camera preview is live (`/camera/stream` or snapshot).  
3. Call face enrol (`POST /users/<id>/enrol`) and capture the configured sample count under good lighting.  
4. Confirm enrol status via `/users/<id>/enrol/status`.  
5. Validate with a dry verify before loading medication.

### 4.5.2 Voice enrolment (optional)

1. Enable voice in config and confirm Voice HAT / mic path.  
2. Fetch challenge text (`GET /voice/challenge`).  
3. Record and submit (`POST /users/<id>/enrol/voice`).  
4. Confirm status; include voice in subsequent `/dispense/verify` trials.

*[Insert Figure 4.5 — enrolment sequence diagram]*

---

## 4.6 Mechanical construction and CAD

### 4.6.1 Compartment stack

Sized Blender models under `hardware/cad/` (e.g. `PillSafe_Design_SIZED.blend` and working copies) define a compartment envelope on the order of:

- Outer diameter ≈ **200 mm**  
- Layer / compartment height ≈ **21.67 mm** (reference layer used for stacking)

Six layers correspond to six patients; each layer’s inner cylinder presents **nine** equal sectors for doses.

### 4.6.2 Drive gear and pinion

Layer gear geometry used in the sized design is approximately **72 teeth** at **5°** tooth spacing on the large ring. A matched **16-tooth** stub pinion was designed so that:

- Pitch radii sum (plus a small clearance, e.g. ~0.2 mm) set centre distance.  
- Tip/root diameters and face width suit FDM print tolerance.  
- Material assignment in CAD distinguishes structural plastic from a steel-look pinion for clarity in figures.

*[Insert Figure 4.6 — compartment dimensions]*  
*[Insert Figure 4.7 — 72T ring vs 16T pinion mesh]*

### 4.6.3 Assembly notes

- Print tolerance on tooth thickness and backlash dominates continuous-servo open-loop accuracy; mechanical calibration and `degrees_per_second` must be co-tuned.  
- Gravity drop path and IR sight lines should be verified before locking the outer shell.  
- Keep servo wiring strain-relieved; PWM lines may use optional series resistors per the wiring guide.

---

## 4.7 Configuration and dry-run practice

All tuneables live in `hardware/config.yaml` (face thresholds, grace period, servo continuous calibration, buzzer timing, GSM port, API token). Unit tests and dry-run / simulation paths for dispenser and database support bring-up without full mechanics. Document the token change and serial console disable (`raspi-config`: serial port on, login shell off) as part of commissioning.

---

## 4.8 Chapter summary

PillSafe was implemented as a Pi 5 hub with continuous MG996R slot indexing, Flask APIs including camera and biometrics, SIM800C UART alerts, and a React Native client with schedule and reminder UX. Mechanical CAD progressed from a generic carousel sketch to sized layers with an explicit gear–pinion pair. The next chapter evaluates these subsystems through structured tests.
