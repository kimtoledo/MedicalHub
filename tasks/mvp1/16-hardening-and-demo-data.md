# Hardening + Demo Data

> **Status:** ✅ Done

---

## What & Why

Before MVP 1 can be called done, every release gate must pass and the app must be demo-able with realistic synthetic data. No real patient or clinic data should be used — all demo content must be clearly synthetic.

---

## Done looks like

Every release gate in `docs/MVP_1.md` passes:

- Clinic A cannot read/write Clinic B's protected records (tested with direct API calls, not just UI).
- User cannot gain elevated access by editing `clinicId`/`patientId` in request bodies — API rejects unauthorized cross-tenant requests.
- Entitlement denial is enforced at the API — a disabled feature returns 403 when called directly, not just hidden in the UI.
- Dentist assigned to multiple clinics sees records properly separated by clinic.
- Public clinic/dentist pages return 404 for unpublished records.
- Booking conflict test: two simultaneous booking attempts for the same slot result in exactly one success and one rejection.
- Odontogram history is preserved after corrections — no overwrite.
- No protected patient data is present in the service worker cache.
- Audit entries exist for all defined sensitive actions.
- All demo data is clearly synthetic (fictional names, Philippine test phone numbers, fake PRC numbers).

---

## Out of scope

- Penetration testing (recommend a professional security review before any real patient data is processed).
- Load/performance testing.

---

## Steps

1. ✅ **Seed script** — the idempotent seed creates a synthetic Super Admin, 2 clinics, 4 dentists, 20 patients, and 50 appointments on a clean database; the Professional demo package includes the MVP 1 billing, prescription, and clinical-file entitlements.
2. ✅ **Cross-tenant API tests** — direct route suites cover patient, encounter, odontogram, dashboard, settings, workspace, billing, prescriptions, and clinical-file isolation plus server-owned scope fields; upload validation verifies the patient, branch, and encounter relationship before storage.
3. ✅ **Entitlement denial tests** — disabled patient/clinical, billing, payment, prescription, and clinical-file calls return `403 ENTITLEMENT_REQUIRED` before domain queries execute.
4. ✅ **Conflict booking test** — concurrent same-dentist/same-slot requests produce exactly one success and one conflict in both automated HTTP and live database verification.
5. ✅ **PWA cache audit** — `/api/*` and `/v1/*` remain network-only and an automated static release test guards the shell cache allowlist.
6. ✅ **Responsive QA** — clinic PWA, Super Admin audit, and public clinic surfaces were rendered and inspected at 375×812, 768×1024, and 1280×900 with no document overflow.

Detailed evidence is recorded in `docs/MVP1_RELEASE_CHECKLIST.md`.
