# MVP 1 Overview — Foundation + Core Dental Operations

**Release objective:** Prove Dentra.ph as a real product. Super Admin can onboard clinics and dentists, public pages are published, patients can book valid appointments, and clinic teams can complete basic dental clinical documentation through the PWA.

---

## Delivery increments

| Increment | Scope |
|-----------|-------|
| **Increment 1 — Platform skeleton** | Repo, auth, tenancy, Super Admin basic clinic creation, plans/features, public clinic route, PWA shell |
| **Increment 2 — Dentist + scheduling** | Dentists, assignments, services, availability, public clinic/dentist booking, appointment calendar |
| **Increment 3 — Patient + clinical** | Patients, histories, encounters, treatments, odontogram, audit |
| **Increment 4 — Hardening/demo** | Permission matrix, entitlement denials, cross-tenant tests, PWA safety, responsive QA, synthetic demo data |
| **Increment 5 — Business basics** | Billing lite (invoices + receipts), prescription builder (e-Rx), clinical file uploads — promoted from MVP 2 to align with executive proposal's MVP scope |

---

## Task checklist

| File | What | Status |
|------|------|--------|
| `01-platform-foundation.md` | PostgreSQL, Fastify API, Better Auth, real sessions | 🔵 Active |
| `02-super-admin-clinic-management.md` | Clinic CRUD, branches, package assignment, entitlements | 📋 Draft |
| `03-super-admin-dentist-management.md` | Dentist CRUD, affiliations, verification | 🔲 Queued |
| `04-super-admin-package-management.md` | Plans, feature catalog, overrides | 🔲 Queued |
| `05-public-landing-site.md` | Landing page refinement, clinic/dentist directories | 🔲 Queued |
| `06-clinic-microsite.md` | `/clinic/[slug]` public page | 🔲 Queued |
| `07-dentist-profile-page.md` | `/dentists/[slug]` public page | 🔲 Queued |
| `08-appointment-booking-public.md` | Public booking flows, conflict validation | 🔲 Queued |
| `09-clinic-pwa-shell.md` | PWA manifest, installable, offline fallback | 🔵 Active |
| `10-patient-management.md` | Patient list, profile, medical/dental history | 🔲 Queued |
| `11-clinical-encounter.md` | Encounter form, chief complaint, findings, procedures | 🔲 Queued |
| `12-odontogram.md` | Adult tooth chart, surface selection, history | 🔲 Queued |
| `13-treatment-records.md` | Treatment logging per encounter | 🔲 Queued |
| `14-clinic-dashboard-live.md` | Dashboard with live data from API | 🔲 Queued |
| `15-audit-baseline.md` | Audit entries for all defined sensitive actions | 🔲 Queued |
| `16-hardening-and-demo-data.md` | Security/entitlement QA, synthetic demo data | 🔲 Queued |
| `17-dentra-brand-migration.md` | Dentra.ph naming, approved logos, metadata, and PWA branding | ✅ Done |
| `18-inter-typography.md` | Align Inter typography and Lucide React icons with the updated brand reference | ✅ Done |
| `19-billing-lite.md` | Service pricing, invoice generation, single-payment, receipt PDF | 🔲 Queued |
| `20-prescriptions-erx.md` | Prescription builder, immutable snapshot, PDF output | 🔲 Queued |
| `21-file-uploads-clinical.md` | X-rays, photos, consent forms — private Object Storage, signed URLs | 🔲 Queued |

---

## Release gates (from `docs/MVP_1.md`)

- Clinic A cannot read/write Clinic B's protected records.
- User cannot gain elevated access by editing `clinicId`/`patientId` in requests.
- Entitlement denial is enforced at the API, not just in the UI.
- Dentist assigned to multiple clinics keeps records separated by tenant.
- Public clinic/dentist pages expose only publishable data.
- Booking conflict test passes.
- Odontogram history is preserved after corrections.
- Protected patient data is not cached for offline PWA access.
- Audit entries exist for all defined sensitive actions.
- All demo data is synthetic.

---

## Explicit exclusions (MVP 1 does NOT include)

- Online payment gateway
- Full billing (partial payments, refunds, discounts) — lite invoicing included in Increment 5
- Inventory
- Automated SMS
- Patient login/portal
- Public reviews
- Custom domains
- Advanced analytics
- True offline clinical editing
- Insurance/HMO claims
- AI features (MVP 2)
- Tele-dentistry (MVP 2)
