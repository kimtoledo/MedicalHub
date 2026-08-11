# Clinic Dashboard — Live Data

> **Status:** ✅ Done

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
- Advanced revenue analytics and financial charts (MVP 2); MVP 1 includes only today's collected amount and paid-invoice count.

---

## Steps

1. **Dashboard summary API** — ✅ Live counts and appointments are restricted to the authenticated clinic and membership-authorized branch.
2. **Appointments list API** — ✅ Date (`today` or ISO) and status filters return live branch-scoped appointments; dentist access is additionally dentist-scoped.
3. **Appointment status update** — ✅ Legal transitions run under a row lock and atomically append status history plus audit events.
4. **Dentist schedule API** — ✅ Live schedule and recent-patient endpoints derive the linked dentist and enforce branch/tenant scope.
5. **Wire clinic dashboard** — ✅ Live KPIs, appointment rows/actions, appointments list, loading skeletons, errors, focus refresh, and 60-second refresh replace all mock data.
6. **Wire dentist dashboard** — ✅ Live next-up, schedule, status actions, recent patients, full schedule, loading/error, and refresh behavior replace all mock data.
