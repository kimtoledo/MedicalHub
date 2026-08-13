# MVP 3 Overview — Ecosystem + Scale

**Release objective:** Turn Dentra.ph into a broader patient discovery, engagement, and multi-clinic platform with mature operations and third-party integrations.

---

## Task checklist

| File | What | Status |
|------|------|--------|
| `01-patient-portal.md` | Secure patient account, appointment/invoice access | ✅ Done |
| `02-search-discovery.md` | Location-aware clinic/dentist search, SEO directories | 🔵 Active |
| `03-verification-moderation.md` | Dentist/clinic verification workflow, trust badges | ✅ Done |
| `04-reviews.md` | Patient review submission, moderation, clinic response | ✅ Done |
| `05-enterprise-multibranch.md` | Organization hierarchy, consolidated reporting, regional roles | 🔵 Active |
| `06-advanced-analytics.md` | Conversion, cohort, trend, and revenue analytics | ✅ Done |
| `07-online-payments.md` | Patient checkout, webhooks, refunds, reconciliation | ✅ Done |
| `08-custom-domains.md` | Clinic custom domain mapping, SSL, canonical redirects | ✅ Done |
| `09-integrations-api.md` | Partner API, webhooks, calendar/accounting export | 🔵 Active |
| `10-offline-mode.md` | Secure, minimal offline clinical access (threat-modeled) | ⛔ Blocked |
| `11-platform-operations.md` | Support tooling, tenant export, retention, security alerts | 🔵 Active |
| `12-ai-imaging.md` | AI radiograph analysis, oral health scoring, AI diagnostics assistant | 🔵 Active |
| `13-kiosk-checkin.md` | Tablet self-check-in for high-volume clinic branches | ✅ Done |
| `14-patient-portal-experience.md` | Complete signup, linking, requests, details, and account UX | ✅ Done |
| `15-verification-moderation-ui.md` | Private submissions and Super Admin verification queue | ✅ Done |
| `16-reviews-ui.md` | Patient review, public display, response, and moderation UI | ✅ Done |
| `17-enterprise-organization-ui.md` | Organization selector, membership, and consolidated workspace | ✅ Done |
| `18-advanced-analytics-ui.md` | Tenant-scoped trends, rates, charts, and exports | ✅ Done |
| `19-online-payment-checkout-ui.md` | Clinic payment links and public checkout/status pages | ✅ Done |
| `20-custom-domain-settings-ui.md` | DNS instructions, verification, and activation UI | ✅ Done |
| `21-integrations-settings-ui.md` | API keys, webhooks, calendar, and accounting export UI | ✅ Done |
| `22-platform-operations-console.md` | Support-access and tenant export/offboarding queues | ✅ Done |
| `23-ai-imaging-ui.md` | Advisory radiograph analysis and oral-health score UI | 🔲 Queued |

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
