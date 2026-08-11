# MVP 3 Overview — Ecosystem + Scale

**Release objective:** Turn Dentra.ph into a broader patient discovery, engagement, and multi-clinic platform with mature operations and third-party integrations.

---

## Task checklist

| File | What | Status |
|------|------|--------|
| `01-patient-portal.md` | Secure patient account, appointment/invoice access | 🔜 Future |
| `02-search-discovery.md` | Location-aware clinic/dentist search, SEO directories | 🔜 Future |
| `03-verification-moderation.md` | Dentist/clinic verification workflow, trust badges | 🔜 Future |
| `04-reviews.md` | Patient review submission, moderation, clinic response | 🔜 Future |
| `05-enterprise-multibranch.md` | Organization hierarchy, consolidated reporting, regional roles | 🔜 Future |
| `06-advanced-analytics.md` | Conversion, cohort, trend, and revenue analytics | 🔜 Future |
| `07-online-payments.md` | Patient checkout, webhooks, refunds, reconciliation | 🔜 Future |
| `08-custom-domains.md` | Clinic custom domain mapping, SSL, canonical redirects | 🔜 Future |
| `09-integrations-api.md` | Partner API, webhooks, calendar/accounting export | 🔜 Future |
| `10-offline-mode.md` | Secure, minimal offline clinical access (threat-modeled) | 🔜 Future |
| `11-platform-operations.md` | Support tooling, tenant export, retention, security alerts | 🔜 Future |

---

## Release gates (from `docs/MVP_3.md`)

- Patient portal cannot expose another patient's records.
- Account linking does not cause cross-clinic clinical data leakage.
- Payment webhooks are verified and idempotent.
- Custom domains are verified before activation.
- Review system has moderation and abuse controls.
- Enterprise permissions are tested for branch/organization boundaries.
- Integrations fail safely and retry appropriately.
- Any offline protected-data feature passes a dedicated security review before activation.

---

## Prerequisite

All MVP 2 release gates must pass before MVP 3 development begins.
