# Odontogram

> **Status:** 🔲 Queued — no project task yet

---

## What & Why

The adult tooth chart lets dentists record conditions and procedures per tooth and surface, creating a visual record of a patient's dental health over time. Each tooth event is immutable — corrections append a new event rather than overwriting, preserving the full history.

---

## Done looks like

- The odontogram page (`/app/dentist/odontogram`) shows an interactive adult tooth chart (32 teeth, upper and lower arches).
- Dentist can select a tooth, choose surfaces where applicable, and record a condition or procedure.
- Each odontogram entry stores: tooth number, surface(s), condition/procedure code, free-text note, dentist, date, encounter link.
- The chart shows a "current state" projection — the latest condition for each tooth is visible at a glance.
- The full event history per tooth is accessible by expanding a tooth.
- Corrections/amendments append a new event with a reason; the original event is preserved.
- Odontogram history survives updates — no delete operation erases past entries.

---

## Out of scope

- Pediatric (primary) tooth chart (stretch or early MVP 2).
- Radiograph overlays (MVP 2).
- Printable odontogram report (MVP 2).

---

## Steps

1. **Odontogram data model** — confirm the schema covers all required fields; add a migration if any are missing.
2. **Odontogram API** — `GET /v1/clinic/patients/[id]/odontogram` (event history), `POST /v1/clinic/patients/[id]/odontogram` (add event), `POST /v1/clinic/patients/[id]/odontogram/[eventId]/correct` (correction).
3. **Tooth chart component** — build an SVG or canvas-based 32-tooth chart; support tooth selection and surface selection.
4. **Record event form** — slide-over or inline form to select condition/procedure and add a note.
5. **Event history panel** — expandable per-tooth history list showing all past events.
6. **Current-state projection** — derive current tooth states from event history and render them on the chart.
