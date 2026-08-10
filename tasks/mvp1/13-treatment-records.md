# Treatment Records

> **Status:** 🔲 Queued — no project task yet

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
- Fee/billing linkage to treatment records (MVP 2 — `tasks/mvp2/03-billing-payments.md`).

---

## Steps

1. **Treatment record API** — `POST /v1/clinic/encounters/[id]/treatments`, `GET /v1/clinic/patients/[id]/treatments`.
2. **Treatment form** — inline add-treatment form within the encounter editor; pull procedure options from the clinic's service catalog.
3. **Patient treatment history** — list all treatments for a patient in their clinical profile tab.
