# MVP 3 - ToothHub Ecosystem + Scale

## Release objective
Turn ToothHub into a broader patient discovery, engagement, and multi-clinic platform, with mature operations and integrations.

## 1. Patient account and portal
Potential capabilities:
- secure patient signup/account linking;
- appointments;
- appointment requests/reschedule/cancel policy;
- invoices/receipts where allowed;
- treatment plan summaries where clinic policy permits;
- profile/contact update request;
- document access where appropriate.

Patient identity linking across clinics requires a deliberate consent/privacy model. Do not automatically merge clinical records.

## 2. Search/discovery
- location-aware clinic search;
- specialty/service filters;
- dentist availability filters;
- branch hours;
- search ranking rules;
- SEO-friendly directory pages.

## 3. Verification and moderation
- dentist verification workflow;
- clinic verification workflow;
- public trust state/badges;
- evidence/document review process;
- expiry/reverification strategy if required.

## 4. Reviews
- patient review submission;
- eligibility rule (for example completed appointment);
- moderation/reporting;
- clinic response policy;
- anti-abuse controls.

## 5. Enterprise multi-branch
- organization hierarchy;
- consolidated reporting;
- central service catalogs with branch overrides;
- cross-branch staff management;
- regional/area roles;
- transfer/referral workflows with explicit permissions.

## 6. Advanced analytics
- appointment conversion;
- no-show/cancellation trends;
- patient return/recall metrics;
- treatment acceptance;
- branch/dentist utilization;
- revenue metrics;
- cohort/trend views.

Ensure analytics minimizes unnecessary clinical detail.

## 7. Online payments
- patient payment links/checkout;
- webhook verification;
- idempotency;
- payment-to-invoice reconciliation;
- refunds;
- failed payment handling;
- platform/subscription billing if selected.

## 8. Custom domains/themes
- clinic custom domain mapping;
- SSL/domain verification flow;
- theme presets;
- advanced branding;
- fallback to canonical ToothHub URL;
- redirect/canonical URL policy.

## 9. Integrations/API
Potential:
- email/SMS providers;
- calendar integration;
- accounting export/integration;
- laboratory/referral integration;
- payment gateways;
- public/partner API with scoped keys;
- webhooks.

## 10. Secure offline-limited mode
Only after threat model and product need are confirmed. Required design includes encryption, device trust/revocation, minimal data scope, expiry, sync conflicts, and audit.

## 11. Platform operations maturity
- support tooling with explicit elevated access;
- tenant export/offboarding;
- retention automation;
- backup restore testing;
- operational dashboards;
- security alerts;
- feature-flag rollout;
- migration/maintenance tooling.

## 12. MVP 3 release gates
- patient portal cannot expose another patient's records;
- account linking does not cause cross-clinic clinical leakage;
- payment webhooks are verified/idempotent;
- custom domains are verified before activation;
- review system has moderation/abuse controls;
- enterprise permissions are tested for branch/organization boundaries;
- integrations fail safely and retry appropriately;
- any offline protected-data feature passes dedicated security review.
