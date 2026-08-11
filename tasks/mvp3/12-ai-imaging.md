# AI Imaging & Diagnostics

> **Status:** 🔜 Future — MVP 3
> **Proposal alignment:** Executive Summary §5 — Phase 3 (AI imaging interpretation, oral health scoring, AI diagnostics assistant)

---

## What & Why

Phase 3 of the executive summary calls for AI-powered radiograph interpretation, oral health scoring, and an AI diagnostics assistant. These capabilities require mature clinical data (odontogram history, treatment records, encounter notes) and proven AI infrastructure from the MVP 2 AI module (`tasks/mvp2/13-ai-clinical-assistance.md`). They are scoped for MVP 3 when the platform has enough real-world clinical data to validate model accuracy.

---

## Done looks like

- **AI radiograph analysis** — When a dental X-ray is uploaded to an encounter, an AI model highlights suspected caries, bone loss, or other findings as an overlay. Findings are advisory and must be confirmed by the dentist before being added to the encounter record.
- **Oral health scoring** — Based on a patient's odontogram history, treatment records, and encounter frequency, the system generates a simple oral health score (e.g. 0–100). The score is visible on the patient profile and trends over time.
- **AI diagnostics assistant** — In an open encounter, the dentist can describe a symptom or paste a clinical finding; the AI returns a differential list ranked by likelihood, with supporting rationale. All output is advisory; the dentist selects or ignores.
- All AI imaging calls are logged (no PHI in logs).
- AI imaging is feature-gated (`FeatureKey.AI_IMAGING`).

---

## Out of scope

- Autonomous diagnosis or treatment decisions.
- Integration with PACS or third-party radiology systems (future).
- Video analysis.

---

## Steps

1. **FeatureKey** — Add `AI_IMAGING` to shared enums.
2. **Imaging AI integration** — Evaluate and integrate a dental AI imaging provider (e.g. Denti.AI, Pearl, or a general vision model) via an abstraction layer.
3. **Radiograph annotation overlay** — UI component that displays AI-generated finding annotations on top of an uploaded X-ray image.
4. **Oral health score** — Score computation pipeline that reads from odontogram, encounters, and treatment records; display on patient profile.
5. **Diagnostics assistant** — Chat-like AI panel within an open encounter for symptom-to-differential queries.
6. **AI imaging audit log** — Log rows for each AI imaging call (model, file ID, finding count — no clinical text or PHI).

## Relevant files

- `tasks/mvp1/21-file-uploads-clinical.md`
- `tasks/mvp1/12-odontogram.md`
- `tasks/mvp2/13-ai-clinical-assistance.md`
- `packages/shared/src/enums.ts`
