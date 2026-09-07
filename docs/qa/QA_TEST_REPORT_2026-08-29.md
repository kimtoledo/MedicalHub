# Dentra.ph — QA Test Report

**Date:** August 29, 2026
**Tester persona:** a practicing dentist evaluating clinical/operational fit, paired with a technical QA engineer (functional, security, and automated testing)
**Build reviewed:** `main` @ `e2b4f54` ("feat: add capacity-limits UI for Super Admin and clinics")
**Companion documents:** [`QA_BUGS_FOUND_2026-08-29.md`](QA_BUGS_FOUND_2026-08-29.md), [`QA_IMPROVEMENT_RECOMMENDATIONS_2026-08-29.md`](QA_IMPROVEMENT_RECOMMENDATIONS_2026-08-29.md)

---

## 1. Methodology & what "tested" means here

This was a **code-level + live-API QA pass**, not a full manual click-through in a real browser — no browser-automation tool was available in this session. To keep the report honest about confidence levels, every scenario below is marked with how it was actually verified:

| Marker | What it means |
|---|---|
| ✅ **Verified (live)** | Exercised against the running local API/web servers with real HTTP requests in this session |
| ✅ **Verified (automated suite)** | Covered by the project's own passing Vitest suite, which was executed this session |
| ✅ **Verified (code read)** | Confirmed by reading the actual server-side implementation, not just the docs describing it |
| ⚠️ **Not independently verified** | Could not be exercised without a browser (drag/drop odontogram charting, modal flows, visual regression, real click paths) — flagged for a manual or Playwright pass |
| ❌ **Fail** | A real defect was found — see the linked entry in `QA_BUGS_FOUND` |

### What was actually run this session
- `npm run test --workspace @dentra/api` → **537/537 tests passed**, 67 test files.
- `npm run typecheck` (repo-wide, includes `apps/web` and `apps/api`) → **clean, no errors**.
- Started the real local stack (`npm run api:dev` on `:3001`, `npm run dev` on `:5001`) against the seeded dev Postgres DB and issued live `curl` requests against both the Fastify API and the Next.js app (see §5 for the exact probes and results).
- Read the actual implementation (not the task-completion docs) for the newest, least-battle-tested features: subscription capacity limits (`e2b4f54`, `5b997ae`) and quick-service appointment completion (`89ebd5b`), plus the appointment-booking concurrency lock and the odontogram history model, since these are the areas where the project's own domain invariants (`docs/CLAUDE.md`) are easiest to violate silently.
- Per project convention, dev servers were left running rather than stopped.

### Known gap
This report does not re-litigate the project's own `tasks/PAGE_AUDIT.md`, which already tracks (and I spot-confirmed still applies): reviews UI, online-payment checkout UI, custom-domain settings UI, integrations/webhook settings UI, advanced analytics UI, enterprise/organization UI, and AI-imaging UI are all backend-only today with no page. Treat that file as the source of truth for "not built yet"; this report focuses on **what is built and whether it actually works**.

---

## 2. Executive summary

> **Update, same day:** all 6 findings below (the two ❌ Fail scorecard rows plus 4 more in the companion bugs doc) have since been fixed, tested, and — for the two highest-severity ones — live-verified against the running dev stack. See the "Status" line on each entry in [`QA_BUGS_FOUND_2026-08-29.md`](QA_BUGS_FOUND_2026-08-29.md) for exactly what changed. The scorecard and scenario matrix below are left as originally recorded (the findings-in-context, not retroactively edited) so this stays an accurate record of what the pass actually found; treat every "❌ Fail" below as "found, and since fixed."

Dentra.ph is a mature, unusually well-instrumented codebase for its stage: 537 passing tests, a clean repo-wide TypeScript build, real transactional row-locking on the two places money/seats/slots collide (booking, branch/dentist capacity), and independently-verifiable tenant isolation (confirmed live, not just by reading a checklist — see §5). The core clinical loop a dentist actually lives in — patient record → encounter → odontogram → treatment → invoice → prescription — is present, tenant-scoped, and the odontogram's "never overwrite history" rule is real (verified by reading the route file: only `GET`, `POST` add, and `POST .../correct` exist; there is no update/delete path for a chart entry).

