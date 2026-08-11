# Prescription Builder (e-Rx)

> **Status:** ✅ Done — MVP 1 (Increment 5), post-merge acceptance verified August 12, 2026
> **Proposal alignment:** Executive Summary §3-E — Prescription Builder
> **Project task:** #23

---

## What & Why

Dentists issue prescriptions after nearly every consultation — it is daily-use functionality. The executive summary includes it in the product MVP. This task promotes the prescription builder from MVP 2 into MVP 1. Scope is identical to the MVP 2 version; the only change is timing.

---

## Done looks like

- From within a **finalized** encounter, the dentist can open a "New Prescription" form.
- Prescription items are repeatable rows: medicine name, dosage, frequency, duration, special instructions.
- The dentist's PRC license number is pre-filled from their profile (editable per prescription).
- Clinic name, address, and logo (if set) appear in the prescription header.
- Once issued, the prescription is **immutable** — no editing after issuance.
- To amend: dentist clicks "Amend"; a new prescription pre-fills with the original content and links back to the original via `amended_from`.
- Prescription is printable / downloadable as a formatted PDF (standard PH prescription layout).
- "Prescriptions" tab on the patient profile lists all prescriptions, newest-first, with encounter link.
- Each issuance writes an audit entry (`prescription.issued`).

---

## Out of scope

- e-Prescription API integration with a pharmacy network (future).
- Drug interaction checker (future).
- Dentist digital signature upload (deferred — addable without schema changes).

---

## Steps

1. ✅ **Schema** — migration `0009_prescriptions.sql` adds tenant-scoped prescriptions, repeatable medicine items, immutable snapshots, and the `amended_from` self-reference.
2. ✅ **Prescription form** — finalized encounter details open a responsive slide-over with the encounter preselected, repeatable medicine rows, and an editable PRC number prefilled from the authenticated dentist profile.
3. ✅ **Immutability enforcement** — no update route exists for an issued record; the protected dentist-only Amend action creates a new issued snapshot linked to the original while preserving both records.
4. ✅ **PDF output** — prescription detail renders a standard printable layout with clinic identity/logo/address, patient/date, Rx items, dentist/PRC details, and signature line for browser Print / Save as PDF.
5. ✅ **Patient timeline** — the entitlement-aware Prescriptions tab lists the patient's prescriptions newest-first with amendment state, encounter navigation, and View / Print links.
6. ✅ **Audit** — every original or amended issuance appends a tenant-scoped `prescription.issued` audit entry in the same transaction.

## Relevant files

- `packages/db/src/schema/encounters.ts` — prescription linked to encounter
- `packages/db/src/schema/dentists.ts` — PRC license number pre-fill
- `packages/shared/src/enums.ts` — add `PrescriptionStatus` enum
- `tasks/mvp2/04-prescriptions.md` — superseded for MVP 1 by this task
