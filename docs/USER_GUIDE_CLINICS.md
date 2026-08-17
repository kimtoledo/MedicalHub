# Dentra.ph Clinic Staff and Dentist Manual

This manual covers the clinic PWA at `/app`. It applies to Clinic Owners, Clinic Admins, Dentists, Receptionists, Dental Assistants, Cashiers, and Inventory Staff. The screen a user sees depends on both their clinic membership and enabled feature entitlements.

## 1. First-time clinic setup

Clinic Owner/Admin should complete these steps before accepting public bookings:

1. Sign in at `/cl-login`.
2. Open **Profile/Settings** and verify clinic name, contact details, address, city/province, website, map link, social links, and public description.
3. Confirm every branch is active, has the correct address, contact information, operating hours, and coordinates when discovery is enabled.
4. Add or confirm services, duration, workflow mode (quick or standard), active state, public-booking visibility, and prices.
5. Review dentists, branch affiliations, publication state, and verification state.
6. Configure the public microsite theme, sections, SEO fields, and gallery where available.
7. Add staff memberships and review role/branch scope.
8. Run a synthetic booking and confirm it appears in the dashboard.

Do not publish a clinic until phone, address, hours, services, and booking expectations are correct. A public profile and internal clinic access are separate controls.

## 2. Daily dashboard and appointments

Use `/app` for the daily summary and `/app/appointments` for the schedule.

Clinic staff can use **New appointment** on `/app/appointments` to select an existing patient, service, branch, dentist, date, and available time. The available-time list already accounts for clinic hours, closures, dentist schedules, time off, and existing appointments. Register a missing patient first rather than entering disconnected contact details into an internal appointment.

### Appointment lifecycle

1. **Pending** — review a public request and confirm or cancel it.
2. **Confirmed** — prepare the patient, dentist, branch, service, and time slot.
3. **Checked in** — mark arrival from the appointment list or kiosk.
4. **In progress** — the dentist/authorized staff begins the visit.
5. **Completed** — finalize the visit after records and billing inputs are complete.
6. **Cancelled/no-show** — use the correct terminal state and reason.

The server prevents invalid transitions and conflicting updates. If a status button fails, refresh the appointment and check whether another staff member changed it.

### Schedule safety

- Confirm branch and dentist before booking or moving an appointment.
- Check the Manila date/time shown by the app.
- Never double-book by creating a second record after a conflict response; refresh and choose another slot.
- A dentist’s schedule is limited to their linked dentist profile and authorized branches.

## 3. Patient records

Use `/app/patients` for the clinic patient list and `/app/patients/{patientId}` for a patient profile.

### Create or find a patient

1. Search by patient number, name, phone, or email within the current clinic.
2. Confirm identity before opening the record.
3. If no match exists, create the patient with the clinic’s required demographics and contact details.
4. Avoid creating a duplicate just because a search is slow; retry the search first.
5. Never merge a similar record from another clinic without an approved, explicit workflow.

Medical and dental histories are versioned. Record a new version when information changes; do not silently overwrite a prior clinical history.

### Patient privacy

Patient records, encounters, odontograms, prescriptions, invoices, and private files are tenant-scoped. A clinic user must not use a direct URL to access another clinic’s patient. Report any unexpected record immediately.

## 4. Encounters and clinical documentation

Use `/app/encounters`, `/app/dentist/encounters`, and the patient/encounter detail pages.

1. Create an encounter for the correct clinic, branch, patient, dentist, and date.
2. Enter chief complaint, examination, assessment, procedures, recommendations, and notes as appropriate.
3. Use structured treatment records for performed services rather than putting every charge only in free text.
4. Keep draft work in `draft` until reviewed.
5. Finalize only after checking the clinical content; finalized encounters and associated treatments are protected from casual editing.
6. Use AI suggestions only as review assistance. A dentist must edit/accept the final note and remains responsible for the clinical record.

### Odontogram

Use `/app/dentist/odontogram` or the patient’s odontogram view to record tooth/surface events. Odontogram history is append-only; corrections create a new correction event rather than deleting the original. Use the correct FDI tooth reference and condition/procedure code.

### Treatment records

Treatment records validate the encounter, patient, service, dentist, and clinic server-side. Inactive services and finalized encounters cannot accept new treatment records. Complete treatment records can feed recall and treatment-plan progress.

Use `/app/treatments` for the clinic-wide service-record list. It defaults to the last 30 days and the active branch, and supports patient/service search plus branch, dentist, service, and workflow filters.

### Quick services

Clinic Owner/Admin can mark routine services such as cleaning, braces adjustment, fluoride application, or a simple consultation as **Quick service** from `/app/settings/services`. Standard remains the safe default for existing and clinically complex services.

For a linked patient appointment using a quick service, an authorized dentist or clinic administrator can choose **Complete quick service** from the appointment detail. Patient, service, branch, dentist, and time are prefilled; tooth/area and a short note are optional. Confirmation atomically creates and finalizes the encounter, records the treatment, and completes the appointment. Use the full encounter workflow whenever detailed findings, assessment, recommendations, prescriptions, files, or odontogram work are needed. Generate an invoice separately after reviewing price, HMO, and discount requirements.

## 5. Treatment plans

Use the treatment-plan controls from the patient or dentist workspace when the `clinical.treatment_plans` entitlement is enabled.

