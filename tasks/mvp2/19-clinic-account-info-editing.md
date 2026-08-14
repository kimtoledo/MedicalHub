# Clinic Account Info Editing (Super Admin)

> **Status:** ✅ Done

---

## What & Why

The Super Admin clinic detail page (`apps/web/app/(admin)/dentra-admin/(shell)/clinics/[clinicId]/page.tsx`) shows an "Account information" section — name, slug, contact email/phone, address, description, website, logo — but every field is read-only `<dd>` text. Super Admin already has full lifecycle control over a clinic (status, package, feature overrides, publication) but cannot correct a typo in a clinic's name or update a changed contact email/address without going around the app (e.g. directly in the database). This closes that gap with a proper edit form.

---

## Done looks like

- On the Super Admin clinic detail page, the Account information section has an "Edit" action that opens an editable form (inline or modal — match the existing page's UI pattern for other clinic actions, e.g. `ClinicStatusActions`/`ClinicPackageAction`).
- Editable fields: **name, slug, contact email, contact phone** (basic info); **address, city, province** (address); **website, description, logo** (web presence).
- Only the `super_admin` platform role can edit — `platform_support` remains read-only, matching the existing role split used elsewhere in the admin panel.
- Saving validates input (e.g. slug uniqueness/format, email format, URL format for website/logo) and persists via a new `PATCH /v1/admin/clinics/:clinicId` route.
- Every successful edit writes an `audit_events` entry using the existing (currently unused) `AuditAction.CLINIC_UPDATED` ('clinic.updated'), recording which fields changed.
- Changing the slug does not break the clinic's existing public microsite URL history/links silently — needs an explicit decision during implementation (e.g. redirect old slug, or block slug edits if already published).

---

## Out of scope

- Editing package/subscription, feature overrides, status, or branches — already covered by existing actions on the same page.
- Bulk/multi-clinic edit.
- Clinic-side (non-admin) self-service editing of this same info — that's a separate concern from clinic settings, not Super Admin.

---

## Steps

1. **API route** — ✅ `PATCH /v1/admin/clinics/:clinicId` in `apps/api/src/routes/admin-clinics.ts`, zod-validated, `super_admin`-only.
2. **Service** — ✅ `createAdminClinicAccountUpdateService` in `apps/api/src/admin/clinics-service.ts`: transactional partial update, slug pre-check + unique-constraint catch (reusing the same pattern as clinic creation), `CLINIC_UPDATED` audit write with a `changedFields`/`previous`/`next` diff.
3. **Edit form UI** — ✅ `ClinicAccountInfoAction.tsx`, modeled on `ClinicStatusActions.tsx`'s modal pattern with actual form fields.
4. **Slug-change handling** — ✅ Decided: slug is editable only while `publicationStatus === 'draft'`; locked (409 `SLUG_LOCKED`, enforced server-side, not just in the UI) once a clinic's microsite has been published, since no slug-redirect mechanism exists.
5. **Tests** — ✅ `apps/api/test/admin-clinics.test.ts`: `platform_support` → 403 (service not called), `super_admin` succeeds, `SLUG_TAKEN`/`SLUG_LOCKED`/`CLINIC_NOT_FOUND` → correct status codes.
6. **Live verification** — ✅ Smoke-tested against the real dev servers/DB (login, PATCH via both the raw API and the Next.js proxy, slug-lock on a published clinic). This surfaced and fixed a real bug: the initial zod schema collapsed "field omitted from the request" into "field explicitly cleared to null" for every optional text/url field, so any partial update silently wiped every field not included in that request. Fixed with PATCH-safe schema variants (`optionalPatchText`/`optionalPatchUrl`) that preserve the absent-vs-explicitly-null distinction.
