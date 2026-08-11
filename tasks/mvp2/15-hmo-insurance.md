# HMO / Insurance Claims Module

> **Status:** 🔜 Future — MVP 2
> **Proposal alignment:** Executive Summary §4-F — HMO/Insurance Module (Phase 2)
> **Project task:** #27

---

## What & Why

A significant portion of Philippine dental patients use HMO coverage (Maxicare, Intellicare, PhilCare, Medicard, etc.). Clinics need to document HMO coverage, prepare reimbursement claim packages, and track claim status. This is a **documentation and workflow module** — actual API integration with HMO portals is a separate per-provider future task.

---

## Done looks like

- **HMO payer catalog** — Clinic admin can configure which HMOs the clinic is accredited with: payer name, accreditation number, contact person.
- **Patient HMO profile** — Patient record stores HMO membership: provider, card number, effective dates, coverage type (dental, medical, combined).
- **Service coverage tagging** — Clinic admin can flag which services are HMO-reimbursable and at what standard rate.
- **Claim document generation** — After encounter finalization, staff can generate a claim package PDF: patient details, HMO card info, LOA/approval code field, services rendered with rates, attending dentist info, encounter notes excerpt.
- **Claim tracker** — List of all claims with status (prepared / submitted / approved / rejected / paid). Staff updates status manually.
- **Billing integration** — When a claim is marked `paid`, the linked invoice's payment is auto-updated to reflect the HMO reimbursement amount.
- HMO module is feature-gated (`FeatureKey.HMO_CLAIMS` — to be added to shared enums).
- All claim status changes are written to `audit_events`.

---

## Out of scope

- Direct API integration with HMO provider portals (each uses a different system; future per-provider task).
- PhilHealth claims (different regulatory framework; separate future task).
- Automated LOA request flow.

---

## Steps

1. **FeatureKey** — Add `HMO_CLAIMS` to `@dentra/shared` FeatureKey catalog.
2. **Schema** — Add `hmo_payers`, `patient_hmo_memberships`, `hmo_claims` tables; generate migration.
3. **Payer management** — Clinic admin CRUD screen for HMO payers.
4. **Patient HMO tab** — HMO membership section in patient profile form.
5. **Service coverage flags** — Extend service catalog to tag HMO-covered services and rates.
6. **Claim PDF** — Structured claim document template with all required fields, downloadable/printable.
7. **Claim tracker** — List view with status filter and manual status update controls.
8. **Billing linkage** — Hook `claim.paid` to update the linked invoice payment record.

## Relevant files

- `packages/db/src/schema/patients.ts`
- `tasks/mvp1/19-billing-lite.md`
- `tasks/mvp2/03-billing-payments.md`
- `packages/shared/src/enums.ts`
