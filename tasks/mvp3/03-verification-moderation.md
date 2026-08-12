# Verification and Moderation

> **Status:** ✅ Done — MVP 3 baseline

---

## What & Why

Trust is critical in healthcare. Patients need to know that dentists and clinics on Dentra.ph are real and licensed. A formal verification workflow adds a "Verified" badge to profiles that have passed document review.

---

## Done looks like

- Dentists can submit verification documents (PRC ID photo, PTR, S2) through the platform.
- Clinics can submit their DOH/LGU permits and business registration documents.
- Super Admin reviews submissions and approves or rejects with a written reason.
- Verified profiles display a trust badge on their public pages.
- Verification has an expiry strategy — the system alerts Super Admin when a verification is approaching expiry.
- Revoked verifications remove the badge and log the reason in the audit trail.
- Submission documents are stored privately and never exposed publicly.

### Delivered

- Added private verification submission metadata for dentists and clinics with document storage-key references, pending/reviewed/revoked states, expiry dates, and review reasons.
- Added clinic/dentist submission and Super Admin review APIs; approval updates the public trust status and every decision is audited.
- Public directory queries continue to require verified dentists; clinic verification is exposed as a trust-status field without exposing documents.

---

## Out of scope

- Automated document verification (manual Super Admin review for MVP 3).
- Third-party identity verification services (can be integrated in a later iteration).
