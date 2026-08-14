# Clinic Hours, Holidays & Dentist Availability

> **Status:** 🔵 Active — steps 1-7 delivered, live verification and deeper UI polish pending
> **Priority:** P1

---

## What & Why

`08-appointment-booking-public.md` shipped the public booking wizard, but availability is derived from a single free-text column: `branches.operatingHours` (`packages/db/src/schema/branches.ts`), a JSON blob keyed by weekday with values like `"9:00am - 5:00pm"` or `"Closed"`, parsed ad hoc by `parseHours()` in `apps/api/src/public/booking-service.ts`. There is no way for a clinic to:

- Mark a specific date closed (Philippine holiday, typhoon, staff event) — the booking wizard will happily offer slots on a day the clinic isn't open.
- Give an individual dentist their own working pattern or time off — availability today is branch-wide only; a dentist who doesn't work Wednesdays, or who is on leave, still shows open slots as long as the branch is open and no appointment already occupies them.

This task replaces the free-text hours with a structured model, adds clinic-wide/branch-wide closures (with Philippine public holidays auto-seeded and toggleable), and adds per-dentist weekly schedules + time off — all feeding the existing availability API so the public wizard reflects reality.

---

## Data model (`packages/db/src/schema/`)

**`branch_hours.ts`** (new) — replaces `branches.operatingHours`
```
id, branchId, weekday (0-6), opensAt, closesAt, isClosed
```
One row per weekday per branch. Migration backfills existing `operatingHours` JSON into rows, then drops the column.

**`clinic_closures.ts`** (new)
```
id, orgId, branchId (nullable = applies to all branches in the org), date, label,
source ('ph_holiday' | 'custom'), isEnabled
```
Philippine regular/special non-working holidays are seeded as `source: 'ph_holiday'` rows per year; a clinic can toggle `isEnabled` per holiday (e.g. stay open on a special non-working day) and add its own `source: 'custom'` closures (e.g. clinic anniversary, typhoon signal). Recurring yearly holidays need a seed job or on-read generation for the current + next year — decide during implementation which is simpler given the existing migration/job patterns in this repo.

**`dentist_schedules.ts`** (new)
```
id, dentistId, branchId, weekday, startsAt, endsAt
```
A dentist's normal weekly pattern, per branch they're assigned to (`dentist_branch_assignments` already exists in `dentists.ts`). No row for a weekday = not working that day at that branch.

**`dentist_time_off.ts`** (new)
```
id, dentistId, startDate, endDate, reason
```
One-off leave/vacation/sick blocks, independent of the weekly pattern.

---

## Done looks like

- Clinic settings has an **hours editor** per branch (day-by-day open/close time or "Closed" toggle) replacing whatever free-text input exists today.
- Clinic settings has a **"Holidays & Closures" card**: a list of the current year's PH holidays (auto-seeded) each with an enable/disable toggle, plus an "Add closure" action for custom dates. Closures can be scoped to one branch or the whole org.
- Dentist profile/branch-assignment screen has a **"Working hours"** weekly grid and a **"Time off"** list (add/remove date ranges with an optional reason).
- The public availability API (`GET /v1/public/clinics/:slug/availability`) excludes:
  - Weekdays/dates where the branch is closed (`branch_hours.isClosed` or no row).
  - Dates matching an enabled `clinic_closures` row for that branch or org-wide.
  - When a specific dentist is selected: times outside that dentist's `dentist_schedules` for the branch, and dates inside a `dentist_time_off` range.
- When a date has zero slots because of a closure, the API returns a reason (e.g. `"Closed — Rizal Day"`) and `PublicBookingWizard.tsx` shows that message instead of an empty grid.
- "Any available dentist" bookings still work by unioning all assigned dentists' schedules at that branch rather than requiring every dentist to be free.
- All new settings screens enforce the same role/tenant checks as existing clinic settings pages (clinic staff with settings permission, tenant-scoped).

---

## Out of scope

- Non-Philippine holiday calendars or per-clinic country selection — this product targets PH clinics only.
- Recurring custom closures (e.g. "closed every 2nd Sunday") — only single-date custom closures for now.
- Patient-facing display of a dentist's full calendar/vacation history — only affects slot generation, not a public "dentist is on leave until X" message.
- Time-zone configurability — stays hardcoded to `Asia/Manila` (`MANILA_OFFSET`), consistent with current behavior.
- Automatic rebooking/notification of existing patients when a clinic adds a closure that conflicts with an already-confirmed appointment — flag the conflict to clinic staff to handle manually (surfacing it is in scope; auto-resolving it is not).

---

## Steps

