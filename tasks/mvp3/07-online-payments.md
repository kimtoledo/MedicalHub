# Online Payments

> **Status:** ✅ Done — MVP 3 payment safety baseline

---

## What & Why

Patients should be able to pay invoices online, and the platform may need to collect subscription fees from clinics. Payment webhooks must be idempotent to survive retries without double-recording.

---

## Done looks like

- Clinic can send a patient a secure payment link for an outstanding invoice.
- Patient follows the link, sees the invoice summary, and pays via a Philippine payment gateway (GCash, Maya, card).
- Payment webhook is verified (signature check) and processed idempotently — replayed webhooks do not double-record a payment.
- Successful payment updates the invoice status and notifies the clinic.
- Failed payments show a clear error and allow the patient to retry.
- Refunds for online payments are initiated from the billing module and reflected in the payment record.
- Payment-to-invoice reconciliation: each online payment is linked to exactly one invoice.
- Platform subscription billing for clinics can use the same infrastructure once a billing provider is selected.

### Delivered

- Added expiring invoice payment links with hashed tokens and clinic/billing authorization.
- Added provider-neutral webhook handling with HMAC verification, unique event-id idempotency, one-to-one invoice reconciliation, and invoice status updates.
- Provider checkout UI/credentials remain adapter deployment work; no gateway secrets are committed.

---

## Out of scope

- Multi-currency support (PHP only initially).
- Marketplace or escrow payment flows.
