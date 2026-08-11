# MVP 1 - Dentra.ph Foundation + Core Dental Operations

## Release objective
Prove Dentra.ph as a real product: Super Admin can onboard clinics/dentists, public pages can be published, patients can book valid appointments, and clinic teams can complete basic dental clinical documentation through the PWA.

## A. Platform/company website
### Included
- home page;
- feature overview;
- pricing/package presentation with placeholder/manual subscription flow;
- clinic directory;
- dentist directory;
- contact/book-demo CTA.

### Acceptance
- public pages are responsive and indexable as intended;
- no protected tenant data appears in public payloads;
- directories show only published records.

## B. Super Admin - `/dentra-admin`
### Dashboard
- clinic count;
- active/suspended/trial counts;
- dentist profile count;
- appointment aggregate count;
- subscription/package summary;
- recent platform actions.

### Clinic management
- create clinic;
- assign/generate unique slug;
- edit account/profile state;
- activate/suspend/archive;
- create branches;
- assign clinic owner/admin;
- assign package and effective dates;
- view effective entitlements;
- add feature override with reason;
- publish/unpublish public microsite.

### Dentist management
- create/invite/link dentist;
- public slug;
- review publication status;
- manage clinic affiliations at platform-support level;
- verification state field (verification workflow can remain manual).

### Package management
- plans;
- feature catalog;
- plan-feature mapping;
- clinic subscription assignment;
- overrides.

### Security
Super Admin platform control does not imply routine access to patient clinical records.

## C. Clinic onboarding and settings
Clinic admin can manage:
- clinic details;
- branch details;
- contact information;
- operating hours;
- service catalog for booking;
- team memberships;
- dentist affiliations;
- public microsite content;
- publication state if policy allows.

## D. Public clinic microsite
Route: `/clinic/[clinicSlug]`

Content:
- clinic name/logo/hero;
- description;
- branches;
- hours;
- services;
- dentist cards;
- contact/social links;
- map link;
- booking CTA.

Clinic admin can update structured content without coding.

## E. Independent dentist profile
Route: `/dentists/[dentistSlug]`

Content:
- name/photo;
- biography;
- specialty/service tags;
- professional information fields;
- affiliated clinics/branches;
- booking-enabled locations;
- booking CTA.

A dentist can exist with zero clinic ownership and be affiliated with multiple clinics.

## F. Appointment booking
### Clinic route
`/clinic/[clinicSlug]/appointment`

Flow:
1. branch;
2. service;
3. dentist or any available;
4. date;
5. available slot;
6. patient contact/reason;
7. validation;
8. server re-check;
9. appointment created;
10. confirmation.

### Dentist route
`/dentists/[dentistSlug]/appointment`

Flow:
1. clinic/branch affiliation;
2. service;
3. date;
4. slot;
5. patient details;
6. confirmation.

### Calendar management
Clinic PWA supports:
- day/week/list views (at least one calendar + list);
- filters by branch/dentist/status;
- create/edit/reschedule;
- check-in;
- status transitions;
- cancellation/no-show.

### Acceptance
- overlapping bookings are rejected;
- public availability reveals slots, not other patient details;
- invalid/inactive clinic/dentist/service cannot be booked;
- appointment status history is retained.

## G. Authentication and roles
Initial clinic roles:
- Clinic Owner/Admin;
- Dentist;
- Receptionist/Assistant.

Must support future permission expansion without schema rewrite.

Requirements:
- login;
- logout;
- password recovery/invite flow as supported;
- session expiration;
- backend role checks;
- tenant membership resolution.

## H. Clinic PWA
Route root: `/app`

Requirements:
- installable;
- mobile/tablet/desktop responsive;
- app navigation;
- safe offline fallback;
- no protected clinical offline cache;
- visible current clinic/branch context where relevant;
- module navigation respects entitlements.

## I. Patient management
### Patient list/search
- patient number;
- name;
- contact;
- status;
- last/next appointment summary.

### Patient profile
- demographics;
- contact/address;
- emergency contact;
- guardian for minor where needed;
- appointment history;
- clinical navigation.

### Medical history
Baseline questionnaire fields may include allergies, medications, major conditions, pregnancy where relevant, physician information, and notes. Store version/time/actor rather than silently replacing all historical context.

### Dental history
Last dental visit, prior treatment, sensitivity, gum bleeding, pain, oral habits, orthodontic history, concerns, and notes.

## J. Clinical encounter
Each visit can create an encounter containing:
- branch;
- patient;
- dentist;
- appointment link;
- date;
- chief complaint;
- examination/findings;
- assessment/diagnosis;
- procedures/treatments;
- recommendations;
- notes;
- audit timestamps.

Define draft/final behavior before launch; MVP may start with editable records plus audit history if signing/locking would delay release.

## K. Odontogram
MVP 1 adult chart:
- tooth selection;
- surface selection where applicable;
- conditions/procedures;
- note;
- dentist/date;
- encounter link;
- current-state projection;
- event history.

Pediatric chart is stretch scope or early MVP 2.

## L. Treatment record
- procedure/service;
- tooth/area;
- encounter;
- dentist;
- date;
- notes.

This records work already performed. Planned future treatment is MVP 2 treatment planning.

## M. Basic clinic dashboard
- today's appointments;
- checked-in/waiting;
- completed appointments;
- upcoming appointments;
- total active patients;
- quick links.

## N. Audit baseline
Audit:
- clinic create/suspend/reactivate;
- role/membership changes;
- plan/entitlement changes;
- appointment status changes;
- encounter/treatment changes;
- odontogram events/corrections.

## O. Explicit exclusions
- online payment gateway;
- full billing/invoicing;
- inventory;
- automated SMS;
- patient login/portal;
- public reviews;
- custom domains;
- advanced analytics;
- true offline clinical editing;
- insurance/HMO claims.

## P. MVP 1 recommended delivery increments
### Increment 1 - Platform skeleton
Repo, auth, tenancy, Super Admin basic clinic creation, plans/features, public clinic route, PWA shell.

### Increment 2 - Dentist + scheduling
Dentists, assignments, services, availability, public clinic/dentist booking, calendar.

### Increment 3 - Patient + clinical
Patients, histories, encounters, treatments, odontogram, audit.

### Increment 4 - hardening/demo
Permission matrix, entitlement denials, cross-tenant tests, PWA safety, responsive QA, synthetic demo data.

## Q. MVP 1 release gates
- Clinic A cannot read/write Clinic B protected records.
- User cannot gain access by editing `clinicId`/`patientId` in requests.
- Entitlement denial is enforced by API.
- Dentist assigned to multiple clinics keeps records separated by tenant.
- Public clinic/dentist pages expose only publishable data.
- Booking conflict test passes.
- Odontogram history remains after updates/corrections.
- Protected patient data is not cached for offline PWA access.
- Audit entries exist for defined sensitive actions.
- All demo data is synthetic.
