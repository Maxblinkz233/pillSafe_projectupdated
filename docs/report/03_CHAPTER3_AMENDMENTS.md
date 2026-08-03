# Chapter 3 — Methodology & Design: Accuracy Amendments

Replace or amend the corresponding subsections in the existing Chapter 3 so the design chapter matches the **implemented** system. Strike-through / delete obsolete claims (Flutter, Pi 4B as sole target, SG90, 60° six-compartment step, PCA9685 as required PWM driver, SIM800L USB-serial as the only GSM path, face-only auth).

---

## 3.x System overview (amended narrative)

PillSafe consists of:

1. **Hub** — Raspberry **Pi 5** running Python (Flask REST API, schedule controller, face/voice pipelines, dispenser drivers, SQLite).
2. **Mobile client** — **React Native** application (`src/`); an **Expo Go** variant (`pillsafe-expo/`) supports camera-less UI preview during development.
3. **Mechanics** — six patient compartments, each with a rotating cylinder of **nine slots at 40°**, driven by one **MG996R** continuous-rotation servo; gravity drop to a collection point; optional IR confirmation.
4. **Alerts** — on-device **buzzer** when a dose becomes due; **SMS** via **SIM800C** on Pi UART for missed doses, verification failures, and selected faults; in-app reminder poller (“Time Is Up”) on the phone.

Local Wi-Fi (typically the Pi hotspot or LAN) carries HTTPS/HTTP REST between app and hub. No cloud dependency is required for core dispense and adherence logging.

---

## 3.x Hardware platform (replace Pi 4B-centric wording)

| Item | Design choice |
|------|----------------|
| SBC | **Raspberry Pi 5** (64-bit Raspberry Pi OS) |
| GPIO stack | Compatibility layer: **lgpio** preferred → **RPi.GPIO** fallback → **simulation** for dry-run (`gpio_compat`) |
| Camera | CSI Pi Camera (MJPEG stream + JPEG snapshot to the phone) |
| Voice (optional) | Voice HAT / I2S mic path; sample-rate handling in hub voice modules |
| RTC | DS3231 on I2C for reliable wall-clock scheduling |
| Servos | **6 × MG996R**, continuous / 360° style, external 5 V ≥5–6 A supply, **common GND with Pi** |
| Servo PWM pins | BCM **12, 13, 22, 17, 26, 27** (GPIO **16 avoided** — Voice HAT conflict) |
| IR | FC-51 pair on BCM **23** (drop) and **24** (pickup); may be non-mandatory during bring-up |
| Buzzer | Active module on BCM **25**; **dose-due reminder only** (stopped before dispense verify) |
| GSM | **SIM800C**, UART **`/dev/serial0`** @ 9600; TX→GPIO15(RX), RX→GPIO14(TX); **separate LiPo** power |

**Remove / correct:**

- Claims that the sole controller is Raspberry **Pi 4B**.
- **PCA9685** as a required PWM expander for this pin map (direct GPIO PWM / software PWM as configured).
- Servo on **GPIO18** as the primary dispense pin.
- **SG90** as the project servo.
- **SIM800L over USB-serial** as the documented production path (SIM800C UART is the configured path).

---

## 3.x Dispensing mechanism (replace 60° / single-servo carousel language)

### Compartment geometry

- **Six** patient compartments (one servo each).
- Each cylinder: **nine** dose slots.
- Angular step: **40°** per slot (9 × 40° = 360°).
- Delivery: **gravity drop** after rotation; no motorised gate in the baseline design.

### Actuation model

Continuous-rotation MG996R units are driven with a **timed duty** around a calibrated **neutral** pulse (≈7.5% at 50 Hz), not absolute 0–360° positional PWM.

Key parameters (see `hardware/config.yaml`):

- `mode: continuous`
- `angle_per_slot: 40`
- `neutral_duty`, `run_duty_offset`, `degrees_per_second` — tuned so one command advances ≈ one slot
- `use_slot_indexing: true` — software tracks slot index per compartment

**Remove:** formulas and text that treat the machine as **one** SG90 advancing a shared carousel by **60°** between six compartments.

### Mechanical / CAD design intent

CAD under `hardware/cad/` sizes the stack around a compartment envelope on the order of **~Ø200 mm × ~21.67 mm** height for reference layers. Layer gear work targets approximately **72 teeth** on the large gear with a matched **16-tooth pinion** (pitch radius / centre-distance chosen for mesh with small clearance). Report figures should cite the sized Blender models rather than a generic “carousel sketch.”

