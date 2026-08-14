# Pediatric Odontogram + Per-Surface/Icon Visual Indicators

> **Status:** ✅ Done

---

## What & Why

`12-odontogram.md` (MVP 1) shipped an adult-only tooth chart and explicitly deferred the pediatric (primary) tooth chart to "stretch or early MVP 2." This task closes that gap and upgrades the chart's visual language: today a tooth is a single whole-tooth color with one status dot, so an extraction, a root canal, and an implant all look identical (violet). Dentists need to tell conditions/procedures apart at a glance, and to chart primary teeth for pediatric patients.

---

## Done looks like

- A dentition toggle ("Adult" / "Pediatric") on the odontogram page switches between the 32-tooth permanent chart and a 20-tooth primary (deciduous) chart, using standard FDI notation (51-55/61-65/71-75/81-85).
- Each tooth renders 5 independently colored regions (Buccal/Facial, Lingual, Mesial, Distal, Occlusal/Incisal) instead of one whole-tooth fill, reflecting the latest event recorded against each specific surface.
- Every condition/procedure code (fillings, extraction, root canal, implant, crown, bridge, scaling, bleaching, etc.) has a distinct icon marker, shown both on the whole-tooth marker and inside each individual surface region that has its own recorded event — not just a same-colored dot.
- Tooth-level notes continue to work unchanged (already implemented in MVP 1 — no change needed).
- The API accepts deciduous tooth numbers; the tooth/surface/condition/procedure vocabulary is defined once in `@dentra/shared` and consumed by both the API route and the chart component (previously duplicated in both places).

---

## Out of scope

- Anatomically precise per-surface geometry (this uses a simplified 5-region "cross" layout, not a clinically exact tooth outline).
- Radiograph overlays, printable odontogram report (still MVP 2/3 as noted in `12-odontogram.md`).

---

## Steps

1. **Shared vocabulary** — ✅ `packages/shared/src/odontogram.ts` exports `PERMANENT_TEETH_UPPER/LOWER`, `DECIDUOUS_TEETH_UPPER/LOWER`, `ALL_TOOTH_NUMBERS`, `TOOTH_SURFACES`, `TOOTH_CONDITIONS`, `TOOTH_PROCEDURES`.
2. **API validation** — ✅ `apps/api/src/routes/clinic-odontogram.ts` validates `toothNumber` against `ALL_TOOTH_NUMBERS` (permanent + deciduous) instead of an adult-only inline enum.
3. **Web dependency** — ✅ `apps/web` now depends on `@dentra/shared` (previously API-only) so the chart imports the same vocabulary.
4. **Dentition toggle + pediatric arches** — ✅ `OdontogramChart.tsx` renders the correct tooth set per toggle and resets tooth selection on switch.
5. **Per-surface visual indicators** — ✅ Each tooth renders 5 regions colored from the latest event touching that surface, falling back to the whole-tooth color when an event has no surfaces recorded.
6. **Condition/procedure icons** — ✅ A `lucide-react` icon distinguishes each condition/procedure code, rendered on both the whole-tooth marker and per-surface region badges.
7. **No DB migration** — ✅ `toothNumber` was already a free varchar; deciduous codes required no schema change.
8. **Live verification** — ✅ Server-side smoke test against the running dev servers (real dentist login, real patient, real recorded events) confirmed the toggle, per-surface coloring, and per-region icons all render correctly; also surfaced and fixed a webpack module-resolution bug for `@dentra/shared` in `apps/web` (`transpilePackages` + `resolve.extensionAlias` in `next.config.js`).
