# Clinic Staff and Membership Management

> **Status:** ✅ Done — management baseline; production invite delivery remains under Notifications
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

## Delivered — August 13, 2026

- Tenant-scoped owner/admin staff roster with active, pending, and inactive states.
- Invitation creation and resend boundaries; existing credential users join immediately, while new-user invitations remain pending without exposing setup secrets until a production notification provider is configured.
- Validated role, all-branch/single-branch, activation, removal, and permission-override controls with atomic audit events.
- Self-elevation/removal prevention, owner-only owner management, and last-active-owner protection.
- Responsive loading, empty, error/retry, confirmation, invite, and permission-matrix states at `/app/staff`.
- Route tests cover owner access, non-admin and cross-tenant denial, input validation, and last-owner conflicts.
