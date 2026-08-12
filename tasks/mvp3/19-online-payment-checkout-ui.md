# Online Payment Link and Checkout UI

> **Status:** 🔲 Queued
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

## Dependencies

- Select and approve a Philippine payment provider.
- `mvp3/07-online-payments.md` safety baseline.
