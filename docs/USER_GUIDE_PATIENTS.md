# Dentra.ph Patient Manual

This manual explains the public patient journey: finding a clinic, booking, visiting, using the patient portal, submitting a remote consultation, paying an invoice, and using a clinic kiosk.

## 1. Find a clinic or dentist

1. Open `/clinics` to search published clinic profiles by name, location, or service.
2. Open `/dentists` to search published and verified dentist profiles.
3. Review the clinic’s branches, operating hours, services, dentist affiliations, contact details, and booking link.
4. Confirm the branch and service before requesting an appointment.

Public search is limited to active/published records. A clinic or dentist not appearing in search may be unpublished, inactive, pending verification, or not yet configured for public discovery.

## 2. Book an appointment

From a clinic microsite (`/clinic/{clinicSlug}`) or dentist profile:

1. Select the branch, service, dentist (if available), date, and available time.
2. Enter your first name, last name, phone, optional email, and chief complaint.
3. Review the clinic, branch, service, date, and time before submitting.
4. Submit once and save the confirmation/reference shown by the app.
5. Wait for the clinic to confirm the appointment; a request is not the same as a confirmed slot.

The booking service validates the clinic/branch/service relationship, prevents conflicting slots, and rate-limits repeated requests. If the slot fails, return to availability and choose another time instead of repeatedly submitting the same request.

### Booking privacy

Use your own contact information or a guardian’s information where appropriate. Do not place medical history, full diagnosis, payment details, or sensitive identifiers in the public chief-complaint field. Share clinical details directly with the clinic through its approved secure workflow.

## 3. Before and during the visit

Bring the information the clinic requests, such as a valid contact number, prior prescription/records if the clinic asked for them, and HMO details if applicable. Confirm the branch address and arrival time.

At the clinic, staff may mark the appointment `checked_in`, then `in_progress`, and finally `completed`. The clinic—not the patient—controls those status changes.

### Kiosk check-in

If the clinic provides a kiosk:

1. Open the clinic-provided `/kiosk/{branchId}` screen.
2. Enter your patient number, or use last name and date of birth.
3. Choose the matching appointment for today.
4. Confirm arrival once.
5. Take a seat and follow clinic instructions.

The kiosk is branch- and today-specific. It shows masked patient identity and appointment-safe information only, never medical history, treatment, prescriptions, or clinical notes. It resets after 60 seconds; do not leave personal information on the screen.

## 4. Create and use the patient portal

Open `/portal`.

### Create an account

1. Choose the patient sign-up option when available.
2. Register with an email address or mobile number and a password of at least 10 characters.
3. Store the password privately; it is separate from any clinic staff account.
4. Sign in using the same email/mobile identifier.

### Link a clinic record

The portal does not automatically attach every clinic record that resembles your name or phone. Use the explicit clinic-link flow and provide the requested matching contact details/clinic consent. If the match fails, contact the clinic and ask them to verify the record’s email/phone; do not create duplicate records just to force a match.

### What the portal shows

After an explicit link, the portal can show read-only:

- linked clinic information;
- appointments;
- invoice summaries and balances;
- treatment-plan summaries where available;
- submitted portal requests and their review state.

Clinical notes, prescriptions, and private clinical files are not exposed by the baseline portal. Ask the clinic for a separate approved copy or consultation when needed.

### Portal privacy

Use your own device or sign out on a shared device. Never share a portal password or session cookie. If you see a record that does not belong to you, stop using the portal, take a redacted screenshot of the error, and report the clinic and approximate time immediately.

## 5. Remote photo consultation

Open `/consult/{clinicId}` only through a clinic-provided link.

1. Enter the requested contact and symptom information.
2. Upload only the requested dental photos; do not upload unrelated identity documents.
3. Confirm the clinic and submit once.
4. Wait for the clinic’s dentist review and follow-up instructions.

Remote consultation is not an emergency service and does not replace an in-person examination. If you have severe pain, uncontrolled bleeding, facial swelling, breathing difficulty, or another emergency, contact local emergency services or a qualified clinician immediately.

Uploaded photos are private clinic files. Do not forward signed download links; they expire and are not intended for public sharing.

## 6. Invoices and payments

The clinic may provide an invoice in person, through the portal, or through an expiring payment link.

- Confirm clinic name, invoice number, service, amount, and expiry before paying.
- Use only the payment channel provided by the clinic.
- Never send a password, one-time code, full card number, or API key to clinic staff through an unapproved chat.
- Save the payment confirmation/reference.
- If you paid partially, ask the clinic to confirm the remaining balance; do not assume an initiated transfer is already reconciled.
- For a refund or adjustment, contact the clinic and provide the invoice/reference and payment date; do not create a second payment to “fix” the first one.

Online payment links are expiring and provider webhook events are verified by Dentra.ph. If a link is expired, request a new one rather than editing the URL.

## 7. Treatment plans, prescriptions, and files

Ask the dentist to explain a treatment plan before approving it. The clinic may show proposed procedures, priorities, estimated prices, and progress. An approved plan is not permission to skip informed consent or clinical discussion.

When receiving a prescription, verify your name, medicine, strength, dosage, frequency, duration, and dentist details before leaving. If something is wrong, request an amendment from the clinic; do not alter the document yourself.

Request radiographs, photos, or other clinical files through the clinic’s approved process. Signed links are temporary and should not be posted online.

## 8. Reviews and follow-ups

After a completed appointment, the clinic or portal may allow one review for that appointment. Keep the review factual, respectful, and free of another person’s private information. Reviews may be moderated before publication; a pending review is not yet public.

If the clinic schedules a recall/follow-up, confirm the proposed date, service, and branch. Contact the clinic if your symptoms change or the appointment is no longer suitable.

## 9. Privacy requests and support

For a patient-record correction, access question, or clinic-link problem:

1. Contact the clinic that owns the record.
2. Provide the clinic, approximate appointment date, and your account contact—not a password or session token.
3. Explain the requested correction or access issue clearly.
4. Use the portal request flow when available so the request has a review trail.

For suspected account compromise, change the password from a trusted device if the feature is available, sign out of other sessions where possible, and contact the clinic/platform support. Dentra.ph staff should never ask for your password, full payment credentials, or cookie value.

## 10. Common patient problems

| Problem | What to do |
|---|---|
| Clinic does not appear in search | Confirm spelling/location, then contact the clinic; it may be unpublished or inactive. |
| Booking slot disappeared | Refresh availability and choose another time; the slot may have been taken. |
| Portal sign-in fails | Use the exact email/mobile used at sign-up and reset/contact support rather than creating duplicate accounts. |
| Clinic record will not link | Ask the clinic to verify the contact details on its patient record and confirm explicit linking consent. |
| Payment link expired | Request a new link from the clinic. |
| Kiosk cannot find appointment | Confirm the correct branch, today’s date, patient number, or exact last name + DOB. Ask the front desk if the appointment is not confirmed. |
| Remote consultation upload fails | Check file size/type, network connection, and the clinic link; do not email sensitive photos to an unknown address. |
