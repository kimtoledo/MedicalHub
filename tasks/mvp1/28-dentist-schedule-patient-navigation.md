# Dentist Schedule Patient Navigation

> **Status:** ✅ Done
> **Priority:** P1

## What & Why

Dentists need to move directly from today’s schedule or the full schedule into the linked patient record, then update the status of appointments assigned to them without returning to the schedule.

## Done looks like

- Linked patient names on `/app/dentist` today’s schedule open the dentist patient profile.
- Linked patient names on `/app/dentist/schedule` open the same tenant-scoped profile.
- Public bookings without a linked patient record remain readable but are not presented as links.
- The dentist patient profile shows legal appointment status actions only for appointments assigned to the signed-in dentist.
- Status updates reuse the protected appointment transition endpoint and refresh the profile after success.
- Responsive/accessibility states and focused tests pass without changing unrelated work.

## Delivered

- Linked registered patient names from the dentist dashboard’s Next Up and Today’s Schedule sections to `/app/dentist/patients/[patientId]`.
- Linked registered patient names from `/app/dentist/schedule`; unlinked public bookings remain plain text.
- Added appointment status actions to the dentist patient profile only when the appointment is assigned to the current dentist.
- Reused the existing tenant-scoped, transition-validated, audited status endpoint and refresh the profile after successful updates.
- Added the appointment dentist identifier to the protected patient-detail projection for UI authorization hints; the API remains authoritative.
- Verified 449 API tests, 8 web tests, repository-wide TypeScript checks, and production web/API builds.

## Dependencies

- `mvp1/10-patient-management.md`
- `mvp1/14-clinic-dashboard-live.md`
