# Custom Domain Settings UI

> **Status:** ✅ Done
> **Priority:** P2

## What & Why

Add clinic-facing custom-domain management around the existing verification records and APIs.

## Done looks like

- Add/normalize hostname, show exact DNS instructions, copy values, and recheck verification.
- Status timeline covers pending, verified, active, failed, and fallback states.
- Activation is disabled until verification succeeds.
- Canonical-domain and SSL provisioning status are truthful and deployment-aware.
- Tenant ownership, audit events, safe errors, responsive states, and tests.

## Delivered

- Added `/app/settings/domains`: add a hostname, see its DNS TXT instructions (with copy buttons) persistently until active, recheck verification, and activate — linked from the Clinic Settings hub.
- The verification token is now also returned by the list endpoint (not just at creation) so DNS instructions survive a page reload instead of being shown only once.
- Activation is only offered once a domain's status is `verified`; the server independently enforces this with a conditional update, so the UI state can never race ahead of what the API allows.
- Status badges cover pending verification, verified, active, and failed (with the DNS failure reason shown); active domains show a note that SSL/canonical redirect provisioning happens at the infrastructure layer after activation and that DNS/certificate problems fall back to the canonical Dentra.ph URL with no downtime — no fabricated "SSL active" claim is shown.
- Clinic-owner/admin role scoping, per-clinic tenant isolation, and audit events were already enforced server-side and are unchanged; added 6 new API tests covering add/list/verify/activate authorization and the pre-verification activation guard.
- Verified 306 passing API tests (16 new across this and the prior payments task), 5 passing web tests, repository-wide TypeScript checks, production web/API builds, and clean diff validation.

## Dependencies

- DNS/SSL deployment adapter completion from `mvp3/08-custom-domains.md` (still required for automatic, non-adapter SSL issuance; this UI works against the existing pending/verified/active/failed lifecycle only).
