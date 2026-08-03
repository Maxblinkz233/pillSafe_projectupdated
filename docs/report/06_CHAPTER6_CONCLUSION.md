# Chapter 6 — Conclusion and Future Work

Word-ready body. Align the objectives checklist with the wording used in Chapter 1 of your dissertation.

---

## 6.1 Conclusion

This project set out to design and implement **PillSafe**, a biometric, schedule-driven medication dispenser for home and small-clinic use. The realised system centres on a **Raspberry Pi 5** hub and a **React Native** mobile application.

On the hub, prescribed times are stored in SQLite and supervised by a schedule controller. When a dose becomes due, the device issues a **buzzer reminder** and the phone can surface a **“Time Is Up”** alert. Medication is released only after successful biometric checks—**facial recognition** with MobileFaceNet TFLite, with an **optional voice** enrolment/verification path. Dispensing uses **six MG996R** continuous-rotation servos, each advancing a **nine-slot** cylinder in **40°** calibrated steps, with gravity delivery and optional IR confirmation. Caregivers can be notified by **SMS** through a **SIM800C** on the Pi UART when doses are missed or verification fails repeatedly.

Relative to the early design draft, the implementation clarified several engineering choices: Pi 5 GPIO compatibility, continuous rather than absolute positional servo control, per-compartment motors instead of a single SG90 carousel step, UART GSM instead of USB-serial SIM800L as the primary path, and React Native instead of Flutter. Mechanical CAD progressed to sized compartment geometry and a matched **~72T / 16T** gear–pinion pair.

Overall, PillSafe demonstrates a coherent end-to-end pipeline—from schedule and reminder, through identity-gated dispense, to adherence logging and caregiver alert—suitable as a final-year prototype and as a foundation for further clinical hardening.

---

## 6.2 Objectives versus achievements

Adapt row wording to match Chapter 1 exactly.

| # | Objective (from Ch.1) | Status | Evidence |
|---|----------------------|--------|----------|
| 1 | [e.g. Design a multi-compartment dispenser with identity control] | Achieved / Partially | Ch.3–4; 6×9 mechanism; face (± voice) |
| 2 | [e.g. Implement scheduling and dose reminders] | Achieved / Partially | Schedule controller; buzzer; app poller |
| 3 | [e.g. Notify caregiver on missed / failed access] | Achieved / Partially | SIM800C path; DB MISSED; Ch.5 Table 5.6 |
| 4 | [e.g. Provide a mobile interface for management] | Achieved | React Native: connect, schedules, verify, monitor |
| 5 | [e.g. Evaluate system performance] | Achieved / In progress | Ch.5 tables — fill with campaign data |

Mark any objective that depended on unfinished print validation or live SMS as **partially achieved** and explain briefly.

---

## 6.3 Contributions

1. An integrated **Pi 5** hub with config-driven face, schedule, dispense, buzzer, and GSM modules.  
2. A **continuous-servo slot index** model aligned with a nine-slot / 40° mechanical layout.  
3. A **React Native** client with connection token, AM/PM schedules, edit/delete, reminder UX, and verify handshake.  
4. Optional **voice** enrolment APIs and camera streaming for phone-assisted biometrics.  
5. CAD and wiring documentation (BOM, wiring guide, sized gear/pinion) supporting reproducible construction.

---

## 6.4 Limitations

- Open-loop continuous servos without encoders.  
- Reminder reliability when the mobile OS suspends the app.  
- IR and GSM sometimes optional or simulated during lab bring-up.  
- Prototype enclosure / full six-layer print validation may still be incomplete.  
- Not a certified medical device; no clinical trial was conducted within this FYP scope.

---

## 6.5 Future work

1. **Push notifications** (FCM/APNs) so caregivers and patients are alerted when the app is backgrounded.  
2. **Full six-layer print and soak test** — multi-day adherence run with all compartments loaded.  
3. **Closed-loop slot indexing** — magnetic encoder or limit switch per cylinder to eliminate drift.  
4. **Optional cloud sync** — encrypted backup of schedules and adherence for multi-caregiver access.  
5. **Clinical usability study** — elderly users and caregivers; measure adherence lift vs manual organisers.  
6. Hardening: rotated API tokens, TLS on the local API, tamper detection on the enclosure.

---

## 6.6 Final remarks

PillSafe shows that commodity SBC hardware, careful GPIO and power design, and a focused mobile client can deliver identity-gated dispensing with caregiver visibility. Completing the measured test campaign in Chapter 5 and refreshing the abstract to match this architecture leaves the dissertation aligned with the working prototype.

---

## After inserting Chapters 4–6

1. Replace the Abstract using `00_ABSTRACT_AND_FRONT_MATTER.md`.  
2. Fix supervisor spelling (**Bright**).  
3. Regenerate **Table of Contents**, **List of Figures**, and **List of Tables**.  
4. Add new references if you cite MobileFaceNet, Expo, lgpio, SIM800C datasheets, etc., not already in Ch.2.  
5. Delete the duplicated stub “4.1 Introduction” that merely recopied Chapter 3’s opening from the February draft.
