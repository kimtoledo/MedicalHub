# Clinic Staff and Membership Management

> **Status:** 🔲 Queued
> **Priority:** P1

## What & Why

Replace `/app/staff` with tenant-scoped staff membership, invitation, role, branch-access, and permission management.

## Done looks like

- Clinic Owner/Admin can list active and pending members with role and branch access.
- Invite/create flow supports approved clinic roles and secure password-setup delivery boundaries.
- Role, branch assignment, activation/deactivation, and removal workflows are validated and audited.
- Existing permission override APIs are exposed through a clear permission matrix.
- Owners cannot accidentally remove the clinic's last owner; users cannot elevate themselves.
- Every query and mutation is filtered by `clinic_id`; cross-tenant IDs return denial/not-found.
- Responsive UI includes empty, loading, error, confirmation, and resend-invite states.

## Dependencies

- `mvp2/12-new-roles.md` permission presets and overrides.
- Notification delivery for production invitations.
