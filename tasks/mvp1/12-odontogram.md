# Odontogram

> **Status:** ✅ Done

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

1. **Odontogram data model** — ✅ Existing append-only event, surface, encounter, and self-referencing correction fields cover the MVP requirements; no migration was needed.
2. **Odontogram API** — ✅ Protected history, append, and correction endpoints enforce tenant, feature, dentist, patient, and encounter boundaries.
3. **Tooth chart component** — ✅ Responsive SVG charts render all 32 permanent teeth in FDI upper/lower arches with tooth and surface selection.
4. **Record event form** — ✅ The inline panel records validated condition/procedure vocabulary, surfaces, encounter link, and note.
5. **Event history panel** — ✅ Selecting a tooth reveals its complete reverse-chronological event and correction history.
6. **Current-state projection** — ✅ The API resolves superseded corrections and latest tooth/surface states; the SVG reflects condition/procedure/missing status without deleting history.
