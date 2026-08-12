# Patient Account and Portal

> **Status:** ✅ Done — MVP 3 baseline

---

## What & Why

Patients want to see their upcoming appointments, past invoices, and treatment summaries without calling the clinic. A patient account must be completely separate from clinic staff accounts and must never automatically merge clinical records across clinics without explicit patient consent.

---

## Done looks like

- Patients can sign up for a Dentra.ph patient account using email or mobile number.
- A patient account can be linked to existing patient records at one or more clinics — only with the patient's explicit consent per clinic.
- From their portal, a patient can see: upcoming appointments, appointment history, invoices/receipts (where clinic allows), treatment plan summaries (where clinic policy permits), and profile/contact update requests.
- Patients can request to reschedule or cancel an appointment (subject to clinic policy).
- Patients can submit contact detail updates — the clinic must review and confirm the change.
- A patient account at Clinic A cannot see any records from Clinic B without a separate explicit consent/linking step.
- Clinical records (encounter notes, odontogram, prescriptions) are not exposed in the patient portal without explicit dentist/clinic authorization.

### Delivered

- Added a separate patient-account/session boundary using scrypt-hashed credentials and an HttpOnly patient session cookie.
- Added explicit per-clinic record linking with contact-match validation and consent tracking; no automatic cross-clinic matching occurs.
- Added read-only portal access to linked appointments, invoices, and treatment-plan summaries, plus clinic-reviewed contact/appointment request records.
- Added `/portal` and patient API proxy routes; clinical notes, odontograms, and prescriptions are intentionally excluded.

---

## Out of scope

- Patient editing of clinical records (read-only portal only).
- Cross-clinic appointment booking from within the portal (uses the existing public booking flow instead).
