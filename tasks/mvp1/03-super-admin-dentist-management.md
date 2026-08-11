# Super Admin — Dentist Management

> **Status:** 🔄 In progress — steps 1–2 of 5 complete

---

## What & Why

Super Admin needs to create dentist accounts, link them to clinics, and manage their public profile and verification state. Dentists are a separate entity from clinic staff — a dentist can exist independently with zero clinic ownership and can be affiliated with multiple clinics.

---

## Done looks like

- `/dentra-admin/dentists` shows a live, searchable table of all dentists with columns for name, slug, verification status, affiliated clinic count, and profile publication status.
- Super Admin can create a dentist account (name, public slug, PRC number, specialty).
- Super Admin can link/unlink a dentist to a clinic branch from the dentist detail page.
- Super Admin can set the dentist's verification state (unverified → verified, or revoke).
- Super Admin can publish/unpublish the dentist's public profile.
- The current stub page at `/dentra-admin/dentists` is replaced with real functionality.

---

## Out of scope

- Dentist self-registration and document upload (MVP 3 verification workflow).
- Dentist login and clinical features (those are in the Clinic PWA).

---

## Steps

1. **Dentist list page** — ✅ `/dentra-admin/dentists` is wired to protected `GET /v1/admin/dentists` with search, verification filtering, pagination, distinct active clinic-affiliation counts, and publication status.
2. **Create dentist form** — ✅ An accessible slide-over validates and creates unverified private dentist profiles through protected `POST /v1/admin/dentists`; duplicate slugs are rejected and creation is audited.
3. **Dentist detail page** — show profile info, clinic affiliations, verification state, and publication status.
4. **Affiliation management** — add/remove clinic-branch affiliations from the detail page.
5. **Verification and publication actions** — verify/revoke and publish/unpublish buttons with confirmation dialogs.
