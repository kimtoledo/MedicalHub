# Online Payment Link and Checkout UI

> **Status:** ✅ Done
> **Priority:** P1

## What & Why

Complete the user-facing payment-link workflow around the existing signed-link and webhook safety baseline.

## Done looks like

- Authorized clinic staff can create, copy, expire, and inspect invoice payment links.
- Public token page shows a minimal invoice summary, expiry, and safe payment status.
- Provider adapter supports GCash/Maya/card only after credentials and compliance review.
- Success, failure, retry, expired, already-paid, and webhook-pending states are explicit.
- Refund/reconciliation status appears in billing without accepting client-owned payment truth.
- Secrets remain environment-only; webhook verification/idempotency tests stay green.

## Delivered

- Added clinic-facing invoice payment-link management (create, one-time copyable URL, list, cancel) to the invoice detail page, gated by `billing.payments` entitlement and `clinic_owner|clinic_admin|cashier` roles.
- Added `GET /v1/clinic/:clinicId/invoices/:invoiceId/payment-links` and `POST /v1/clinic/:clinicId/payment-links/:linkId/cancel`; cancellation is only permitted on active links and is audited.
- Added a public `/pay/[token]` status page (no auth) showing invoice number, amount, and explicit paid/expired/cancelled/failed/retry/awaiting-confirmation states, backed by a public API proxy.
- Live GCash/Maya/card checkout redirect remains out of scope until a provider is selected and credentials/compliance review are complete — the public page states this honestly instead of presenting a non-functional "Pay now" button.
- Reconciled clinic-recorded refunds against `online_payments`: a full refund on an invoice marks its succeeded online payment as `refunded` so the payment-link page reflects it, without ever accepting a client-reported payment status.
- Added 10 new API tests covering link creation/list/cancel authorization and entitlement checks, the public status lookup, and webhook signature/idempotency error paths; all 300 API and 5 web tests, repo-wide typecheck, and production web/API builds pass.

## Dependencies

- Select and approve a Philippine payment provider (still required before live checkout redirect can ship).
- `mvp3/07-online-payments.md` safety baseline.
