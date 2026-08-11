# Prescriptions

> **Status:** 🔜 Future — MVP 2
> **Note:** The prescription builder (e-Rx) was promoted to MVP 1 — see `tasks/mvp1/20-prescriptions-erx.md`. This task remains as a reference and may be merged into the MVP 1 task or expanded with drug-interaction and pharmacy-integration features post-launch.

---

## What & Why

Dentists need to issue prescriptions as part of a clinical encounter. The issued prescription must be an immutable snapshot — if the dentist amends it, a new prescription is created rather than overwriting the original.

---

## Done looks like

- Dentist can create a prescription from within an encounter.
- Prescription contains: prescription items (medicine name, dose, frequency, duration, instructions), dentist attribution, date, clinic header.
- Each issued prescription is stored as an immutable snapshot — no editing after issuance; amendments create a new prescription with a reference to the original.
- Prescription can be printed or exported as a formatted PDF.
- Prescription list is accessible from the patient profile.

---

## Out of scope

- e-Prescription integration with a pharmacy (future integration).
- Drug interaction checking (future).
