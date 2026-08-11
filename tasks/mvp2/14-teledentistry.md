# Tele-Dentistry

> **Status:** ✅ Done — MVP 2
> **Proposal alignment:** Executive Summary §4-E — Tele-Dentistry (Phase 2)
> **Project task:** #26

---

## What & Why

Tele-dentistry allows dentists to conduct remote follow-ups and assess patient-submitted photos for initial evaluation, reducing unnecessary clinic visits and extending reach beyond Metro Manila. The executive summary identifies this as a Phase 2 feature.

---

## Done looks like

- **Remote assessment request** — Patients can submit a "photo consult" request from the patient portal (MVP 3) or a shareable link: 1–5 photos + a brief complaint description.
- **Dentist review queue** — A "Remote Consults" section in the dentist app shows pending requests with photo thumbnails, complaint text, and patient name.
- **Assessment response** — Dentist writes assessment notes, recommends next steps (in-clinic visit, prescription, monitoring), and marks the request as reviewed.
- **Follow-up booking** — From the assessment screen, dentist can create a follow-up appointment pre-filled with the remote complaint.
- **Patient notification** — Patient receives an email when their assessment is reviewed.
- All submitted files are stored in private Object Storage (same pipeline as `tasks/mvp1/21-file-uploads-clinical.md`).
- Tele-dentistry is feature-gated (`FeatureKey.TELEDENTISTRY` — to be added to shared enums).

---

## Out of scope

- Live video consultation (requires WebRTC infrastructure; deferred to Phase 3 if validated).
- Real-time chat between patient and dentist.
- Integration with PDA tele-health certification requirements.

---

## Steps

1. **FeatureKey** — Add `TELEDENTISTRY` to `@dentra/shared` FeatureKey catalog and package feature mappings.
2. **Schema** — Add `remote_assessments` table (patient_id, clinic_id, photos[], complaint, status, dentist_notes, reviewed_by, reviewed_at, timestamps); generate migration.
3. **Patient submission** — Patient portal page or shareable link for submitting a request with photo uploads (reuses file upload infrastructure).
4. **Dentist review queue** — App page listing remote assessments with status filter and photo viewer.
5. **Assessment response form** — Notes field, next-step recommendation, "Schedule follow-up" shortcut.
6. **Email notification** — Patient email on assessment reviewed.

## Relevant files

- `tasks/mvp1/21-file-uploads-clinical.md`
- `tasks/mvp3/01-patient-portal.md`
- `tasks/mvp2/13-ai-clinical-assistance.md`
- `packages/shared/src/enums.ts`
