# Quick Services, Clinic Appointment Creation, and Record Search

> **Status:** ✅ Done — implementation complete; Replit task reference remains unavailable in the current Codex session

---

## What & Why

Clinic teams need a low-friction way to schedule and document routine services such as oral prophylaxis, braces adjustments, fluoride application, and simple consultations. These visits still need a valid tenant-scoped clinical record, but they should not force a dentist through every field in the full encounter form.

Clinic staff also need to create appointments directly from the Clinic PWA, and core record lists need consistent search and filter controls so records remain usable as clinic data grows.

---

## Scope

### Quick-service configuration

- Add a `quick` or `standard` workflow mode to clinic services; existing services default to `standard`.
- Allow clinic owners and administrators to select the workflow mode from `/app/settings/services`.
- Add service-catalog search and workflow/status filters.

### Clinic-created appointments

- Add a **New appointment** action to `/app/appointments`.
- Select an existing tenant-owned patient, active service, authorized branch, assigned dentist, date, and start time.
- Derive the end time from the configured service duration.
- Validate branch access, patient/service ownership, dentist assignment, clinic hours, holidays, dentist availability, and appointment overlap on the server.
- Create internal appointments as confirmed and record the authenticated actor.

### Quick completion

- Show **Complete quick service** for appointments whose service uses the quick workflow.
- Prefill patient, branch, dentist, service, and completion time.
- Keep tooth/area and notes optional.
- In one transaction, create a finalized encounter and treatment record, complete the appointment, append appointment status history, and write audit events.
- Require a linked clinic patient before clinical completion.
- Offer invoice creation as a separate follow-up action; do not auto-create an invoice.

### Service-record listing and filters

- Add a clinic-wide `/app/treatments` list for completed treatment/service records.
- Search by patient name, patient number, and service name.
- Filter by date range, branch, dentist, service, and workflow mode.
- Default to the last 30 days, active branch context, and newest-first ordering.
- Link each result to its patient, encounter, and appointment where available.
- Use URL-backed filters, server-side pagination, responsive layouts, and a clear-filters action.

### Core filter consistency

- Add patient/service/dentist search and filters to appointments.
- Add search plus workflow/status filters to the service catalog.
- Preserve the existing patient search and billing search/status/date filters.
- Use URL-backed filters and page-reset behavior for the new clinic-wide service-record list.

---

## Security and data invariants

- Derive clinic and actor authority from the authenticated session.
- Filter every read and write by `clinic_id`; branch-restricted users remain branch restricted.
- Use canonical `FeatureKey` entitlement checks.
- Do not log clinical text, contact data, tokens, or private objects.
- Keep clinical responses network-only and uncached.
- Record immutable audit metadata without copying clinical notes into audit payloads.
- Reuse one scheduling/conflict rule path across public, recall, partner, and internal appointment creation wherever practical.

---

## Done looks like

1. A clinic administrator can mark Cleaning or Braces Adjustment as a quick service.
2. Authorized clinic staff can create a confirmed appointment without re-entering an existing patient's contact details.
3. Invalid branch/dentist/service combinations and overlapping slots are rejected server-side.
4. An authorized dentist can complete a quick service with optional tooth/area and notes.
5. Quick completion creates linked encounter, treatment, appointment-history, and audit records atomically.
6. Completed services appear in the patient history and a searchable clinic-wide service-record list.
7. Appointment, service-catalog, patient, billing, and service-record filters work on mobile and desktop and never cross tenant or branch boundaries.
8. Schema migration, API tests, UI tests, typechecks, and production builds pass.
9. `LOGS.md`, the MVP 2 overview, and user-facing documentation are updated.

---

## Delivery sequence

1. Schema and generated migration.
2. Shared scheduling validation and internal appointment API.
3. Clinic appointment drawer and list filters.
4. Transactional quick-completion API and UI.
5. Clinic-wide service-record API and page.
6. Core record-list filter consistency pass.
7. Tests, documentation, task status, and `LOGS.md`.

---

## Delivered

- Migration `0048_chilly_red_ghost.sql` adds `services.workflow_mode` with a safe `standard` default.
- Service settings now create/update, search, and filter quick versus standard workflows.
- Clinic appointment creation uses server-returned available slots and row-locked collision protection shared with the existing scheduling rules.
- Quick completion creates the finalized encounter, treatment record, appointment status/history, integration event, and audit events in one transaction.
- `/app/treatments` provides the new clinic-wide, paginated, URL-filtered service-record list.
- Appointment lists now search patients and filter by status, service, dentist, date, and branch context.
- Verified with 518 passing API tests, 9 passing web tests, repository-wide TypeScript checks, production web/API builds, and `git diff --check`.

---

## Explicit non-goals

- A generic employee to-do/project-management system.
- Automatic invoice creation.
- Removing the full encounter workflow for clinically complex procedures.
- Allowing receptionists to author or finalize clinical treatment records.
- Cross-clinic patient or treatment search.
