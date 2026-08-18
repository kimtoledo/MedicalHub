# Dentist PRC Linking, Verification, and Email Preview

> **Status:** ✅ Done — presentation-ready Super Admin transaction flow delivered; Replit task reference unavailable in the current Codex session

---

## What & Why

Dentist professional profiles and clinic login memberships are intentionally separate, but the current Super Admin workflow can assign the `dentist` role without linking the login to the dentist profile. Verification decisions are audited, yet the dentist detail page does not expose the safe decision controls, and platform email content cannot be reviewed before an email provider is connected.

For a clean onboarding demonstration, Super Admin needs one understandable path from a PRC-identified professional profile to clinic access, verification, and an inspectable email communication record.

---

## Scope

- Treat the PRC license number as the professional matching identifier while keeping email/credentials as the authentication mechanism.
- Prevent duplicate non-empty PRC license numbers at the database and service boundaries.
- Show clinic-affiliated dentist profiles, PRC numbers, and verification state when a Dentist user is added.
- Require a Dentist-role membership to link to an actively affiliated dentist profile and persist `clinic_memberships.dentist_id`.
- Expose Super Admin verify/revoke controls with a required written reason and immutable audit metadata.
- Snapshot Dentra.ph-owned verification decision email content into the notification outbox in preview/held mode.
- Add a Super Admin Email Logs workspace with status/type/date/search filters and exact subject/body preview.
- Do not expose uploaded verification documents or private document URLs in email content.

---

## Presentation flow

1. Create or locate one global dentist profile by PRC license number.
2. Affiliate that profile with the clinic branches where the dentist accepts appointments.
3. Add the clinic user with the Dentist role and select the matching professional profile.
4. Review or directly update verification with a written reason.
5. Open Email Logs and inspect the exact held email content and delivery metadata.
6. Sign in as the linked dentist and manage branch-specific working hours and clinical work without creating another profile.

---

## Done looks like

1. A Dentist-role membership cannot be created without a valid clinic-affiliated dentist profile.
2. The same professional profile can be used across multiple clinics and branches without duplicate PRC records.
3. Super Admin verification changes require a reason, update the dentist state, and create an audit entry.
4. Every verification decision with a recipient creates a held email snapshot that is never sent automatically.
5. Super Admin can filter and inspect email recipient, subject, body, status, attempts, timestamps, and errors.
6. Migration, API tests, web tests, typechecks, builds, and database readiness checks pass.

---

## Explicit non-goals

- Authenticating a dentist with a PRC number alone.
- Automatically accepting a clinic affiliation on the dentist's behalf.
- Sending platform emails before a platform provider and sender identity are configured.
- Including PRC documents or protected document links in an email.

---

## Delivered

- Normalized, unique PRC license numbers for newly created dentist profiles, backed by migration `0049_volatile_jack_power`.
- Required PRC-profile selection whenever clinic or Super Admin staff management creates/updates a Dentist-role membership.
- Clinic/branch affiliation checks before `clinic_memberships.dentist_id` can be linked, including additional branch assignments.
- Super Admin verify/revoke actions with mandatory reasons, immutable audit metadata, and held email snapshots.
- Verification-submission review emails for approved, rejected, and revoked dentist decisions.
- Super Admin `/dentra-admin/email-logs` workspace with filters, delivery metadata, and exact saved subject/body preview.
- API route protection, focused and full regression tests, repository typechecks, production builds, live health/auth smoke checks, and database readiness validation.
