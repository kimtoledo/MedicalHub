# Dentra.ph — Bugs Found (QA pass, 2026-08-29)

Six issues found this session, ranked by severity. All were confirmed by reading the actual implementation (file:line cited) rather than inferred from behavior alone; #1 and #3 are race/failure-path bugs that won't show up in a normal single-user click-through or in the existing test suite's happy-path assertions, which is why they survived to `main` despite 537 passing tests.

**Update (same day):** all six are now fixed. See the "Fix applied" note at the top of each entry for what changed, and [`QA_TEST_REPORT_2026-08-29.md`](QA_TEST_REPORT_2026-08-29.md) §6 for how each fix was verified (regression tests added where the existing suite had no coverage, plus live re-probes against the running dev servers for #1 and #2). Full suite after fixes: **542/542 tests passing** (537 original + 5 new), repo-wide typecheck clean.

---

## #1 — Staff role-change capacity check has no row lock — seat cap can be raced (High / Correctness)

**File:** [`apps/api/src/clinic/staff-service.ts`](../../apps/api/src/clinic/staff-service.ts) — `update()`, around line 289–331
**Category:** Concurrency / business-logic integrity
**Status:** ✅ Fixed — added the same `tx.select({ id: clinics.id })...for('update')` lock as the top statement in `update()`'s transaction. Added 3 regression tests to `clinic-staff-service.test.ts`: promotion-under-cap succeeds, promotion-at-cap is rejected, and — the one that actually guards this specific bug — an assertion that the clinic-lock select is the *first* select the transaction makes. Confirmed that last test fails (wrong data flows into the capacity check) when the lock line is removed, then confirmed it passes again with the fix restored.

### What's wrong
Every other capacity-enforcement call site takes an explicit `SELECT ... FOR UPDATE` lock on the clinic row *before* counting usage, specifically so two concurrent requests serialize instead of both reading the same (stale) count:

- Branch creation — `admin/clinics-service.ts:1103` locks `clinics` before `assertClinicCapacity(...)`.
- Dentist-clinic affiliation — `admin/dentists-service.ts:525` locks `clinics` before `assertClinicCapacity(...)`.
- Staff **invite** — `clinic/staff-service.ts:224` locks `clinics` before `assertClinicCapacity(...)`.

Staff **role change** (`update()`, the fourth enforcement site the feature's own task doc calls out by name: *"Staff role change that increases a role's headcount... closes a side door around seat caps"*) does **not**. It opens a transaction, reads the membership row, and calls `assertClinicCapacity(tx, clinicId, seatMetric)` directly — with no `.for('update')` anywhere in the function.

### Repro scenario
A CLINIC-tier clinic has its `clinic_admin` seat limit set to 1, currently 0 filled (2 receptionists exist, no admin yet). Two `PATCH /v1/clinic/:clinicId/staff/:membershipId` requests promoting two *different* receptionists to `clinic_admin` arrive within the same few milliseconds (e.g., an owner double-clicking, or two browser tabs). Both transactions:
1. Read the current `clinic_admin` count → `0`.
2. Both see `0 < 1` → both pass `assertClinicCapacity`.
3. Both commit.

Result: clinic now has 2 `clinic_admin`s against a 1-seat limit, silently over cap with no denial and no audit trail showing a blocked attempt — the exact failure mode the row lock exists to prevent everywhere else.

### Why it matters
This is the seat-cap mechanism tied to what a clinic pays for. A missed lock here means a clinic can end up with more privileged staff than their tier allows purely by timing, not by any deliberate override — which both undercuts the pricing model and means "at cap" badges shown to Super Admin/clinic can silently disagree with reality until someone notices.

### Suggested fix
Add the same lock used by `invite()` at the top of `update()`'s transaction, before the `seatMetric` check:
```ts
await tx.select({ id: clinics.id }).from(clinics).where(eq(clinics.id, clinicId)).limit(1).for('update');
```

---

## #2 — Self-service "Upgrade/Downgrade my plan" request can never auto-apply — no package picker exists (High / Business logic)

**Files:** [`apps/web/app/(clinic)/app/(shell)/settings/subscription/SubscriptionClient.tsx`](../../apps/web/app/(clinic)/app/(shell)/settings/subscription/SubscriptionClient.tsx) (lines 58–83, 131–143) and [`apps/api/src/routes/subscription-operations.ts:26`](../../apps/api/src/routes/subscription-operations.ts)
**Category:** Business logic / incomplete feature
**Status:** ✅ Fixed. Added `GET /v1/clinic/:clinicId/packages` (new `listAvailablePackages()` on `SubscriptionOperationsService`, same clinic-access guard as the existing subscription route) returning each active package's name/price/description/capacity limits. The form now shows a real plan picker for `upgrade`/`downgrade` with pricing, populates `requestedPackageId`, and disables submit until a plan is chosen — plus a downgrade consequence preview (deny-by-default-safe: an explicit `null`/unlimited limit is never conflated with an absent, deny-by-default one) showing which metrics are already over the target plan's caps, addressing the related UX gap in the improvements doc (§2.1–2.2) in the same change. Added 2 service-level tests (`subscription-operations-service.test.ts`). **Live-verified** against the real local dev DB: fetched all 3 real packages (Solo/Clinic/Branches) with correct limits, submitted a real `upgrade` request with `requestedPackageId` set (`201`), confirmed it stored correctly, then rejected that test request via the Super Admin review endpoint to leave the demo clinic's actual package tier and pending-request queue untouched.

### What's wrong
The backend's auto-apply logic for a reviewed request is:
```ts
if (body.data.status === 'approved' && reviewed.requestedPackageId) {
  await options.adminSettings.assignPackage(reviewed.clinicId, { packageId: reviewed.requestedPackageId, ... });
}
```
It only auto-applies when the original request carried a `requestedPackageId`. But `SubscriptionClient.tsx`'s submit handler only ever sends `requestedPackageId` for... nothing — the field is never populated anywhere in the component. For `type === 'addon'` it sends `requestedMetric`/`requestedLimit` (which *does* work, correctly verified separately). For `type === 'upgrade'` or `'downgrade'` — the two options the dropdown actually offers as "Upgrade my plan" / "Downgrade my plan" — the request body is just `{ type, reason }`. There is no package selector anywhere in the form; the clinic user never sees what packages exist, what they cost, or what an upgrade/downgrade would even mean.

### Consequence
Every "Upgrade my plan" or "Downgrade my plan" request a real clinic submits arrives at Super Admin's queue with `requestedPackageId: null`. On approval, the auto-apply branch's condition is false, so **nothing happens automatically** — Super Admin has to separately go read the free-text `reason`, guess which package the clinic meant, and manually apply it through the unrelated `ClinicPackageAction.tsx` flow. The feature is documented (and was demoed) as working "the same way package upgrade requests already auto-apply" — that's only true for the `addon` path; `upgrade`/`downgrade` are functionally a contact form, not a self-service flow, and nothing in the UI discloses that gap to the clinic user submitting the request.

### Suggested fix
Add a package selector (name + price + feature/capacity summary) to the form for `type === 'upgrade' | 'downgrade'`, populate `requestedPackageId` from it, and disable submit until one is chosen — mirroring how `addon` already requires `metric` before submit is enabled.

---

## #3 — Quick-service completion has no network-failure handling — form gets permanently stuck (High / Reliability)

**File:** [`apps/web/components/app/appointments/QuickServiceCompletion.tsx:9`](../../apps/web/components/app/appointments/QuickServiceCompletion.tsx)
**Category:** Error handling / front-desk operational risk
**Status:** ✅ Fixed — wrapped the fetch in `try/catch/finally`; a network-level failure now shows a retryable error message and re-enables all three buttons instead of locking the form.

### What's wrong
```ts
async function submit(event) {
  ...
  setSaving(true); setError('');
  const response = await fetch(`/api/clinic/appointments/${appointmentId}/quick-complete?...`, {...});
  const payload = await response.json().catch(() => null);
  if (!response.ok) { setError(...); setSaving(false); return; }
  ...
}
```
The `fetch(...)` call itself is not wrapped in `try/catch`, and unlike the sibling `SubscriptionClient.tsx` (which does `.catch(() => null)` on its POST), this one doesn't guard against the promise rejecting at all. If the request fails at the network level — offline, DNS hiccup, request timeout, the clinic's wifi dropping mid-save (a realistic scenario for a PWA meant to run in Philippine dental clinics, not just on stable fiber) — the `await fetch(...)` throws, the function exits via an unhandled rejection, and:
- `setSaving(false)` is never reached → `saving` stays `true` forever.
- The **Cancel** button is `disabled={saving}` → also stuck, unclickable.
- The two action buttons are `disabled={saving}` → also stuck.

The staff member is left looking at a spinner with literally no button on the form they can press. The only recovery is a full page reload — which, depending on timing, may also lose whatever they typed in the tooth/notes fields, and doesn't tell them *why* it happened.

### Consequence
This is the "walk-in patient at the front desk" happy-path completion flow — exactly the moment a real clinic is mid-transaction with a patient standing at the counter. A dropped connection here doesn't just fail gracefully with a retry button, it locks the UI.

### Suggested fix
```ts
try {
  const response = await fetch(...);
  ...
} catch {
  setError('Could not reach the server. Check your connection and try again.');
} finally {
  setSaving(false);
}
```

---

## #4 — Loading spinner only ever appears on the wrong button when completing to billing (Low / UI polish)

**File:** [`apps/web/components/app/appointments/QuickServiceCompletion.tsx:11`](../../apps/web/components/app/appointments/QuickServiceCompletion.tsx)
**Category:** UI feedback
**Status:** ✅ Fixed — each button's spinner condition now checks `nextStep.current` so the spinner appears on whichever button was actually clicked.

### What's wrong
Both submit buttons share the same `saving` boolean (correctly disabling both), but only the first button ("Complete service") swaps its icon for a spinner when `saving` is true — `{saving ? <Loader2 .../> : <CheckCircle2 .../>}`. The second button ("Complete & continue to billing") always renders a static `<Receipt />` icon regardless of `saving`. If a staff member clicks *that* button, the button they actually pressed just dims (via `disabled:opacity-50`) with no spinner, while the *other*, unclicked button shows a spinner as if it's the one working. On a slow connection this reads as "nothing is happening" right after the click that matters most (the one headed to billing).

### Suggested fix
Give the billing button its own `saving && nextStep.current === 'billing'` spinner condition, matching the pattern already used for the first button.

---

## #5 — No error/denied state on the subscription page — silent misleading UI on fetch failure (Medium / UX, violates project's own Definition of Done)

**File:** [`apps/web/app/(clinic)/app/(shell)/settings/subscription/SubscriptionClient.tsx:50–54`](../../apps/web/app/(clinic)/app/(shell)/settings/subscription/SubscriptionClient.tsx)
**Category:** Error states
**Status:** ✅ Fixed — the initial load now distinguishes `loading` / `loadError` / loaded, checks `response.ok` explicitly, catches network-level failures, and renders a real error panel with a "Try again" retry button instead of an infinite spinner.

### What's wrong
```ts
useEffect(() => {
  fetch(`/api/clinic/${clinicId}/subscription`, { credentials: 'include', cache: 'no-store' })
    .then((r) => r.json())
    .then((p) => setData(p.data));
}, [clinicId]);
```
- If the request fails at the network level, the promise chain rejects unhandled and `data` stays `null` forever — the component renders its loading spinner (line 85) permanently, with no path out and no error message.
- If the server responds with a non-2xx (session expired mid-visit, a transient 500, entitlement denial), `r.json()` still resolves — to the error envelope shape (`{success:false, error:{...}}`), not `SubscriptionData` — and `setData(p.data)` sets `data` to `undefined`. The component then renders past the `if (!data)` guard as `undefined` is falsy... actually `data` becomes `undefined`, which *is* falsy, so it stays on the spinner in that specific case too — but either way, **the user is never told an error occurred**, they just see an infinite spinner with no explanation, no retry action, and no way to know if it's their connection, their session, or a server issue.

This directly violates the project's own stated Definition of Done in `docs/CLAUDE.md`: *"loading, empty, denied, and error states exist"* is a per-feature completion requirement, and this page — merged the same day as this review — has loading and (accidentally) a form of empty, but no denied/error state at all.

### Suggested fix
```ts
fetch(...).then(async (r) => {
  const p = await r.json();
  if (!r.ok || !p.data) { setLoadError(p?.error?.message ?? 'Unable to load subscription details.'); return; }
  setData(p.data);
}).catch(() => setLoadError('Could not reach the server.'));
```
...and render a retry-capable error state instead of the spinner when `loadError` is set.

---

## #6 — `CLAUDE.md`/`README.md` reference spec docs that don't exist in the repo (Low / documentation hygiene)

**Category:** Docs drift
**Status:** ✅ Fixed (via the "update the references" option, not by fabricating the 13 missing files) — `docs/CLAUDE.md`'s two dead `@`-imports were replaced with a note explaining that `README.md` and this file's own "Security/privacy rules" section are the current equivalents, and `docs/README.md`'s repository-layout table now lists what's actually in `docs/` today, with a note on what the removed phantom filenames map to. **Separately found while fixing this, out of scope for this fix:** `AGENTS.md`, `README.md`, and `replit.md` each exist as two different, actually-diverging files — one copy at the repo root, one under `docs/` — which is its own documentation-drift issue this pass didn't attempt to resolve, since picking which copy is authoritative and reconciling them is a judgment call, not a mechanical fix.

`docs/CLAUDE.md` opens with `@docs/PRODUCT_SPEC.md` and `@docs/SECURITY_PRIVACY.md` as required reading, and `docs/README.md` lists `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/ROUTES.md`, `docs/DATABASE_SCHEMA.md`, `docs/API_CONTRACT.md`, `docs/ROLE_PERMISSION_MATRIX.md`, `docs/FEATURE_ENTITLEMENTS.md`, `docs/APPOINTMENT_ENGINE.md`, `docs/ODONTOGRAM.md`, `docs/PWA.md`, `docs/SECURITY_PRIVACY.md`, `docs/DEPLOYMENT.md`, and `docs/DEVELOPMENT_WORKFLOW.md` as the canonical repository layout. None of these files exist in `docs/` today — only `AGENTS.md`, `BRANDING.md`, `CLAUDE.md`, `MVP1_RELEASE_CHECKLIST.md`, `MVP_1.md`/`MVP_2.md`/`MVP_3.md`, `PRESENTATION_DEMO.md`, `README.md`, `THREAT_MODEL_OFFLINE_MODE.md`, and the four `USER_GUIDE*.md` files are present.

This matters specifically because `CLAUDE.md` opens by instructing every AI agent working on this repo to treat `PRODUCT_SPEC.md` and `SECURITY_PRIVACY.md` as required context (`@docs/PRODUCT_SPEC.md`) — an agent (or new engineer) following that instruction literally hits a dead reference on the very first line of onboarding. Either these docs were consolidated into the MVP files/task tracker and the references were never cleaned up, or they were never written; either way the pointer should be fixed so it doesn't silently fail to load context that's assumed to exist.

### Suggested fix
Either restore the named files (even as short stubs pointing at where that information now actually lives — e.g., security/privacy rules are currently embedded directly in `CLAUDE.md` §"Security/privacy rules"), or update the two `@`-imports and the layout table to match reality.
