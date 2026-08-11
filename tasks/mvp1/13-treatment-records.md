# Treatment Records

> **Status:** ✅ Done

---

## What & Why

Treatment records document procedures that have already been performed. They are distinct from treatment plans (MVP 2) which track proposed future work. A treatment record links back to the encounter and the specific tooth/area where work was done.

---

## Done looks like

- Within an encounter, a dentist can add one or more treatment records.
- Each treatment record captures: procedure/service (from the clinic's service catalog), tooth/area reference, encounter link, dentist, date, notes.
- Treatment records appear in the patient's clinical history alongside the encounter.
- Treatment records are tenant-scoped and generate an audit entry on create.

---

## Out of scope

- Treatment planning (proposed future treatments — MVP 2 — `tasks/mvp2/01-treatment-planning.md`).
- Proposed estimates, discounts, partial-payment allocation, and other full-billing controls (MVP 2 — `tasks/mvp2/03-billing-payments.md`); MVP 1 invoices already snapshot performed treatments as line items.

---

## Steps

1. **Treatment record API** — ✅ Protected create, patient-history, and active service-catalog endpoints enforce tenant, feature, dentist, encounter, patient, and service boundaries.
2. **Treatment form** — ✅ Draft encounters include an inline service/tooth/date/notes form; finalized encounters and their treatments remain read-only.
3. **Patient treatment history** — ✅ Patient profiles and encounter details list performed services, tooth/area, dentist, date, notes, and encounter links.
