# Dentra.ph User Guide

This is the general operating manual for Dentra.ph. It explains which product surface to use, how the platform separates public, clinic, patient, and platform-admin work, and where to find the detailed role manuals:

- [Super Admin manual](USER_GUIDE_SUPER_ADMIN.md)
- [Clinic staff and dentist manual](USER_GUIDE_CLINICS.md)
- [Patient manual](USER_GUIDE_PATIENTS.md)

The guide describes the current repository implementation. Some MVP 2 and MVP 3 capabilities are available as a baseline while provider integrations, security reviews, or additional UI work are still pending; those limits are called out explicitly.

## 1. Product surfaces

| Surface | URL (local) | Who uses it | Purpose |
|---|---|---|---|
| Company website | `http://localhost:5000/` | Everyone | Product information and entry point |
| Clinic directory | `/clinics` | Public visitors | Search published clinics |
| Dentist directory | `/dentists` | Public visitors | Search verified, published dentists |
| Clinic microsite | `/clinic/{clinicSlug}` | Public visitors | Clinic profile, branches, services, team, and booking |
| Dentist profile | `/dentists/{dentistSlug}` | Public visitors | Dentist profile and affiliated clinics |
| Public booking | `/clinic/{clinicSlug}/appointment` | Patients and visitors | Request an appointment |
| Remote consultation | `/consult/{clinicId}` | Patients and visitors | Submit a photo consultation request |
| Patient portal | `/portal` | Patients | View explicitly linked appointments, invoices, and plan summaries |
| Clinic login | `/cl-login` | Clinic users | Sign in to the clinic PWA |
| Clinic PWA | `/app` | Clinic users | Run daily clinic, clinical, billing, and reporting work |
| Super Admin login | `/dentra-admin/login` | Super Admin | Manage the platform and clinic lifecycle |
| Super Admin panel | `/dentra-admin/*` | Super Admin | Clinics, dentists, packages, subscriptions, and audit |
| Kiosk check-in | `/kiosk/{branchId}` | Clinic visitors | Branch-specific, today-only self check-in |

For production, replace `http://localhost:5000` with the configured Dentra.ph frontend domain. The API is normally behind the frontend proxy; direct local API health checks use `http://localhost:3001/health` and `http://localhost:3001/v1/health`.

## 2. Account types and boundaries

### Public visitor

No account is required to browse published profiles, request a public appointment, submit a remote consultation, or use an enabled branch kiosk. Public pages only show fields the clinic or dentist has published.

### Patient account

A patient account is separate from clinic staff authentication. A patient can sign up with an email address or mobile number, then explicitly link a clinic record using the clinic/patient matching information requested by the portal. A patient account does not automatically expose records from every clinic that has a similar name, email, or phone number.

### Clinic user

Clinic users sign in through `/cl-login`. Their access is determined by a server-side clinic membership, role, branch assignment, and feature entitlement. The browser cannot grant itself a role or switch a tenant by changing a URL parameter.

Current clinic roles:

- Clinic Owner — clinic-wide administration and business responsibility.
- Clinic Admin — day-to-day administration and settings.
- Dentist — assigned clinical work and dentist-specific schedules.
- Receptionist — appointments and patient/front-desk workflows.
- Dental Assistant — permitted patient and clinical support workflows.
- Cashier — billing and payment workflows enabled for the role.
- Inventory Staff — inventory workflows enabled for the role.

### Super Admin

Super Admin manages platform entities, package/entitlement configuration, clinic status, moderation, and operational requests. Super Admin is not automatically a routine viewer of clinic clinical records. Support access must follow the written-justification and approval workflow.

## 3. Sign-in and session basics

1. Open the correct login route for your role.
2. Enter the email address and password assigned to that account.
3. Submit the form once and wait for the redirect; repeated clicks can create confusing duplicate requests.
4. If you are redirected back to login, check that the API is running and that cookies are allowed for the configured frontend/API origins.
5. Sign out from the profile or account control when using a shared computer.

Staff and Super Admin sessions use Better Auth server-side sessions and HTTP-only cookies. Patient portal sessions use a separate patient session cookie. Do not copy, paste, or share cookie values or API tokens.

### Demo credentials

The seed process reads passwords from environment variables; the passwords are intentionally not stored in this guide.

