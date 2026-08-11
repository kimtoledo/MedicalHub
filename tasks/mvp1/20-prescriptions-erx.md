# Prescription Builder (e-Rx)

> **Status:** 🔲 Queued — MVP 1 (Increment 5)
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

1. **Schema** — Add `prescriptions` and `prescription_items` tables with `amended_from` self-ref FK; generate and apply migration.
2. **Prescription form** — Slide-over/drawer accessible from a finalized encounter; repeatable medicine row component.
3. **Immutability enforcement** — API rejects any update to an issued prescription; "Amend" action creates a new draft linked to the original.
4. **PDF output** — Printable prescription layout component: clinic header, patient name, date, Rx items, dentist name + PRC number, signature line.
5. **Patient timeline** — Prescriptions tab on patient profile.
6. **Audit** — Write `prescription.issued` audit entry on every save.

## Relevant files

- `packages/db/src/schema/encounters.ts` — prescription linked to encounter
- `packages/db/src/schema/dentists.ts` — PRC license number pre-fill
- `packages/shared/src/enums.ts` — add `PrescriptionStatus` enum
- `tasks/mvp2/04-prescriptions.md` — superseded for MVP 1 by this task
