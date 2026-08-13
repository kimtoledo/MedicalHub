# Verification Submission and Moderation UI

> **Status:** ✅ Done
> **Priority:** P1

## What & Why

Expose the verification backend through private clinic/dentist submission pages and a Super Admin review queue.

## Done looks like

- Clinic and dentist users can submit required document metadata/files and track status/reasons/expiry.
- Super Admin queue supports pending, approved, rejected, revoked, and expiring filters.
- Review detail keeps documents private and requires written reasons for decisions.
- Public pages show only approved trust badges, never document references.
- Upload/access authorization, audit records, responsive states, and tests are complete.

## Dependencies

- `mvp3/03-verification-moderation.md` API baseline.
- Private object-storage workflow from clinical files, adapted for non-clinical verification documents.