The defects found in this pass are concentrated in the **newest feature (subscription capacity limits, merged same day as this review)** and in **error/failure-path handling**, not in the core clinical record-keeping — which is the right place for a young feature to have rough edges and the wrong place for a mature one to. Two of the five findings (see `QA_BUGS_FOUND`) have real business consequences: a seat-cap race condition on staff role changes, and a self-service "upgrade/downgrade my plan" form that can never actually apply itself because it has no package picker — meaning every request silently becomes manual Super Admin work despite the feature being built to auto-apply.

**Verdict:** Solid engineering foundation, safe to keep building on. Not yet safe to fully self-serve subscription changes or trust the quick-service completion flow on a flaky connection without the fixes in the companion bug report.

---

## 3. Scorecard

| Area | Status | Notes |
|---|---|---|
| Cross-tenant data isolation | ✅ Pass | Live-verified: unauthenticated request to a real clinic's dashboard/appointments → `401`; unpublished clinic slug → `404` in both API and web |
| Appointment booking concurrency | ✅ Pass (code read) | `booking-service.ts` takes a `SELECT ... FOR UPDATE` lock on the eligible dentist rows before insert |
| Odontogram history immutability | ✅ Pass (code read) | No update/delete route exists for a chart event; corrections are new events referencing the prior one |
| Capacity/seat limit enforcement (branch, dentist affiliation, staff invite) | ✅ Pass (code read) | All three take a `clinics` row lock before the capacity count |
| Capacity/seat limit enforcement (staff **role change**) | ❌ **Fail** | Missing row lock — see `QA_BUGS_FOUND` #1 |
| Self-service subscription upgrade/downgrade | ❌ **Fail** | No package selection in the UI — see `QA_BUGS_FOUND` #2 |
| Quick-service completion under network failure | ❌ **Fail** | Unrecoverable stuck UI — see `QA_BUGS_FOUND` #3 |
| Public API data minimization | ✅ Pass (live) | Public clinic directory payload contains only publishable fields, no PII/pricing/internal IDs beyond the clinic's own public UUID |
| Basic injection probe on public search | ✅ Pass (live) | `?search=' OR 1=1--` returned an empty, well-formed result set, not an error or data dump — consistent with parameterized queries |
| PWA offline shell / service worker | ✅ Pass (live) | `manifest.json`, `sw.js`, `/offline` all resolve `200` |
| Automated test suite | ✅ Pass (live) | 537/537 |
| Repo-wide typecheck | ✅ Pass (live) | Clean |
| Odontogram drag/chart UI, modal flows, visual/responsive rendering | ⚠️ Not independently verified | No browser tool this session — recommend a Playwright/manual pass |

---

## 4. Scenario matrix (dentist + technical lens)

### 4.1 Public site & booking (patient-facing)

| # | Scenario | Expected | Result |
|---|---|---|---|
| B1 | Browse clinic directory as an anonymous visitor | Only published clinics shown, only public fields returned | ✅ Verified (live) — see §5.1 |
| B2 | Visit an unpublished/nonexistent clinic microsite by slug | `404`, not a broken page or leaked draft data | ✅ Verified (live) |
| B3 | Book an appointment slot two patients try simultaneously | Exactly one booking succeeds, the other gets a clean conflict, not a double-booked chair | ✅ Verified (code read) — row lock in `booking-service.ts`; this exact scenario also has its own automated concurrent-HTTP test per `MVP1_RELEASE_CHECKLIST.md`, re-confirmed still passing in the 537-test run |
| B4 | Attempt to book past a branch's closing hours / on a configured PH holiday closure | Slot not offered / booking rejected | ⚠️ Not independently verified this session — recommend manual pass against `docs/MVP_2.md` §"clinic hours, holidays, dentist availability" |
| B5 | Kiosk check-in flow (`/kiosk/[branchId]`) | Loads for a valid branch, doesn't leak other clinics' branches | ⚠️ Not independently verified (needs interactive session) |

