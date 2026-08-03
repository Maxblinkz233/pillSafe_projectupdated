# PillSafe FYP Report — Word Paste Pack

Implementation of the *Report vs Implementation — Gap Analysis* plan: Word-ready text that patches Chapter 3 and supplies Chapters 4–6 plus Abstract updates.

## Files

| Order | File | Action in Word |
|------:|------|----------------|
| 0 | [00_ABSTRACT_AND_FRONT_MATTER.md](00_ABSTRACT_AND_FRONT_MATTER.md) | Replace Abstract; fix “Bright”; extend LoF |
| 1 | [03_CHAPTER3_AMENDMENTS.md](03_CHAPTER3_AMENDMENTS.md) | Amend Ch.3 in place (accuracy pass) |
| 2 | [04_CHAPTER4_IMPLEMENTATION.md](04_CHAPTER4_IMPLEMENTATION.md) | Replace stub Ch.4 |
| 3 | [05_CHAPTER5_TESTING.md](05_CHAPTER5_TESTING.md) | Insert Ch.5; fill measured cells |
| 4 | [06_CHAPTER6_CONCLUSION.md](06_CHAPTER6_CONCLUSION.md) | Insert Ch.6 |

## Source of truth in the repo

- `hardware/config.yaml` — pins, continuous servo, buzzer, SIM800C, grace  
- `hardware/docs/WIRING_GUIDE.md`, `bom.csv` — construction  
- `hardware/api/routes.py` — API surface  
- `src/`, `pillsafe-expo/` — React Native / Expo clients  
- `hardware/cad/` — sized blend / gear–pinion work  

## Writing order (done in this pack)

1. Ch.3 accuracy amendments  
2. Ch.4 implementation narrative  
3. Ch.5 testing tables (ready for your trial numbers)  
4. Ch.6 conclusion + Abstract refresh  
