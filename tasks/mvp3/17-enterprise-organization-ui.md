# Enterprise Organization Workspace

> **Status:** ✅ Done
> **Priority:** P2

## What & Why

Provide a usable frontend for organization membership and consolidated enterprise operations.

## Done looks like

- Organization selector and member-clinic overview for authorized organization users.
- Consolidated appointment, patient, and revenue summaries honor organization and branch scopes.
- Owner/admin can attach clinics and manage organization roles without bypassing clinic ownership checks.
- Regional managers see only assigned branches.
- Clear handoff points for remaining central catalog, entitlements, staff assignment, and patient-transfer work.
- Responsive UI and organization-boundary tests.

## Delivered

- Added a responsive `/app/organization` workspace with organization selection, member-clinic/branch overview, and appointment, patient, and invoiced-revenue summaries.
- Restricted regional managers to explicitly assigned organization branches for both visible locations and aggregate metrics.
- Added owner/admin clinic attachment with independent target-clinic administration checks and a database constraint preventing one clinic from joining multiple organizations.
- Added email-based organization member management with owner/admin/regional-manager/viewer roles, validated regional branch assignments, owner-only owner changes, and last-owner protection.
- Added audited clinic attachment and role assignment events without clinical or financial payload details.
- Preserved explicit handoffs for central catalogs, cascading entitlements, cross-clinic staff assignments, and consented patient transfers in `mvp3/05-enterprise-multibranch.md`.
- Verified 285 API tests, 5 web tests, repository-wide typechecks, production web/API builds, and clean diff validation.

## Dependencies

- Complete remaining backend scope in `mvp3/05-enterprise-multibranch.md` where required.
