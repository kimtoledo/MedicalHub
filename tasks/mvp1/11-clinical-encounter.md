# Clinical Encounter

> **Status:** 🔲 Queued — no project task yet

---

## What & Why

Every patient visit generates an encounter record documenting what happened clinically. Dentists create encounters from an appointment or directly from the patient profile. Encounters are the spine of the clinical record and link to treatments, odontogram events, and prescriptions (MVP 2).

---

## Done looks like

- Dentists can create a new encounter from an appointment's check-in view or from the patient profile.
- Encounter form captures: branch, patient, dentist, appointment link, date, chief complaint, examination/findings, assessment/diagnosis, procedures/treatments, recommendations, notes.
- An encounter can be saved as draft or finalized. Once finalized, the record is read-only — corrections generate a new audit entry rather than overwriting the original.
- Encounter list is accessible from the patient profile and from `/app/dentist/encounters`.
- Encounters are scoped to the clinic — a dentist cannot read encounters from a different clinic even if they are affiliated with both.
- All encounter create/update/finalize actions generate an audit entry.

---

## Out of scope

- e-Signature and formal clinical signing workflow (can be added post-MVP 1 if needed).
- Prescription generation (MVP 2 — `tasks/mvp2/04-prescriptions.md`).
- Clinical file/photo attachments (MVP 2 — `tasks/mvp2/05-clinical-files-media.md`).

---

## Steps

1. **Encounter API** — `POST /v1/clinic/encounters`, `GET /v1/clinic/encounters/[id]`, `PATCH /v1/clinic/encounters/[id]` with tenant + role checks.
2. **Encounter form** — build the encounter creation/edit form in the Clinic PWA; include draft/finalize states.
3. **Encounter list** — show encounters in the patient profile and in `/app/dentist/encounters`.
4. **Appointment linkage** — auto-link an encounter to its originating appointment when created from the appointment view.
5. **Audit entries** — write audit rows on encounter create, update, and finalize.
