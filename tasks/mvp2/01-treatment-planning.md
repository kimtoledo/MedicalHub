# Treatment Planning

> **Status:** 🔜 Future — MVP 2

---

## What & Why

Dentists need to propose future treatment plans to patients before work begins. A treatment plan is a list of proposed procedures with estimated fees, priority, and sequence. When a plan item is completed, it links back to the actual treatment record.

---

## Done looks like

- Dentist can create a treatment plan from a patient's profile.
- A plan has a name/title and one or more plan items.
- Each plan item: procedure (from service catalog), tooth/area, estimated fee, priority, sequence, status.
- Plan item statuses: proposed → accepted → scheduled → in-progress → completed / cancelled.
- Completed plan items link to the actual treatment record that performed the work.
- Clinic admin can generate a printable/shareable treatment plan summary (PDF) once approved by the dentist.
- Treatment plans are tenant-scoped and generate audit entries on create/update/status change.

---

## Out of scope

- Patient e-signature on treatment plans (can be added in a later iteration).
- Online payment against a treatment plan (MVP 3).
