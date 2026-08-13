# Patient Reviews and Moderation UI

> **Status:** ✅ Done
> **Priority:** P1

## What & Why

Complete the review experience across patient, public, clinic, and Super Admin surfaces.

## Done looks like

- Eligible linked patients can review a completed appointment once.
- Clinic/dentist public pages display approved aggregates and paginated reviews.
- Clinic admins can respond to approved reviews from a protected queue.
- Super Admin moderation supports approve/reject/hide with required reasons.
- Report/abuse flow, rate limits, PII-safe display, empty/loading/error states, and tests.

## Delivered

- Added session-scoped patient review eligibility and history, one-time completed-appointment submission, and moderation status/reason visibility.
- Added approved review aggregates and pagination to public clinic and dentist profiles with the PII-safe author label `Verified patient`.
- Added a protected clinic response queue and a Super Admin moderation workspace with pending/report filters and required approve/reject/hide reasons.
- Added authenticated, rate-limited abuse reporting with deduplication and pending report detail visibility for Super Admin.
- Added `review_reports` storage through generated migration `0034_nebulous_talkback.sql`.
- Verified 278 API tests, 5 web tests, repository-wide typechecks, production web/API builds, and clean diff validation.

## Dependencies

- `mvp3/04-reviews.md` eligibility and moderation API baseline.
