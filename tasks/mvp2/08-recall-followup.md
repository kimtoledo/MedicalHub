# Recall and Follow-up

> **Status:** 🔜 Future — MVP 2

---

## What & Why

Clinics need to proactively recall patients who are due for a check-up or a follow-up procedure. This drives patient retention and preventive care without requiring patients to remember to rebook.

---

## Done looks like

- Clinic admin can define recall rules per service/procedure: e.g. "Prophylaxis → recall after 6 months".
- When a treatment record is completed, a recall due date is calculated and stored against the patient.
- The recall queue lists all patients whose recall date is approaching or overdue: patient name, last service, due date, last contact date.
- Clinic staff can send a recall reminder (triggers a notification from task `07`), mark the patient as contacted, or dismiss the recall.
- Clinic staff can manually override a recall due date.
- A follow-up appointment can be booked directly from the recall queue entry.

---

## Out of scope

- Automated recall sends without human review (can be a configurable setting in a later iteration).
- SMS provider integration in MVP 2 (see task `07`).
