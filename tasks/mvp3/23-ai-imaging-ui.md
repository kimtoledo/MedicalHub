# AI Imaging and Oral Health Score UI

> **Status:** ✅ Done
> **Priority:** P2

## What & Why

Expose the gated imaging-analysis records and oral-health score snapshots to dentists through clinical workflows.

## Done looks like

- Eligible radiographs show an analysis action only to authorized dentists with `ai.imaging` entitlement.
- Findings are labeled advisory and require explicit dentist confirmation.
- Annotation overlay is added only after provider evaluation and clinical validation.
- Patient profile shows score, timestamp, contributing categories, and trend explanation without overstating clinical certainty.
- Provider/model metadata is safe; no pixels, prompts, or clinical text enter logs.
- Loading, unsupported, provider-failure, confirmation, responsive, and test states.

## Delivered

- Added an "AI Imaging" tab on the patient record page (`/app/patients/[patientId]`), visible only to `clinic_owner`/`clinic_admin`/`dentist` roles with the `ai.imaging` entitlement enabled, matching the backend's own role/entitlement gate exactly.
- The tab lists the patient's uploaded radiographs with a "Run analysis" action, shows the current oral health score with a trend indicator against the previous score plus a compact recent-scores history, and lists analysis history with queued/completed/failed states and failure reasons.
- Because the backend's `rules-baseline` adapter only computes a score from odontogram/treatment/visit counts and never populates `findings` or does real image interpretation, the UI says so explicitly rather than implying radiograph content is being read — no annotation overlay was built, matching the task's own gate on provider evaluation.
- Completed analyses require an explicit "Mark reviewed" action, restricted to the dentist role in the UI (backend technically permits clinic admins/owners too, but confirmation is scoped tighter here to match "must be confirmed by the dentist").
- No image pixels, prompts, or clinical text pass through this UI or its API calls — only file IDs, scores, and timestamps.
- Added 9 new API tests covering role/entitlement authorization, the non-radiograph-file rejection, list/confirm/score endpoints, and the not-ready confirmation guard.
- Verified 333 passing API tests (9 new), 5 passing web tests, repository-wide TypeScript checks, production web/API builds, and clean diff validation.

## Dependencies

- Provider evaluation and validation gates in `mvp3/12-ai-imaging.md` (still required before this UI can show real radiograph findings or an annotation overlay; today it only surfaces the deterministic score).