| Account | Email | Password source |
|---|---|---|
| Super Admin | `admin@dentra.ph` | `SUPER_ADMIN_PASSWORD` |
| Smile Bright clinic admin | `admin@smilebrightdental.ph` | `CLINIC_DEMO_PASSWORD` |
| BrightSmile clinic admin | `admin@brightsmile.ph` | `CLINIC_DEMO_PASSWORD` |
| Demo dentist | `dr.reyes@smilebrightdental.ph` | `CLINIC_DEMO_PASSWORD` |

These are synthetic demo identities. Never use the demo passwords in production.

## 4. Core operating flow

The normal clinic workflow is:

1. Publish a clinic, branch, services, and dentist profiles.
2. Receive a public booking or create an appointment from the clinic PWA.
3. Find or create the patient inside the correct clinic tenant.
4. Confirm the appointment and check the patient in on arrival.
5. Open or create the encounter, record clinical findings, treatment, and odontogram events.
6. Create an invoice from the performed work or treatment plan.
7. Record payment, issue a prescription if required, and attach private clinical files.
8. Schedule a recall/follow-up and review reports or inventory queues.
9. Keep the audit trail and patient/clinic boundaries intact.

Do not use a public URL, browser storage flag, or direct database edit to bypass a missing step. If a feature is unavailable, check the role and entitlement first, then ask a clinic admin or Super Admin to review access.

## 5. Privacy and safety rules

- Select the clinic and branch carefully before reading or changing a patient record.
- Never assume that matching phone numbers or names mean two records are the same patient across clinics.
- Do not put clinical notes, diagnoses, prescriptions, payment secrets, API keys, or signed file URLs in screenshots, chat, logs, or support tickets.
- Clinical uploads are private and served through short-lived access; do not copy them to public storage.
- Confirm patient identity before showing an invoice, treatment plan, prescription, or file.
- Use the kiosk only on a clinic-controlled device. It displays only today’s appointment-safe information and resets after inactivity.
- AI output is advisory. A dentist must review and confirm any clinical decision; AI output never replaces professional judgment.
- Offline clinical PHI caching is not enabled. Do not install browser extensions or custom service workers that cache protected records.
- Use refunds, adjustments, status changes, permission changes, and support access only for their stated purpose. These actions are audited.

## 6. Common status meanings

### Appointment statuses

`pending` means a request has not been confirmed; `confirmed` means the clinic accepted it; `checked_in` means the patient arrived; `in_progress` means the encounter is underway; `completed` means the visit is finished; `cancelled` and `no_show` are terminal operational outcomes; `rescheduled` indicates the schedule changed.

### Invoice statuses

`pending` means there is an outstanding balance; `paid` means the system recorded payment; `voided` means the invoice is no longer collectible. Partial payment and refund/adjustment records are retained as transactions.

### Verification/review statuses

Verification and review queues distinguish pending, approved, rejected, revoked, and disabled states. A pending submission or review is not a public approval.

## 7. Troubleshooting checklist

1. Confirm both processes are running: `npm run dev` (frontend) and `npm run api:dev` (API).
2. Open `http://localhost:3001/health` and `http://localhost:3001/v1/health`.
3. Confirm `.env` has `DATABASE_URL`, an auth secret of at least 32 characters, and the correct frontend/API URLs.
4. If a database feature is missing, run `npm run db:migrate` against the intended development database.
5. If a seeded account fails, verify the relevant password variable and re-run `npm run db:seed`; never paste a production password into a ticket.
6. If a request returns `401`, sign in again. If it returns `403`, ask an administrator to check role, branch scope, and entitlement. If it returns `404`, verify the clinic/branch/patient belongs to the selected tenant.
7. If a public page is empty, check publication status and whether the clinic/dentist is verified and active.
8. If a file will not open, request a new short-lived URL rather than reusing an old signed link.

## 8. Support handoff template

When reporting an issue, include:

- Surface and route (for example `/app/appointments` or `/dentra-admin/clinics`).
- Clinic and branch name, but not clinical content or patient full name unless the approved support process requires it.
- Approximate Manila date/time and browser/device.
- Visible error code/message and the action immediately before it.
- Whether the issue affects one user, one branch, or every clinic.
- Screenshot with identifiers, tokens, cookies, and clinical data redacted.

Never attach `.env`, database dumps, raw request headers, browser cookies, API keys, or private clinical files.