1. Create a plan for the correct patient and clinic.
2. Add itemized procedures, priority, proposed price, tooth/area, and notes.
3. Keep the plan in draft while discussing options.
4. Approve only after the patient-facing proposal is reviewed.
5. Mark individual items started, completed, or cancelled as work progresses.
6. Archive superseded plans; do not delete history to hide an earlier proposal.

The billing workflow uses immutable invoice line-item snapshots. Changing a service price later does not rewrite an old invoice.

## 6. Billing and payments

Use `/app/billing`, `/app/billing/new`, and the invoice detail screen.

### Create an invoice

1. Select the clinic and patient.
2. Add performed services or treatment-plan items.
3. Confirm effective branch pricing, subtotal, permitted discount reason/amount, and total.
4. Review the invoice before saving.
5. Give the patient the invoice/receipt through the approved channel.

### Record payment

1. Open the invoice and choose the actual payment method.
2. Enter the amount received; the server calculates the remaining balance.
3. Use separate payment entries for installments.
4. Confirm the updated status and remaining balance.
5. Never mark an invoice paid just because a patient says they initiated a transfer; wait for verified payment evidence.

Refunds and adjustments require a reason and are audited. Do not edit old payment transactions to correct a mistake; use the supported refund/adjustment action.

### Online payment links

Clinic admin/cashier can create an expiring payment link where the billing entitlement is enabled. Share only the link itself through an approved patient channel. Provider webhooks are HMAC-verified and idempotent; provider credentials are environment-managed and must not be entered into a note.

## 7. Prescriptions and clinical files

### Prescriptions

Use `/app/prescriptions` or create from a finalized encounter. Verify patient identity, medicine, strength, dosage, frequency, duration, instructions, dentist identity, and PRC details before issuing. Issued prescriptions are immutable; use the amendment flow for a correction and preserve the original.

### Clinical files

Use the patient/encounter file controls for X-rays, intraoral/extraoral photos, consent forms, lab results, referrals, and other private attachments.

- Upload only the file type and patient/encounter intended.
- Confirm the branch and clinic before upload.
- Do not paste a signed file URL into a public page.
- Signed links are short-lived; request a new link when one expires.
- Delete only when policy permits; file actions are audited.

## 8. Recalls, reports, and notifications

### Recalls

Use `/app/recalls` to view due/upcoming follow-ups. Dentists/admins can configure recall rules and due-date overrides. Front desk can contact, dismiss, or book a follow-up when permitted. A treatment record can create a deduplicated recall.

### Reports

Use `/app/reports` for operational, financial, inventory, and (when enabled) advanced analytics. Reports are summaries, not a replacement for the source record. Check date range and branch context before exporting CSV.

### Notifications

Booking confirmation and notification outbox records are non-sensitive operational messages. Provider credentials, reminder scheduling, and some cancellation/reschedule delivery remain deployment work. Do not promise a patient that an SMS/email was delivered solely because it was queued.

## 9. Inventory and HMO claims

### Inventory

Inventory Staff or authorized admins use `/app/settings/inventory`. Maintain item master, SKU/category/unit, supplier, reorder level, and active state. Stock-in, stock-out, and adjustments are immutable ledger transactions. Never use a negative adjustment to hide an unexplained discrepancy; document the reason and escalate.

### HMO/insurance

Use `/app/settings/hmo-payers`, `/app/billing/hmo-claims`, and the patient HMO section. Confirm payer, membership number, patient, invoice, encounter, and covered amount before submitting. The claim state follows the supported transition order; paid claims reconcile atomically against the invoice.

## 10. Remote consultation and AI assistance

Patients submit remote photos at `/consult/{clinicId}`. Dentists review the queue at `/app/dentist/remote-consults`. Treat uploaded photos as private clinical material, review the assessment, and close the request only after the intended follow-up is recorded.

AI note, recall, and treatment-sequence suggestions are review-only. They are metadata-audited, may be unavailable when no provider is configured, and must never be copied into a final record without dentist review.

## 11. Clinic settings, roles, and subscriptions

Clinic Owner/Admin can use `/app/settings`, `/app/staff`, and `/app/settings/subscription` where enabled.

- Review staff roles and branch assignments before granting access.
- Use permission overrides for a specific documented exception.
- Cashier should not be given clinical-record access merely to collect payment.
- Inventory Staff should not receive billing or clinical permissions unless explicitly required.
- Subscription feature availability comes from entitlement keys; a visible menu item is not proof that an API action is allowed.
- Subscription upgrade/add-on requests should include the business reason and desired effective timing.

## 12. Public microsite, domains, and kiosk

Public clinic settings control theme, brand accent, hero/description, gallery, services/team sections, SEO fields, and publication. Keep public copy free of patient or internal operational data.

For custom domains, add the hostname, publish the supplied DNS TXT record, verify, and activate only after the status is verified. SSL/DNS provider automation may still be pending.

For kiosk check-in, open `/kiosk/{branchId}` on a clinic-controlled tablet. Do not display the kiosk URL publicly with a wrong branch ID. The kiosk accepts patient number or last name + DOB, shows masked identity and today’s appointment only, and resets after 60 seconds.

## 13. Patient handoff and daily close

Before closing a visit:

- appointment status is correct;
- encounter is complete/finalized when appropriate;
- performed treatments are recorded;
- invoice and payment balance are accurate;
- prescription is issued or amended correctly;
- required files are attached privately;
- recall/follow-up is scheduled;
- patient received only the information intended for them.

At the end of day, reconcile collections, review outstanding balances, check inventory alerts, and resolve pending recall/consult queues.
