# Hardening + Demo Data

> **Status:** 🔲 Queued — no project task yet (Increment 4 from MVP 1 plan)

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

1. **Seed script** — write `scripts/seed-demo.ts` that creates a synthetic Super Admin, 2 demo clinics, 4 dentists, 20 patients, and 50 appointments.
2. **Cross-tenant API tests** — write automated test cases for each release gate involving tenant isolation.
3. **Entitlement denial tests** — verify 403 responses for features disabled in the test clinic's package.
4. **Conflict booking test** — write a test that fires two concurrent booking requests for the same slot.
5. **PWA cache audit** — inspect service worker cache in dev tools and confirm no clinical API responses are stored.
6. **Responsive QA** — verify all pages on 375 px (iPhone SE), 768 px (iPad), and 1280 px (laptop) breakpoints.
