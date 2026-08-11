# AI Clinical Assistance

> **Status:** 🔜 Future — MVP 2
> **Proposal alignment:** Executive Summary §4-D — AI Assistance (Phase 2)
> **Project task:** #25

---

## What & Why

AI is identified in the executive summary as a **powerful differentiator** against competitors like Tabang.AI and SeriousMD. AI assistance reduces dentist documentation time and surfaces treatment insights. This module is scoped for MVP 2 after the core clinical workflow (encounters, treatment records, odontogram) is stable and battle-tested. All AI outputs require explicit dentist confirmation before saving — AI never acts autonomously.

---

## Done looks like

- **AI note auto-fill** — "Suggest Notes" button on an open encounter; AI drafts examination, assessment, or recommendation text based on chief complaint, selected services, and treatment records. Dentist reviews and edits before saving. AI draft is clearly labeled "AI-suggested — review before saving."
- **Voice-to-text** — Microphone icon on any encounter text field; speech is transcribed in real-time and inserted into the field. Works on mobile (PWA) and desktop Chrome/Safari.
- **AI follow-up suggestion** — After an encounter is finalized, AI recommends a recall interval based on treatment type (e.g. "Prophylaxis → suggest 6-month recall"). Dentist accepts, adjusts, or dismisses. Integrates with the recall system (`tasks/mvp2/08-recall-followup.md`).
- **AI treatment sequence suggestion** — From the current odontogram state, AI proposes a prioritized treatment order displayed as a review panel alongside the treatment planning screen. Advisory only.
- All AI interactions are logged: timestamp, encounter ID, feature used, token count — **no PHI in logs**.

---

## Out of scope

- AI radiograph/image interpretation (MVP 3 — `tasks/mvp3/12-ai-imaging.md`).
- Autonomous AI actions (AI cannot save, submit, or send anything without dentist action).
- AI-generated prescriptions (AI may suggest text; dentist creates the prescription manually).

---

## Steps

1. **AI provider abstraction** — Integrate an LLM API (e.g. OpenAI GPT-4o) behind a provider interface so the underlying model can be swapped without touching feature code.
2. **Note auto-fill** — Prompt construction from encounter context; streaming response into the field; "Accept / Discard" UI.
3. **Voice-to-text** — Web Speech API (browser-native) as primary; cloud STT fallback for unsupported browsers; microphone permission handling.
4. **Recall suggestion hook** — Post-finalize trigger that calls AI and surfaces a suggestion banner; hooks into the recall system.
5. **Treatment sequence panel** — Read odontogram state, generate suggestion list, surface as a review panel alongside the treatment planning screen.
6. **AI audit log** — Dedicated log rows for AI call metadata (no PHI).

## Relevant files

- `tasks/mvp1/11-clinical-encounter.md`
- `tasks/mvp1/12-odontogram.md`
- `tasks/mvp2/01-treatment-planning.md`
- `tasks/mvp2/08-recall-followup.md`
- `packages/shared/src/enums.ts`
