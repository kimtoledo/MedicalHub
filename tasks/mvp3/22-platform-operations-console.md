# Platform Operations Console

> **Status:** ✅ Done
> **Priority:** P2

## What & Why

Provide Super Admin pages for support-access and tenant export/offboarding workflows without granting routine clinical access.

## Done looks like

- Queues for support-access requests and tenant export/offboarding requests.
- Written justification, approval/denial, expiry, processing state, and audit history are visible.
- No support button silently opens clinical records; scoped support sessions require separate backend enforcement.
- Platform inventory/health summaries clearly distinguish live signals from unavailable integrations.
- Retention/deletion actions remain disabled until workers and policy controls are complete.
- Responsive, role-protected, audited, and tested.

## Delivered

- Added `/dentra-admin/operations`: a Super Admin console with a support-access queue (written justification, approve/deny, 30-minute approval window shown, reviewer/timestamp) and a tenant export/offboarding queue (requester, retention date, processing/ready/failed/cancelled transitions), both enriched with clinic name and requester/reviewer email instead of raw IDs.
- Added `/app/settings/data-requests`: the clinic-side counterpart so clinic owners/admins can submit a support-access justification or a data-export request and see their own status history — previously there was no way for a clinic to view the status of requests it made, so I added `GET /v1/clinic/:clinicId/operations/support-access` and `GET /v1/clinic/:clinicId/operations/exports` (reusing the existing service methods' clinic-scoping) to make that possible.
- The console explicitly states that marking an export "ready" does not generate or send a file — no artifact worker exists yet — and that the 30-minute support-access window is not yet enforced at the data layer, so no button implies clinical access is actually opened or revoked.
- Platform inventory shows the one real signal (active clinic count) and labels API error rate, slow query alerts, and storage usage as "not yet wired to a live signal" rather than fabricating metrics.
- No retention/deletion action was added to either UI — the backend has no delete/anonymize route to call, so there is nothing safe to expose yet.
- Clinic-owner/admin vs Super Admin role separation, per-request audit events, and status guards (e.g. rejecting a review of an already-decided request) were already enforced server-side; added 9 new API tests covering both roles' authorization boundaries and the request lifecycle.
- Verified 324 passing API tests (9 new), 5 passing web tests, repository-wide TypeScript checks, production web/API builds, and clean diff validation.

## Dependencies

- Remaining worker/session/retention work in `mvp3/11-platform-operations.md` (scoped support-session enforcement, real export/deletion workers, alerting, feature-flag rollout — the console is explicit about which of these are not yet live).
