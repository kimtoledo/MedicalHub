# Clinical Encounter

> **Status:** ✅ Done

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

1. **Encounter API** — ✅ Protected list/create/detail/update endpoints enforce tenant, feature, dentist-role, patient, branch-assignment, and appointment ownership boundaries.
2. **Encounter form** — ✅ The Clinic PWA captures the complete clinical visit, supports drafts and confirmed finalization, and renders finalized records read-only.
3. **Encounter list** — ✅ Dentist encounter lists support patient filtering; patient appointment history links to its encounter when one exists.
4. **Appointment linkage** — ✅ The creation route accepts prefilled patient/appointment context and the API validates the appointment against the same clinic, patient, branch, and dentist.
5. **Audit entries** — ✅ Create, draft update, and finalization write separate immutable audit entries without clinical free text in metadata.
