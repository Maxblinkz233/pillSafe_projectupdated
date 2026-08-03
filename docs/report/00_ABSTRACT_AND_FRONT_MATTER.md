# PillSafe — Abstract & Front-Matter Updates

Paste these replacements into the Word report. Do **not** leave the February 2026 draft wording for face-only / Flutter / generic Wi-Fi module.

---

## Abstract (replacement)

Medication non-adherence remains a major cause of treatment failure, especially among elderly and chronically ill patients who manage multiple daily doses. Existing electronic pill dispensers often lack strong identity verification, rely on weak alarms, or do not notify caregivers when a dose is missed. This project presents **PillSafe**, a biometric medication-dispensing system that combines a Raspberry Pi 5 hub with a React Native mobile application.

The hub stores prescribed schedules in SQLite, reminds the patient when a dose becomes due (buzzer on the device and an in-app alert), and releases medication only after successful biometric verification. Authentication uses facial recognition (MobileFaceNet TensorFlow Lite with OpenCV Haar detection) and an optional voice-enrolment / verification path via a Voice HAT microphone. Six patient compartments are driven by MG996R continuous-rotation servos; each compartment holds nine angular slots at 40° steps. After a successful verify, the assigned servo advances one slot and gravity delivers the dose; optional IR sensors can confirm drop and pickup. Missed doses after a configurable grace period, repeated verification failures, and related faults generate SMS alerts to a caregiver through a SIM800C module on the Pi UART. The phone app manages device connection, schedules (including AM/PM dosing and edit/delete), live camera preview for enrolment and verify, adherence monitoring, and the Verify Now handshake with the hub.

The system is designed for home and small-clinic use where reliable, identity-gated dispensing and caregiver visibility matter more than cloud-centric pharmacy automation. Implementation, construction, and evaluation are reported in Chapters 4–6.

**Keywords:** medication adherence, facial recognition, voice biometrics, Raspberry Pi 5, React Native, GSM SMS, smart pill dispenser.

---

## Declaration — supervisor name

Correct the declaration block:

- **Wrong:** … supervised by Mr. Bight …
- **Correct:** … supervised by **Mr. Bright** …

(Use the full official supervisor name as required by your department if it differs from “Bright” alone.)

---

## Suggested list-of-figures additions (Ch.4–6)

| Fig. | Caption (suggested) |
|------|---------------------|
| 4.1 | System stack: Pi 5, Voice HAT, camera, servo rail, SIM800C |
| 4.2 | Power domains (Pi PD / servo 5 V / GSM LiPo) with common GND |
| 4.3 | GPIO pin map used by PillSafe |
| 4.4 | Software module map (hub + mobile app) |
| 4.5 | Enrolment flow (face and optional voice) |
| 4.6 | CAD: compartment outer dimensions (~Ø200 × 21.67 mm) |
| 4.7 | Layer gear (~72T) and matched 16T pinion mesh |
| 5.1–5.n | Face / voice / dispense / reminder / missed-dose result charts |
| 6.1 | Objectives vs achievements summary |

---

## How to use this folder

| File | Purpose |
|------|---------|
| `03_CHAPTER3_AMENDMENTS.md` | Accuracy patch for Methodology & Design |
| `04_CHAPTER4_IMPLEMENTATION.md` | New Chapter 4 body |
| `05_CHAPTER5_TESTING.md` | New Chapter 5 body + result tables |
| `06_CHAPTER6_CONCLUSION.md` | New Chapter 6 + future work |
| `00_ABSTRACT_AND_FRONT_MATTER.md` | This file |
