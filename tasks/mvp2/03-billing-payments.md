# Billing and Payments

> **Status:** 🔜 Future — MVP 2

---

## What & Why

Clinics need to issue invoices for completed treatments and record payments (cash, card, GCash, etc.). Partial payments and refunds must be fully audited. No general-ledger accounting is required in MVP 2.

---

## Done looks like

- Clinic staff can generate an invoice from an encounter or treatment plan.
- Invoice contains: invoice number, patient, encounter/plan reference, line items, discounts (with permission and reason), totals, payment status.
- Payments can be recorded in multiple installments against a single invoice (partial payment).
- Each payment records: amount, method, date, recorded by.
- Remaining balance is always visible.
- Refunds and adjustments are recorded as separate transactions with a reason and an audit entry.
- Invoice list is filterable by patient, date range, and payment status.
- Discount permission is role-gated (e.g. only clinic admin can apply discounts over a threshold).
- Price changes after invoice creation do not alter the existing invoice line amounts.

---

## Out of scope

- Automated payment collection / online patient checkout (MVP 3 — `tasks/mvp3/07-online-payments.md`).
- Full general-ledger accounting.
- Insurance/HMO claims processing.
