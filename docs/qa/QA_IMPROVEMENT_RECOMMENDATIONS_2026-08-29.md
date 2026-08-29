# Dentra.ph — Improvement Recommendations (QA pass, 2026-08-29)

Not defects — the app works as designed in each of these. These are things worth doing next, split into UI, UX, and business-logic buckets, plus a short "as a dentist" section from a domain/clinical-operations point of view. Ordered roughly by impact within each bucket.

**Update (same day):** 8 of the 10 concrete items below are now done — see the "Status" line on each. Two are deliberately left open: §3.1 is a product decision, not a code fix, and needs your call before anyone touches it; §3.4 is a real feature (scheduled notifications), not a quick pass, and belongs with the rest of `mvp2/07-notifications.md`/`08-recall-followup.md`. §2.5 (generic error copy) is left as a standing note rather than "fixed" — it's a consistency audit across the whole app, not a bounded change; I didn't attempt to sweep every form. §4 (dentist/clinical notes) stays as-is: those are things worth *investigating*, not concrete code to write yet.

---

## 1. UI

### 1.1 Stop reloading the whole page after in-flow actions
`window.location.reload()` is used as the "refresh after save" mechanism in at least 7 components, including two that sit in the middle of active clinical/financial work:

- `apps/web/components/app/odontogram/OdontogramChart.tsx` — a full reload after charting a tooth finding mid-exam resets scroll position/zoom on the chart and re-fetches the entire page shell for what should be a small, local state update.
- `apps/web/components/app/encounters/TreatmentPanel.tsx`
- `apps/web/components/app/appointments/QuickServiceCompletion.tsx`
- `apps/web/components/app/patients/HistoryEditor.tsx`
- `apps/web/app/(clinic)/app/(shell)/settings/hmo-payers/HmoPayersClient.tsx`
- `apps/web/app/(clinic)/app/(shell)/billing/hmo-claims/[claimId]/ClaimDetailClient.tsx`
- `apps/web/components/app/AppPageError.tsx` (arguably fine here — it's already an error boundary's "start over" action)

**Why it matters:** on the PH mobile connections this product is explicitly built for, a full document reload after every save is the slowest possible way to reflect a change, and it discards any unrelated in-progress UI state (open filters, scroll position, an unrelated form draft elsewhere on the page). Prefer a local state update from the mutation's response, or `router.refresh()` (Next.js App Router) which re-fetches server data without a full document reload.