### 4.2 Clinical workflow (the "dentist" lens)

| # | Scenario | Expected | Result |
|---|---|---|---|
| C1 | Open a patient's odontogram, add a finding, then correct it later | The original event stays intact; the correction is a new, linked event — you can always reconstruct "what did the chart say on the date of a prior claim/dispute" | ✅ Verified (code read) — no route can mutate or delete a prior event |
| C2 | Two encounters for the same patient at two different clinics | Clinic A cannot see Clinic B's encounter for the same patient (patient records are clinic-tenant-scoped in MVP 1/2 by design) | ✅ Verified (code read, consistent with live tenant-isolation probe in §5.2) |
| C3 | Issue a prescription | Requires a finalized encounter, dentist-attributed, PRC number preloaded, immutable once issued | ✅ Verified (code read against `tasks/mvp1/20-prescriptions-erx.md` delivery notes; not re-derived independently line-by-line, flagged as secondary confidence) |
| C4 | Quick-complete a walk-in/quick service (new in `89ebd5b`) on a flaky connection | Either succeeds, or fails with a clear retryable error — never a dead-end | ❌ **Fail** — see `QA_BUGS_FOUND` #3 |
| C5 | A dentist assigned to two branches of the same clinic — schedule and patient list per branch | Correctly scoped per branch/assignment, no cross-branch bleed | ⚠️ Not independently verified interactively; capacity-counting logic (which shares the same assignment table) was read and correctly avoids double-counting this exact dentist-in-two-branches case (`dentists-service.ts` — see §5.3) |

### 4.3 Billing, HMO, inventory (clinic business operations)

| # | Scenario | Expected | Result |
|---|---|---|---|
| BI1 | Finalize a treatment → generate invoice | Tenant/branch-scoped invoice snapshot, price locked at time of invoice even if the service's current price later changes | ✅ Pass per `MVP1_RELEASE_CHECKLIST.md`, consistent with the "price history strategy" requirement in `docs/MVP_2.md`; not independently re-derived from raw code this session |
| BI2 | Take a partial payment on an invoice | Correct remaining balance, no double-payment write | ⚠️ Not independently re-verified this session (existing `hmo-claim-payment.test.ts` / `online-payments.test.ts` pass in the suite) |
| BI3 | HMO claim creation | Guided, tenant-safe (no raw UUID entry) per `mvp2/17` | ⚠️ Not independently verified interactively |

### 4.4 Subscription, seats & Super Admin (newest feature — highest scrutiny)

| # | Scenario | Expected | Result |
|---|---|---|---|
| S1 | SOLO clinic tries to add a 2nd branch/dentist/any staff | Rejected server-side with a clear `*_LIMIT_REACHED` `409` | ✅ Verified (code read) |
| S2 | Two concurrent requests add a branch to a clinic at exactly 1-under-cap | Exactly one succeeds | ✅ Verified (code read) — `clinics` row locked with `.for('update')` before the count |
| S3 | Two concurrent staff **role changes** promote two different people into a 1-seat-capped role | Exactly one should succeed | ❌ **Fail** — see `QA_BUGS_FOUND` #1 |
| S4 | Clinic owner requests "Upgrade my plan" from `/app/settings/subscription` | Super Admin can review and approve, and approval actually changes the clinic's package | ❌ **Fail** — see `QA_BUGS_FOUND` #2 |
| S5 | Clinic owner requests extra seats ("addon") for a specific role | Approval auto-applies the new limit immediately, no separate manual step | ✅ Pass (code read) — this path *does* send `requestedMetric`/`requestedLimit` and does auto-apply |
| S6 | Downgrading a clinic below current usage | Never retroactively disables existing dentists/branches/staff; only blocks further growth, Super Admin sees a warning | ✅ Pass (code read) — `warnings` field returned by both package-assignment and override endpoints |
| S7 | Super Admin views a clinic's Capacity tab | Live usage-vs-limit per metric, correct at-cap/over-cap badges | ⚠️ Visual/badge correctness not independently re-verified this session (no browser); underlying `getClinicCapacitySummary` query logic read and is correct |

