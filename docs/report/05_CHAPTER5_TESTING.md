# Chapter 5 — Testing and Results

Word-ready body. Replace bracketed placeholders `[N]`, `[xx%]`, etc. with your measured campaign data. Keep the table structures even if some rows are marked “not yet measured” or “simulated GSM.”

---

## 5.1 Introduction

This chapter reports functional and performance tests of PillSafe against the project objectives: biometric access control, timed dispensing, reminder behaviour, missed-dose handling, and mobile schedule/monitoring features. Tests were run on the Raspberry Pi 5 hub with the React Native client unless noted. Where physical GSM or IR hardware was unavailable, those paths were exercised in simulation or with the dose-due test endpoint and logged as such.

---

## 5.2 Test environment

| Item | Configuration |
|------|----------------|
| Hub | Raspberry Pi 5, Raspberry Pi OS 64-bit |
| Config | `hardware/config.yaml` as deployed for the trial |
| Face model | MobileFaceNet TFLite + Haar cascade |
| Servo mode | Continuous; `angle_per_slot: 40`; calibrated `degrees_per_second` |
| App | React Native build / Expo Go as used in demo |
| Network | Pi hotspot or LAN; API token set |
| GSM | SIM800C live **or** logged AT simulation — state which |
| IR | `required: true/false` — state which for each table |

---

## 5.3 Facial verification

**Procedure:** Enrol one authorised user under controlled lighting. Run `[N]` verify attempts as the true user and `[N]` attempts with an impostor or unenrolled face. Record accept / reject and mean confidence where available.

**Table 5.1 — Face verification**

| Trial class | Attempts (N) | Accepted | Rejected | True accept / False reject rate | Notes |
|-------------|--------------|----------|----------|----------------------------------|-------|
| Genuine user | | | | TAR = ··· | |
| Impostor / unknown | | | | FAR = ··· | |
| Poor lighting / angle | | | | | Optional stress |

**Discussion:** Comment on threshold (`confidence_threshold` / `distance_threshold`), retry sets (`max_retries`, `reject_sets_before_sms`), and any lockouts observed.

*[Insert Figure 5.1 — bar chart of accept/reject]*

---

## 5.4 Voice verification (if claimed in objectives)

**Procedure:** Enrol voice for the same user. Run genuine and impostor (or wrong phrase) trials with the Voice HAT.

**Table 5.2 — Voice verification**

| Trial class | Attempts (N) | Accepted | Rejected | Rate | Notes (sample rate / noise) |
|-------------|--------------|----------|----------|------|------------------------------|
| Genuine | | | | | |
| Impostor / wrong phrase | | | | | |
| Face+voice combined policy | | | | | If both required |

If voice was disabled in the assessed build, state that clearly and mark Table 5.2 as deferred.

---

## 5.5 Dispense mechanics

**Procedure:** After successful verify (or dispenser unit test / dry-run), command one-slot advances. Measure time per step and visual/angular success (≈40°). Repeat across compartments if possible. With IR enabled, record drop/pickup detection.

**Table 5.3 — Slot advance**

| Compartment | Steps (N) | Correct ≈40° | Overshoot / undershoot | Mean time (s) | Failures |
|-------------|-----------|--------------|------------------------|---------------|----------|
| 1 (pin 12) | | | | | |
| 2 (pin 13) | | | | | |
| … | | | | | |
| Overall | | | | | |

**Table 5.4 — IR confirmation** (only if `ir_sensors.required` or sensors fitted)

| Event | Trials (N) | Detected | Missed | Detect rate |
|-------|------------|----------|--------|-------------|
| Pill drop (pin 23) | | | | |
| Pickup (pin 24) | | | | |

**Discussion:** Continuous open-loop drive depends on `degrees_per_second` and gear backlash; report calibration method and residual error.

---

## 5.6 Schedule → reminder → app alert latency

**Procedure:** Create a schedule shortly ahead of wall-clock time. Measure:

1. Hub recognition of dose-due (log / buzzer start).  
2. Buzzer audible within expected window (`dose_ready_duration_seconds`).  
3. App “Time Is Up” (or equivalent) appearance while the reminder poller runs.  
4. End-to-end latency from scheduled time to app alert.

**Table 5.5 — Reminder latency**

| Run | Scheduled time | Buzzer start Δt (s) | App alert Δt (s) | Verify Now reachable? |
|-----|----------------|---------------------|------------------|------------------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| Mean | | | | |

Use `POST /alerts/dose-due-test` for buzzer-only lab checks when schedule timing is inconvenient.

---

## 5.7 Missed-dose path

**Procedure:** Allow a due dose to expire past `grace_period_minutes` without successful verify. Confirm DB status **MISSED**, caregiver SMS (or simulated send log), and Monitor / Home missed counts.

**Table 5.6 — Missed-dose handling**

| Run | Grace (min) | MISSED in DB? | SMS sent / logged? | App Monitor count matches? |
|-----|-------------|---------------|--------------------|----------------------------|
| 1 | 15 | | | |
| 2 | | | | |

Also note reject-set SMS after repeated failed verifies, if tested (`reject_sets_before_sms`).

---

## 5.8 Mobile application behaviour

**Table 5.7 — App functional checks**

| Feature | Pass/Fail | Notes |
|---------|-----------|-------|
| Connect with token + health | | |
| Create schedule (AM/PM) | | |
| Long-press edit schedule | | |
| Long-press delete schedule | | |
| Edit blocked after TAKEN today (if enforced) | | |
| Reminder → navigate to Verify | | |
| Verify disabled when no actionable dose | | |
| Monitor missed vs Home consistency | | |
| Camera preview (stream/snapshot) | | |

---

## 5.9 Limitations observed

Document honestly, for example:

1. **Continuous-servo calibration** — open-loop timing drifts with supply voltage, load, and print backlash; without an encoder, absolute slot index can drift over many cycles.  
2. **Background notifications** — when the app is fully backgrounded/killed, OS limits may prevent reminder polls; users should keep the app available during dose windows or rely on the hub buzzer + SMS.  
3. **Gear print tolerance** — FDM tooth geometry affects mesh and step consistency.  
4. **IR optional mode** — if `required: false`, TAKEN can be logged without physical confirmation (acceptable for bring-up, weaker for clinical claims).  
5. **GSM dependency** — SMS needs network, SIM credit, and correct UART level shifting.

---

## 5.10 Chapter summary

Summarise quantitative highlights once tables are filled (e.g. face TAR/FAR, dispense success rate, mean reminder latency, missed-path correctness). State which objectives were fully demonstrated versus partially demonstrated (e.g. voice deferred, IR simulated).