**Status:** ✅ Done for all 6 real cases (left `AppPageError.tsx` alone as noted). `OdontogramChart.tsx` and `TreatmentPanel.tsx` now call `router.refresh()` and reset just the form/selection state a full reload used to clear for free. `HistoryEditor.tsx` and `ClaimDetailClient.tsx` do the same (no per-field reset needed — `HistoryEditor` leaves the just-saved values in place, which is correct there). `HmoPayersClient.tsx` went further: it already held `payers` in local state and was discarding it on every save/toggle, so it now merges the mutation's own response into that state directly instead of round-tripping through the server at all — and `toggleActive` picked up error handling it never had (previously any failure reloaded silently with no message). `QuickServiceCompletion.tsx`'s remaining reload (the "stay" path) now matches the pattern already used for its retry fix (bugs doc #3).

### 1.2 Inconsistent loading-spinner feedback on multi-action forms
Beyond the specific bug in `QuickServiceCompletion` (bugs doc #4), audit other two-CTA forms (e.g., anywhere with a primary + "and then do X" secondary action) for the same pattern — a single `saving` boolean driving visual feedback on only one of several buttons that share it.

**Status:** ⏳ Open. The one concrete instance found (`QuickServiceCompletion`) is fixed (bugs doc #4); this entry is a standing note to audit other multi-CTA forms for the same shape, not a bounded change — none surfaced elsewhere in this pass.

### 1.3 Capacity badges only distinguish "at/over cap," not "approaching it"
`SubscriptionClient.tsx` and the Super Admin Capacity tab only flag `atCap` (used ≥ limit). A clinic with 4/5 dentist seats used gets no visual heads-up before they hit the wall mid-workflow (e.g., mid-affiliating a new dentist) and get a `409`. Add an "approaching cap" (e.g. ≥80%) visual state so clinic admins can proactively request more seats instead of discovering the limit via a failed action.

**Status:** ✅ Done for `SubscriptionClient.tsx` (added a `nearCap` state at ≥80% with its own "Approaching cap" label, alongside the existing "At cap"). The Super Admin Capacity tab (`ClinicDetailTabs.tsx`) wasn't touched — same idea would apply there but it's a separate component this pass didn't get to.

---

## 2. UX

### 2.1 The subscription request form asks "what do you need?" without showing what's available
Tied to bugs-doc #2, but broader than the missing `requestedPackageId`: a clinic owner deciding whether to upgrade has no visibility, anywhere in this form, into what packages exist, what they include, or what they cost (`priceDisplay` already exists on the package model — it's just not surfaced here). Right now the only way to compare plans is to already know the public `/pricing` page by heart. At minimum, link out to `/pricing` from this form; ideally, show the packages inline.

**Status:** ✅ Done as part of fixing bugs-doc #2 — the new plan picker shows each package's name, price, and description inline (no `/pricing` link needed since there's no `/pricing` route in this repo today to link to — see the note added to bugs doc #6's area; that's a separate, pre-existing gap this pass didn't create or fix).

### 2.2 Downgrade requests give no consequence preview
A clinic requesting a downgrade has no way to see, before submitting, whether their current usage (dentists/branches/staff) would land them over the target plan's caps. The backend already computes and returns exactly this as `warnings` — but only to Super Admin at approval time (§4.6 in the release notes for the capacity feature). Surface the same warning to the *clinic* at request time ("You currently have 3 dentists; the Clinic tier includes 5 dentists" vs. a hypothetical lower tier) so they aren't surprised later.

**Status:** ✅ Done as part of fixing bugs-doc #2 — selecting a downgrade target now shows an inline warning listing exactly which metrics are already over that plan's caps, computed client-side from data the page already has (no new endpoint needed for this part).

### 2.3 Free-text "reason" is the only structured input for upgrade/downgrade
Once 1.1's package picker exists, "reason" becomes a nice-to-have justification field rather than the only signal Super Admin has to go on. Worth keeping (context is useful for negotiated BRANCHES pricing conversations) but shouldn't remain load-bearing for what plan someone is asking for.

**Status:** ✅ Done — resolved automatically once 2.1's package picker existed; "reason" is now supplementary context, not the only signal.

### 2.4 No optimistic/inline validation on the seat "New total seats needed" input
The number input's `min` is enforced on blur/change via `Math.max(...)`, but a user can still type a value below the minimum and get silently corrected without feedback on *why* their input changed — mildly disorienting. A small inline hint ("must be more than your current 2 seats") reads better than silent clamping.

**Status:** ✅ Done — typing below the floor now shows "Must be more than your current N" in place of the "Currently: N" hint, instead of silently snapping back with no explanation.

### 2.5 Error copy is generic across the app
Several forms fall back to a single generic string ("Unable to submit request.", "Quick service could not be completed.") regardless of *why* it failed (validation vs. permission vs. network vs. server error). Where the API already returns a specific `error.code`/`message` (most do, per the consistent `{success:false,error:{code,message}}` envelope used throughout), prefer surfacing that message over the generic fallback — several components already do this correctly (e.g., `QuickServiceCompletion` does use `payload?.error?.message`), so this is about consistency, not introducing new plumbing.

**Status:** ⏳ Open — standing note, not a bounded fix. The specific components touched this pass (`SubscriptionClient.tsx`, `QuickServiceCompletion.tsx`, `HmoPayersClient.tsx`) all already surface the server's real `error.message` where one exists; a full sweep of every other form in the app for the same pattern wasn't attempted.

---

## 3. Business logic

### 3.1 Unverified clinics are fully listed in the public directory
Confirmed live: `Smile Bright Dental`, seeded as `verificationStatus: "unverified"`, appears in `GET /v1/public/clinics` with its full service list and location, indistinguishable in the payload from a verified one except for that one field. If verification is meant to be a *trust signal only* (badge on an otherwise-listed clinic), this is fine and expected — but if it's meant to *gate* discoverability until a clinic passes moderation (which `mvp3/03-verification-moderation.md` implies is at least a consideration for this product), the directory currently doesn't enforce that. Worth an explicit product decision either way, since right now the behavior is implicit rather than intentional-and-documented.

**Status:** ⏳ Deliberately not touched — this is a product decision (should unverified clinics be publicly discoverable at all?), not a code fix I should make unilaterally. Say which way you want it and I'll implement it.

### 3.2 Seat-cap enforcement has one inconsistent gap (staff role change)
Covered as a defect in the bugs doc (#1) because it's a real race condition, but it's also a broader business-logic point: capacity enforcement is implemented per-call-site rather than as a single reusable "run this inside a locked-clinic transaction" wrapper, which is exactly how one of the four sites ended up missing the lock. Consider factoring `assertClinicCapacity` callers into a shared `withClinicCapacityLock(db, clinicId, fn)` helper so future new enforcement points can't reproduce this gap by omission.

**Status:** ✅ Done — added `lockClinicRow()` to `entitlements/capacity.ts` and switched the three identical-shape call sites (dentist affiliation, staff invite, staff role change) to use it instead of hand-copying the lock query. Branch creation's lock was left inline since it combines the lock with an existence + soft-delete check in one query — a different shape, not the duplicated one — folding it into the shared helper would've meant either an extra query or complicating the helper for one caller; noted in the helper's docstring instead.

### 3.3 `requestedLimit` has no upper bound
`requestBody` in `subscription-operations.ts` validates `requestedLimit` as `z.number().int().min(0)` with no `max`. Low risk today since every approval is manual, but worth a sane ceiling (e.g. a few hundred) purely to stop a typo (`50000` instead of `5`) from silently sailing through Super Admin review as a plausible-looking number, and to keep the audit trail free of nonsense values.

**Status:** ✅ Done — capped at `.max(500)`.

### 3.4 No proactive recall/reminder signal tied to capacity or subscription state
Not a defect — flagged because `tasks/mvp2/07-notifications.md` and `08-recall-followup.md` are the right place for this, and the platform already tracks "clinic is at/over cap" — worth eventually notifying the clinic *before* they hit a wall (a scheduled digest: "you're at 4/5 dentist seats") rather than only reacting inline when they try and fail.

**Status:** ⏳ Not attempted — this is a real feature (a scheduled job, a delivery channel, digest content/cadence decisions), not a quick pass, and belongs alongside the rest of the notifications/recall work already tracked in those two task files rather than being bolted on here.

---

## 4. As a dentist — clinical/operational notes

These are less "bug" and more "things a practicing dentist evaluating this platform for their own clinic would ask about." Several may already be covered by MVP2/3 task files not reviewed in depth this session — listed here for completeness, not as confirmed gaps.

- **Chairside speed matters more than anything else in this list.** The quick-service flow (bug #3) and the full-page-reload pattern (§1.1) both cut directly against the thing a busy general dentist cares about most: not losing the flow of an exam because the software hiccupped. This is the highest-leverage area to harden further, even beyond the specific bugs found.
- **Allergy/medication-interaction awareness on prescriptions** wasn't something I could confirm exists or doesn't from this session's review depth — if a patient's known allergies (recorded on their profile) aren't cross-checked against a new prescription's medicine name at the point of issuance, that's a patient-safety feature worth prioritizing regardless of where it sits on the roadmap.
- **Multi-branch dentist scheduling conflicts**: the capacity/assignment model correctly avoids double-*counting* a dentist across two branches of the same clinic (verified), but double-*booking* — the same dentist getting two overlapping appointment slots at two different branches at the same time — would need to be checked against the booking engine's dentist-availability query, not just the capacity model. Worth a dedicated test scenario: same dentist, two branches, overlapping requested times.
- **Recall/no-show handling**: for a real practice, what happens after a missed appointment (auto-recall scheduling, no-show flag on the patient chart visible to front desk) is a bigger day-to-day pain point than most billing edge cases — tracked in `mvp2/08-recall-followup.md`, worth confirming it covers this specific case before launch.
