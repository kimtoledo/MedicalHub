# Clinic Dashboard — Live Data

> **Status:** 🔲 Queued — static mock dashboard is ✅ Done (#10 merged); real data wiring is pending

---

## What & Why

The clinic dashboard (`/app`) and dentist dashboard (`/app/dentist`) currently display hard-coded mock values. This task replaces the mock data with live API calls so the numbers and appointment lists reflect reality.

---

## Done looks like

**Clinic staff dashboard (`/app`):**
- Today's appointment count pulls from `GET /v1/clinic/dashboard/summary`.
- Checked-in count, upcoming count, and active patient count are live.
- The appointment table shows today's real appointments with status badges and patient names.
- Status action buttons (Check In, Complete, No Show, Cancel) call the API and update the row immediately.

**Dentist dashboard (`/app/dentist`):**
- "Next up" card shows the next real appointment from `GET /v1/clinic/dentist/schedule?date=today`.
- Today's schedule list is live with real appointment times, patient names, and services.
- Recent patients list pulls from `GET /v1/clinic/dentist/recent-patients`.

**Both dashboards:**
- Loading skeleton states are shown while data fetches.
- Error states are shown if the API is unavailable.
- Data refreshes on window focus (visibility change) or on a 60-second timer.

---

## Out of scope

- Advanced analytics and charts (MVP 2).
- Financial metrics on the dashboard (MVP 2).

---

## Steps

1. **Dashboard summary API** — `GET /v1/clinic/dashboard/summary` returning today's counts, scoped to the authenticated user's clinic and branch.
2. **Appointments list API** — `GET /v1/clinic/appointments?date=today` with status filter.
3. **Appointment status update** — `PATCH /v1/clinic/appointments/[id]/status` with allowed status transitions and an audit entry.
4. **Dentist schedule API** — `GET /v1/clinic/dentist/schedule` scoped to the authenticated dentist.
5. **Wire clinic dashboard** — replace mock data in `/app/page.tsx` with real API calls; add loading/error states.
6. **Wire dentist dashboard** — replace mock data in `/app/dentist/page.tsx` with real API calls.