### 4.5 Security / platform

| # | Scenario | Expected | Result |
|---|---|---|---|
| SEC1 | Unauthenticated request to a real clinic's dashboard | `401 UNAUTHENTICATED`, not `500` or data | ✅ Verified (live) |
| SEC2 | Unauthenticated request to Super Admin clinics list | `401`/`403`, not data | ✅ Verified (live) |
| SEC3 | Basic SQL-injection-shaped input on public search | No error, no data leak, empty/clean result | ✅ Verified (live) |
| SEC4 | Health endpoint doesn't leak internals | Minimal `{status, service}` payload | ✅ Verified (live) |
| SEC5 | Referenced spec docs (`docs/PRODUCT_SPEC.md`, `docs/SECURITY_PRIVACY.md`, `docs/ROLE_PERMISSION_MATRIX.md`, `docs/FEATURE_ENTITLEMENTS.md`, `docs/APPOINTMENT_ENGINE.md`, `docs/ODONTOGRAM.md`, `docs/DATABASE_SCHEMA.md`) exist as `CLAUDE.md`/`README.md` claim | These files should exist in `docs/` | ❌ **Fail (docs, not code)** — see `QA_BUGS_FOUND` #6 |

---

## 5. Live-verification evidence (raw)

### 5.1 Public data minimization
```
GET /v1/public/clinics
{"success":true,"data":{"items":[{"id":"...0001","name":"Smile Bright Dental",
"slug":"smile-bright-dental","description":null,"logoUrl":null,"city":null,
"province":null,"verificationStatus":"unverified","distanceKm":null,
"hasOpenSlotSoon":true,"locations":["Quezon City, Metro Manila"],
"services":["Braces Adjustment", ...]}], "pagination": {...}}}
```
No pricing, no patient data, no internal clinic settings — good. One open question, not a defect: an **`unverified`** clinic is still publicly listed with a full service list. Confirm this is the intended trust model (verification as a badge, not a listing gate) — flagged in the improvements doc.

### 5.2 Tenant/auth boundary
```
GET /v1/clinic/dashboard/summary?clinicId=<real-clinic-uuid>   (no session cookie)
→ 401 {"error":{"code":"UNAUTHENTICATED", ...}}

GET /v1/clinic/appointments?clinicId=<real-clinic-uuid>        (no session cookie)
→ 401 {"error":{"code":"UNAUTHENTICATED", ...}}

GET /v1/admin/clinics                                          (no session cookie)
→ 401

GET /v1/public/clinics/this-slug-should-not-exist-zzz
→ 404

GET /clinic/this-should-not-exist-zzz   (web app)
→ 404
```

### 5.3 Capacity double-counting guard (dentist in two branches)
Read `apps/api/src/admin/dentists-service.ts` — before consuming a `DENTISTS` capacity seat, it explicitly checks whether the dentist already has an active assignment anywhere in the same clinic and skips the capacity check if so, exactly matching the stated invariant ("a dentist already affiliated with one branch of a clinic can be affiliated with a second branch of the *same* clinic without being blocked or double-counted").

### 5.4 PWA / offline shell
```
GET /manifest.json → 200
GET /sw.js         → 200
GET /offline       → 200
```

---

## 6. Recommended next steps

1. Fix the two capacity-limits defects before promoting subscription self-service to clinics in production (`QA_BUGS_FOUND` #1, #2) — this feature merged the same day as this review.
2. Fix the quick-service network-failure dead-end (`QA_BUGS_FOUND` #3) before relying on it for daily front-desk use, especially outside Metro Manila where connectivity is less consistent.
3. Run (or have a human run) the project's existing Playwright suite plus a real click-through pass for everything marked ⚠️ above — this session had no browser tool, so visual/interactive correctness is unverified, not confirmed-good.
4. See `QA_IMPROVEMENT_RECOMMENDATIONS_2026-08-29.md` for UX/UI/business-logic improvements beyond outright defects.
