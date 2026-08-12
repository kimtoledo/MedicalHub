# Dentist Self-Service Professional Profile

> **Status:** 🔲 Queued
> **Priority:** P1

## What & Why

Replace `/app/dentist/profile` with a secure dentist-owned professional profile editor while keeping verification and clinic affiliations controlled by their proper workflows.

## Done looks like

- Dentist can view/update biography, specialty, professional contact details, photo URL, and PRC/license information.
- Slug, verification status, publication status, and clinic/branch affiliations are clearly read-only or request-based.
- API derives the dentist identity from the authenticated membership; no client-supplied dentist ID is authoritative.
- Updates are validated, tenant-aware where applicable, and audited by changed field names only.
- Public-profile preview and publication-readiness checklist are available.
- Responsive loading, validation, unsaved, success, and error states are implemented and tested.

## Out of scope

- Verification approval and direct affiliation mutation by the dentist.
