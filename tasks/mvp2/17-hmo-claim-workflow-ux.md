# HMO Claim Workflow UX

> **Status:** 🔲 Queued
> **Priority:** P1

## What & Why

Replace raw Patient, Invoice, and Encounter UUID fields on `/app/billing/hmo-claims/new` with a guided, tenant-safe claim workflow.

## Done looks like

- Search/select patient by patient number or name.
- Show only active HMO memberships belonging to the selected patient and clinic.
- Select eligible encounters/invoices from tenant-scoped choices; prefill from patient/invoice pages.
- Validate payer, membership, encounter, invoice, and amount relationships before submission.
- Display coverage and invoice summaries without exposing unrelated patient records.
- Preserve backend transactional and cross-tenant guards.
- Responsive step flow with loading, empty, validation, conflict, and success states plus tests.

## Out of scope

- Automated HMO-provider submission APIs.
