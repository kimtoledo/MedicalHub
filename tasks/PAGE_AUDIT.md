# Dentra.ph Page Completion Audit

> **Audit date:** August 12, 2026
> **Scope:** 59 Next.js page routes — 11 public/patient pages, 37 Clinic PWA/dentist pages, and 11 Super Admin pages
> **Purpose:** Identify visible placeholders, incomplete workflows, misleading error states, and backend capabilities that still lack usable pages.

## Summary

| Priority | Finding | Task |
|---|---|---|
| Complete | Runtime readiness, ordered migration reconciliation, and truthful settings errors | [`mvp1/23-runtime-readiness-and-page-errors.md`](mvp1/23-runtime-readiness-and-page-errors.md) |
| Complete | Super Admin dashboard uses protected live aggregates and audit activity | [`mvp1/24-super-admin-dashboard-live.md`](mvp1/24-super-admin-dashboard-live.md) |
| P2 | Super Admin Settings is a placeholder | [`mvp1/25-super-admin-settings.md`](mvp1/25-super-admin-settings.md) |
| Complete | Clinic staff membership, roles, branch access, and permissions workspace | [`mvp1/26-clinic-staff-management.md`](mvp1/26-clinic-staff-management.md) |
| Complete | Dentist-owned professional profile editor and public preview | [`mvp1/27-dentist-self-service-profile.md`](mvp1/27-dentist-self-service-profile.md) |
| Complete | Reports workspace has date/filter controls, detail tables, and CSV exports | [`mvp2/16-reports-workspace-completion.md`](mvp2/16-reports-workspace-completion.md) |
| Complete | Guided, tenant-safe HMO claim creation replaces raw UUID entry | [`mvp2/17-hmo-claim-workflow-ux.md`](mvp2/17-hmo-claim-workflow-ux.md) |
| Complete | Patient portal signup, consent linking, care summaries, requests, and account security UX | [`mvp3/14-patient-portal-experience.md`](mvp3/14-patient-portal-experience.md) |
| Complete | Private clinic/dentist verification submission and Super Admin moderation workspace | [`mvp3/15-verification-moderation-ui.md`](mvp3/15-verification-moderation-ui.md) |
| P1 | Review APIs lack patient submission, public review, clinic response, and moderation pages | [`mvp3/16-reviews-ui.md`](mvp3/16-reviews-ui.md) |
| P2 | Organization APIs lack an enterprise management workspace | [`mvp3/17-enterprise-organization-ui.md`](mvp3/17-enterprise-organization-ui.md) |
| P2 | Advanced analytics APIs are not exposed in the Clinic PWA | [`mvp3/18-advanced-analytics-ui.md`](mvp3/18-advanced-analytics-ui.md) |
| P1 | Payment-link APIs lack clinic controls and patient checkout/status pages | [`mvp3/19-online-payment-checkout-ui.md`](mvp3/19-online-payment-checkout-ui.md) |
| P2 | Custom-domain APIs lack clinic settings UI | [`mvp3/20-custom-domain-settings-ui.md`](mvp3/20-custom-domain-settings-ui.md) |
| P2 | Partner API/webhook capabilities lack key-management and export UI | [`mvp3/21-integrations-settings-ui.md`](mvp3/21-integrations-settings-ui.md) |
| P2 | Platform support/export APIs lack an operations console | [`mvp3/22-platform-operations-console.md`](mvp3/22-platform-operations-console.md) |
| P2 | AI imaging/score APIs lack radiograph and patient-profile UI | [`mvp3/23-ai-imaging-ui.md`](mvp3/23-ai-imaging-ui.md) |

## Route review

### Public and patient surfaces — 11 routes

- Live: landing page, clinic/dentist directories and profiles, both booking flows, remote consult form, kiosk, and offline fallback.
- Live: `/portal` supports patient signup/sign-in, explicit clinic linking and revocation, care summaries, clinic-reviewed requests, and account security guidance.
- Already tracked: location-aware discovery completion remains in `mvp3/02-search-discovery.md`.

### Clinic and dentist workspace — 37 routes

- Live core workflows: dashboards, appointments, patients, encounters, odontogram, treatment records, prescriptions, billing, inventory, recalls, services, HMO payer management, remote consults, and self-service account profile.
- Former placeholders `/app/staff` and `/app/dentist/profile` are now live management workspaces.
- Guided HMO claim creation, reports, and settings error handling are complete.
- API-only modules still needing pages: advanced analytics, online payment links, custom domains, integrations, organization management, and AI imaging.

### Super Admin — 11 routes

- Live: clinic, dentist, package, subscription, and audit management.
- Live: `/dentra-admin` dashboard metrics and recent immutable audit activity.
- Placeholder: `/dentra-admin/settings`.
- Missing operational pages: review moderation and platform support/export operations; verification moderation is complete.

## Existing active tasks retained

No duplicate task was created for work already clearly scoped in these files:

- `mvp2/07-notifications.md` — reminder/cancellation delivery wiring and provider completion.
- `mvp3/02-search-discovery.md` — near-me UI, availability, ranking, and structured data.
- `mvp3/05-enterprise-multibranch.md` — organization entitlements, central catalog, assignments, and transfers.
- `mvp3/09-integrations-api.md` — connectors, exports, delivery retries, and partner-resource expansion.
- `mvp3/11-platform-operations.md` — export workers, retention, restore drills, alerts, rollout, and maintenance mode.
- `mvp3/12-ai-imaging.md` — provider evaluation, clinical validation, overlays, and diagnostics assistant.

## Recommended execution order

1. ✅ P0 runtime readiness and truthful errors.
2. Clinic staff management and dentist self-profile.
3. Live Super Admin dashboard and complete reports/HMO workflows.
4. Patient portal and trust workflows.
5. Enterprise, payments, domains, integrations, operations, analytics, and AI user interfaces.

Every implementation task must preserve session-derived identity, `clinic_id` tenant filters, role and entitlement checks, immutable audit records, and protected-data cache exclusions.
