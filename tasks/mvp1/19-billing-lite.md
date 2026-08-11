# Billing Lite — Services, Invoices & Receipts

> **Status:** ✅ Done — MVP 1 (Increment 5)
> **Proposal alignment:** Executive Summary §3-C — Billing & Receipt Module
> **Project task:** #22

---

## What & Why

The executive summary places billing in the product MVP. Our original plan deferred it to MVP 2. This task brings a **lite version** into MVP 1: service pricing, single-payment invoicing, and a printable/downloadable receipt — enough for a clinic to actually collect money from day one. Full billing (partial payments, installments, refunds, discount controls) remains in MVP 2 (`tasks/mvp2/03-billing-payments.md`).

---

## Done looks like

- Each service in the clinic catalog has a PHP price field editable by clinic admin.
- After an encounter is finalized, staff can generate an invoice: patient, encounter reference, line items from treatment records, total amount.
- Invoice is assigned a reference number in `{PREFIX}INV{NNNNNN}` format (e.g. `SBDINV000001`).
- Staff records one payment: amount, method (Cash / GCash / Card), date. Invoice status flips to `paid`.
- Invoice/receipt is printable as a formatted PDF from the browser (clinic name, address, logo placeholder, itemized services, total, payment method and date).
- Invoice list is filterable by patient and date range.
- Clinic dashboard shows today's total collected amount and invoice count.
- All invoice creation and payment events are written to `audit_events`.

---

## Out of scope

- Partial payments and installments (MVP 2).
- Refunds, adjustments, discount controls (MVP 2).
- Online patient-side payment (MVP 3).
- HMO/insurance claim linkage (MVP 2 — `tasks/mvp2/15-hmo-insurance.md`).

---

## Steps

1. **Schema** — Add `invoices` and `invoice_payments` tables; add `price_php` column to `services`; generate and apply migration.
2. **Service pricing UI** — Clinic admin can set/edit price per service in the service catalog screen.
3. **Invoice generation** — "Generate Invoice" action on a finalized encounter: auto-populates line items from treatment records, calculates total, assigns reference number.
4. **Payment recording** — Staff selects method, enters amount, confirms — invoice status updates to `paid`.
5. **PDF receipt** — Browser-printable receipt layout with all required fields; "Download / Print" button.
6. **Dashboard earnings tile** — Today's earnings tile reading live from `invoice_payments`.
7. **Audit** — Write audit entries for invoice creation and payment recording.

## Relevant files

- `packages/db/src/schema/appointments.ts` — services table (add `price_php`)
- `packages/db/src/schema/encounters.ts` — encounters + treatment_records (invoice source)
- `packages/shared/src/enums.ts` — add `InvoiceStatus`, `PaymentMethod` enums
- `tasks/mvp2/02-service-catalog-pricing.md` — full pricing catalog (MVP 2 successor)
- `tasks/mvp2/03-billing-payments.md` — full billing (MVP 2 successor)