1. **Schema + migration** — ✅ Added `branch_hours`, `clinic_closures`, `dentist_schedules`, `dentist_time_off` tables (`packages/db/src/schema/availability.ts`, migration `0046_wet_nehzno.sql`). The legacy `branches.operating_hours` column is kept (not dropped) as a safety margin — `scripts/backfill-branch-hours.ts` populates `branch_hours` from it, and `scripts/seed-ph-holidays.ts` seeds the current + next year's fixed-date PH holidays per clinic. Both scripts have been run against the dev database.
2. **Availability logic** — ✅ `apps/api/src/public/booking-service.ts` rewritten: `resolveBranchRange()`, `resolveClosure()`, `resolveDentistRange()`, `isOnTimeOff()` replace the old text-parsing `parseHours()`. `generatedSlots()` and the "any available dentist" path now account for closures, dentist schedules, and time off. `apps/api/src/public/directory-service.ts`'s "open slot soon" directory heuristic was updated to the same structured tables.
3. **Availability API response** — ✅ `availability()` returns `closedReason: string | null`; `book()` throws a `CLINIC_CLOSED` error naming the closure when applicable.
4. **Clinic settings API** — ✅ `PATCH /v1/clinic/:clinicId/branches/:branchId/hours` now takes structured rows; added `GET/POST /v1/clinic/:clinicId/closures`, `PATCH/DELETE /v1/clinic/:clinicId/closures/:closureId`. Dentist-owned `GET/PUT /v1/dentist/schedule` and `GET/POST/DELETE /v1/dentist/time-off` added to `dentist-profile.ts` (identity derived from the authenticated membership, consistent with the rest of that route file).
5. **Clinic settings UI** — ✅ `ClinicMicrositeSettings.tsx`: branch hours editor now uses per-weekday time inputs + a closed toggle; added a "Holidays & closures" card (list, enable/disable toggle, add custom closure, delete custom closures).
6. **Dentist schedule UI** — ✅ New `DentistScheduleEditor.tsx` mounted on the dentist self-service profile page: per-branch weekly working-hours grid + a time-off list (add/remove).
7. **Booking wizard UI** — ✅ `PublicBookingWizard.tsx` step 2 shows "The clinic is closed on this date — {reason}" when `closedReason` is set, instead of the generic "no open slots" message.
8. **Tests** — ✅ New `apps/api/test/booking-service.test.ts` (27 cases covering the resolver functions), extended `dentist-profile.test.ts` and `clinic-settings.test.ts` for the new routes. Full suite: 503/503 API tests, 9/9 web tests, both workspace builds and typechecks pass.
9. **Live verification** — 🔲 Not yet done. Still needed: exercise the new settings/dentist-schedule UI against the real dev servers in a browser (toggle a holiday, add a custom closure, set a dentist's partial-week schedule and a time-off range, confirm the public wizard reflects each change).

---

## Testing plan

**Unit — `apps/api/src/public/booking-service.ts` (or new `booking-service.test.ts` cases)**
- `parseHours()` reads structured `branch_hours` correctly, including a branch with no rows for a weekday (treated as closed).
- `generatedSlots()` returns no slots for a date with an enabled `clinic_closures` row (branch-scoped and org-wide cases).
- `generatedSlots()` returns slots for a date with a *disabled* PH holiday row (clinic chose to stay open).
- `generatedSlots()` intersects branch hours with a specific dentist's `dentist_schedules` (dentist works fewer hours than the branch).
- `generatedSlots()` excludes a date fully covered by `dentist_time_off`, and correctly handles a time-off range that partially overlaps the requested date.
- "Any available dentist" unions multiple dentists' schedules rather than requiring intersection.
- Existing appointment-conflict logic still applies on top of the new filters (no regression).

**API integration — `apps/api/test/*.test.ts`**
- `GET /v1/public/clinics/:slug/availability` returns a `closedReason` for a fully-closed date and an empty/absent reason for an open one.
- New settings CRUD routes: tenant isolation (clinic A cannot read/write clinic B's hours/closures/schedules), permission checks (staff without settings permission → 403), and validation (e.g. `closesAt` after `opensAt`, non-overlapping dentist schedule rows).
- Migration backfill test/check: sample `operatingHours` JSON values (including `"Closed"` and free-text ranges seen in current data) map to the expected `branch_hours` rows.

**Web — component/e2e**
- `PublicBookingWizard.tsx`: closed-date selection shows the closure reason and disables time-slot selection.
- `PublicBookingWizard.tsx`: selecting a dentist with a restricted schedule/time-off narrows the visible slots.
- Settings hours editor and holidays card: toggling a day closed, toggling a holiday, and adding a custom closure persist and re-render correctly (mock or hit local API).
- Dentist working-hours/time-off screens: add/remove round-trips through the API.

**Manual live verification**
- Full scenario from Steps §9 above, run against the real dev DB before marking done.

---

## Dependencies

- `mvp1/08-appointment-booking-public.md` (booking wizard + availability API this extends)
- `mvp1/28-dentist-schedule-patient-navigation.md` (existing dentist schedule surfaces this may share UI patterns with)
- `dentists.ts` / `dentist_branch_assignments` (existing dentist-branch relationship this builds on)