---

## 3.x Authentication design (amend face-only sections)

### Face (primary)

- OpenCV Haar cascade for detection.
- **MobileFaceNet** TFLite embeddings; cosine-distance / confidence thresholds from config.
- Enrolment stores samples under the hub dataset path; verify runs on the hub after the app issues Verify Now (when `require_verify_request` is true).
- Live **camera stream** and **snapshot** endpoints support phone-side preview during enrol/verify.

### Voice (optional secondary path)

- Challenge phrase / enrolment APIs (`/voice/challenge`, `/users/<id>/enrol/voice`).
- Verification integrated into the dispense verify path when voice is enabled and enrolled.
- Document Voice HAT sample-rate constraints and that voice may be disabled in config until hardware is fitted.

**Amend** any statement that authentication is **face only**.

---

## 3.x Mobile application (replace Flutter)

| Aspect | Implementation |
|--------|----------------|
| Framework | **React Native** (TypeScript/JavaScript under `src/`) |
| Demo / preview | **Expo Go** project `pillsafe-expo/` for UI without full native camera stack |
| Connection | Device IP + shared API token (`pillsafe` default; change for deployment) |
| Schedules | Create with **AM/PM** dose picker; **long-press** to edit/delete (subject to “already TAKEN today” rules) |
| Reminders | Poller detects due doses; **“Time Is Up”** alert; navigate to Verify via nested `MainApp` → `Verify` |
| Monitor | Missed / adherence aligned with schedule + grace logic used on Home |
| Verify | Disabled when there is no actionable dose; handshake `POST /dispense/request` then hub auth |

**Remove** Flutter/Dart as the implemented client stack.

---

## 3.x Scheduling, reminders, and alerts (amend)

1. Schedules stored in SQLite; hub polls on `poll_interval_seconds` (default 15 s).
2. When a dose becomes due: **buzzer** runs the dose-ready pattern (~45–60 s configurable); buzzer **stops** before dispense authentication so it does not interfere with mic/camera UX.
3. App reminder poller surfaces the same due window; user taps **Verify Now**.
4. Hub authenticates (face ± voice), advances the correct compartment one slot, logs **TAKEN** (IR optional).
5. If grace period expires without success: log **MISSED**, notify caregiver by **SMS** (and in-app notifications where applicable).
6. Repeated failed verify sets can trigger SMS and temporary lockout per face config thresholds.

**Amend** text that treats the buzzer as a generic “start of face verify” alarm only, without the dose-due / stop-before-dispense policy.

---

## 3.x Software architecture sketch (update)

```
React Native app  ──REST──►  Flask API (routes.py)
                                │
                                ├── Face / Voice / Camera
                                ├── ScheduleController
                                ├── Dispenser (6× continuous servo + IR)
                                ├── Buzzer (dose-due)
                                ├── GSM (SIM800C UART)
                                └── SQLite (users, schedules, adherence, …)
```

Central tuning lives in `hardware/config.yaml` (NFR-style single config file).

---

## 3.x API surface (expand the short sketch)

Representative endpoints (all behind shared token / auth as implemented):

| Area | Methods (examples) |
|------|---------------------|
| Health | `GET /health` |
| Camera | `GET /camera/snapshot`, `GET /camera/stream`, `POST /camera/preview/stop` |
| Users | CRUD + `POST .../enrol`, `.../enrol/voice`, `.../enrol/status` |
| Dispense | `POST /dispense/request`, `POST /dispense/verify` |
| Schedules | `GET/POST /schedules`, `PUT/DELETE /schedules/<id>` |
| Adherence | `GET /adherence`, ack endpoints |
| Inventory / notifications | as implemented |
| Test | `POST /alerts/dose-due-test` |

---

## Checklist for the writer (Ch.3 pass)

- [ ] Pi **5** + `gpio_compat` mentioned  
- [ ] React Native (+ Expo Go if used in demo)  
- [ ] Face **and** optional voice  
- [ ] 6 × MG996R, 9 × 40°, continuous timed steps  
- [ ] Pins [12, 13, 22, 17, 26, 27]; no GPIO16 for servo  
- [ ] SIM800C UART `/dev/serial0`  
- [ ] Buzzer = dose-due only; stop before dispense  
- [ ] Flutter / SG90 / 60° / GPIO18-primary / PCA9685-required / face-only removed or clearly marked superseded  
