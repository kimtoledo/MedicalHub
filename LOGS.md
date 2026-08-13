# Dentra.ph — Project Logs

Chronological record of what has been built, what is in progress, and what is next.
Updated manually after each session or merged task.

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done & merged |
| 🔄 | In progress |
| 📋 | Proposed / queued |
| ❌ | Cancelled |

---

## In Progress

### 🔄 MVP 2 notifications
- Added a tenant-aware notification outbox with email/SMS channel and delivery status tracking, deduplication keys, retry metadata, and provider adapter boundaries.
- Public booking creation now queues non-sensitive email confirmation content when a patient email is provided.
- Remaining: appointment reminder scheduling, cancellation/reschedule event wiring, and production provider credentials.

### 📋 Page completion backlog
- Audited all 59 Next.js page routes across public/patient, Clinic PWA/dentist, and Super Admin surfaces
- Added `tasks/PAGE_AUDIT.md` with route-group findings, priorities, dependencies, and recommended execution order
- Added 17 discrete queued task files covering runtime readiness, three visible placeholders, incomplete reports/HMO/patient workflows, and API-only MVP 3 user interfaces
- Highest-priority runtime safeguards, truthful settings errors, and shared-database migration reconciliation are complete

---

## Completed

### 🔄 Real webhook delivery (integrations API)
- `appointment.created` (public booking) and `invoice.paid` (manual clinic payment and online-payment webhook success) now actually dispatch to every active, subscribed clinic webhook — previously nothing ever called a registered webhook endpoint
- Deliveries are HMAC-SHA256 signed (`x-dentra-webhook-signature`), sent with a 5s timeout, and retried with exponential backoff (capped at 60 min) for up to 5 attempts before being marked permanently failed
- Fixed a signing-secret design gap found while building this: the secret was only ever one-way hashed, which is useless for an outbound *sender* needing to produce a signature. Added an encrypted-at-rest `secretCiphertext` column (AES-256-GCM); webhooks created before the migration fail delivery with an explicit "recreate this webhook" reason instead of crashing
- No cron/job-queue exists in this codebase, so retries use in-process timers plus a boot-time sweep (`processDueDeliveries`) to recover anything left queued across a restart — documented as a real (not silent) limitation
- Delivery history (event, attempts, response status, last error) is queryable per webhook and shown in the settings UI behind a "Deliveries" toggle
- Verified 350 passing API tests (11 new: crypto round-trip/tamper-detection, backoff, delivery-history route/auth), 5 passing web tests, repository-wide TypeScript checks, production web/API builds, applied DB migration, and clean diff validation
- Remaining in `mvp3/09-integrations-api.md`: `appointment.updated`/refund events, provider connectors, calendar/accounting export formats, read-write partner resources

### 🔄 Real tenant export generation (platform operations)
- Replaced the manual "mark export ready" honesty placeholder with a real `generateExport`: gathers ~24 clinic-scoped tables (patients, appointments, encounters, treatment plans/records, invoices, prescriptions, odontogram, file metadata, reviews, HMO, inventory) into a structured JSON document with an explicit manifest of what's included/excluded, and uploads it to the same object storage bucket clinical files already use
- Added a signed-token download flow reusing the exact HMAC scheme from clinical file downloads — a Super Admin or the requesting clinic's own admin can mint a short-lived download link; the byte-serving route is token-gated and session-free, mirroring `clinic-files.ts`
- `markExport` can no longer manually set `ready` — only real generation can reach that state — while `processing`/`failed`/`cancelled` remain manual overrides
- Both the admin console and the clinic's own Support & Data Requests page now show a real "Generate export" / "Download" flow instead of a status-only tracker
- File binaries, staff accounts, and audit logs remain explicitly out of scope (documented in the export's own manifest, and in the UI copy) — this is a structured-data export, not a full tenant backup
- Verified 341 passing API tests (8 new), 5 passing web tests, repository-wide TypeScript checks, production web/API builds, and clean diff validation
- Remaining in `mvp3/11-platform-operations.md`: scoped support-session enforcement, retention/anonymization jobs, actual offboarding deletion, restore drills, alerting, feature rollouts, maintenance mode

### ✅ AI imaging and oral health score UI
- Added an "AI Imaging" tab on the patient record page, gated to clinic_owner/clinic_admin/dentist roles with the `ai.imaging` entitlement, matching the backend's own gate
- The tab runs analysis on uploaded radiographs, shows the current oral health score with a trend vs. the previous score plus recent-score history, and lists analysis history with queued/completed/failed states
- Explicitly states that the current baseline computes the score from odontogram/treatment/visit counts only and does not interpret radiograph images — no annotation overlay was built, since that stays gated on provider evaluation per `mvp3/12-ai-imaging.md`
- Completed analyses require an explicit "Mark reviewed" action restricted to the dentist role in the UI
- Verified 333 passing API tests (9 new), 5 passing web tests, repository-wide TypeScript checks, production web/API builds, and clean diff validation

### ✅ Platform operations console
- Added `/dentra-admin/operations`: Super Admin queues for support-access requests (justification, approve/deny, 30-minute window) and tenant export/offboarding requests (retention date, processing/ready/failed/cancelled), enriched with clinic name and requester/reviewer email
- Added `/app/settings/data-requests`: the clinic-side counterpart to submit support/export requests and see their own status, backed by two new `GET` list endpoints scoped to the requesting clinic
- Both UIs are explicit about what is not yet real: marking an export "ready" doesn't generate a file, the approval window isn't enforced at the data layer yet, and platform inventory shows only the one live signal (active clinic count) rather than fabricating error-rate/storage metrics
- No retention/deletion action was added since no backend route exists to call yet
- Verified 324 passing API tests (9 new), 5 passing web tests, repository-wide TypeScript checks, production web/API builds, and clean diff validation

### ✅ Integrations and API settings UI
- Added `/app/settings/integrations`: create scoped API keys with a one-time secret reveal, list keys with last-used time, and revoke them
- Added webhook subscription management (endpoint, event types) with a one-time signing-secret reveal, delivery/failure metadata, and a new disable action backed by a new `POST .../webhooks/:webhookId/disable` endpoint
- iCal/Google Calendar and accounting export are shown as explicit "coming soon" cards rather than non-functional controls, since neither backend format exists yet
- Documented the partner API base path, auth header, and rate/date-range limits on the settings page itself
- Verified 315 passing API tests (9 new), 5 passing web tests, repository-wide TypeScript checks, production web/API builds, and clean diff validation

### ✅ Custom domain settings UI
- Added `/app/settings/domains`: add/normalize a hostname, view DNS TXT instructions with copy buttons, recheck verification, and activate — linked from the Clinic Settings hub
- Extended the list endpoint to also return the verification token so DNS instructions remain visible after a reload instead of only at creation time
- Activation stays disabled in the UI until a domain is verified, matching the server's own conditional-update guard
- Status badges cover pending verification, verified, active, and failed (with reason); active domains show truthful copy that SSL/canonical redirect provisioning is an infrastructure-layer concern and that DNS/certificate issues fall back to the canonical Dentra.ph URL with no downtime
- Verified 306 passing API tests (6 new), 5 passing web tests, repository-wide TypeScript checks, production web/API builds, and clean diff validation

### ✅ Online payment checkout UI
- Added clinic-facing invoice payment-link management (create, one-time copyable URL, list, cancel) to the invoice detail page, gated by `billing.payments` entitlement and role
- Added `GET .../payment-links` and `POST .../payment-links/:linkId/cancel` API endpoints; cancellation only applies to active links and is audited
- Added a public, unauthenticated `/pay/[token]` status page with explicit paid/expired/cancelled/failed/retry/awaiting-confirmation states and a matching API proxy
- Live GCash/Maya/card checkout redirect stays out of scope until a provider is selected and credentials/compliance review are complete; the public page states this honestly rather than showing a non-functional pay button
- Reconciled clinic-recorded refunds against online payment records so the payment-link page reflects a refund once billing records it, without ever accepting a client-reported payment status
- Verified 300 passing API tests (10 new), 5 passing web tests, repository-wide TypeScript checks, production web/API builds, and clean diff validation

### ✅ Advanced analytics UI
- Added a responsive `/app/analytics` workspace with Manila-time date presets, custom date bounds, assigned-branch filtering, metric definitions, and decision-useful appointment/revenue trends
- Added accessible Dentra-colored charts with tabular alternatives, aggregate-only CSV export, empty/loading/error/retry states, and a bounded 366-day API range
- Enforced `reports.advanced`, clinic roles, tenant scope, and membership branch scope on the server and UI; dentist responses omit all revenue trend data
- Treatment acceptance is withheld for branch-only scopes because current treatment plans have clinic ownership but no branch ownership, preventing misleading or over-broad results
- Verified 290 passing API tests, 5 passing web tests, repository-wide TypeScript checks, production web/API builds, and clean diff validation

### ✅ Enterprise organization workspace
- Added a responsive dental-group selector and workspace with member-clinic/branch visibility plus consolidated appointment, patient, and invoiced-revenue summaries
- Regional managers see and aggregate only their assigned organization branches; viewers receive read-only organization scope while owner/admin membership details remain protected
- Added email-based organization role management with validated branch assignments, owner-only owner changes, and last-owner protection
- Clinic attachment now requires administration rights on both the organization and target clinic, writes identifier-only audit events, and enforces one organization per clinic through migration `0035_fat_lenny_balinger.sql`
- Kept central catalogs, cascading entitlements, cross-clinic staff assignment, and consented patient transfers as explicit Task 05 handoffs
- Verified 285 passing API tests, 5 passing web tests, repository-wide TypeScript checks, production web/API builds, and clean diff validation

### ✅ Patient reviews and moderation UI
- Added linked-patient eligibility and review history, one-review-per-completed-appointment submission, and patient-visible moderation outcomes
- Added PII-safe approved review aggregates and pagination to public clinic and dentist pages, including authenticated rate-limited abuse reporting
- Added a protected clinic response queue and Super Admin approve/reject/hide moderation workspace with written reasons and pending report context
- Added deduplicated review-report persistence in migration `0034_nebulous_talkback.sql`; tenant response access and platform moderation remain server-authorized and audited
- Verified 278 passing API tests, 5 passing web tests, repository-wide TypeScript checks, production web/API builds, and clean diff validation

### ✅ Verification submission and moderation UI
- Added private clinic and dentist verification document submission with validated PDF/image uploads, document-type metadata, status/reason/expiry history, pending-submission conflict protection, and object-storage cleanup on failed persistence
- Added a Super Admin verification queue with pending, approved, rejected, revoked, expiring, and all filters plus private document review and written approve/reject/revoke decisions
- Protected every document download with an active Super Admin session and `private, no-store`; public directory responses expose only verification status and never storage keys or document metadata
- Removed direct no-reason dentist verification controls from the profile UI in favor of the audited moderation queue; approved clinics now receive a public directory trust badge
- Added submission audits, safe review-state transitions, responsive loading/empty/error states, and authorization/filter/reason tests
- Verified 272 passing API tests, 5 passing web tests, repository-wide TypeScript checks, production web/API builds, and clean diff validation

### ✅ Patient portal experience completion
- Replaced the `/portal` API demonstration with a mobile-first patient product covering signup, sign-in/out, appointment and invoice detail summaries, treatment plans, request history, and profile/security controls
- Added patient-facing clinic linking by clinic slug and patient number with explicit consent, account-contact verification, safe link revocation/re-linking, and no raw UUID entry
- Fixed single-contact account verification so a missing email or phone can no longer accidentally satisfy the clinic-record match; appointment requests now verify the appointment belongs to the linked clinic/patient
- Added server-side session invalidation, typed request payload validation, cancellation/reschedule and contact-update workflows, plus loading, empty, error/retry, confirmation, and recovery-guidance states
- Verified 267 passing API tests, 5 passing web tests, repository-wide TypeScript checks, production web/API builds, and clean diff validation

### ✅ Guided HMO claim workflow
- Replaced raw patient, membership, invoice, and encounter UUID entry with tenant-scoped patient search and eligible-record selection
- Added active/current coverage summaries, outstanding-invoice amount ceilings, finalized encounter choices, loading/empty/error states, and direct claim-entry links from patient and invoice pages
- Hardened backend creation against cross-patient relationships, mismatched payers, inactive or out-of-date coverage, non-outstanding invoices, unfinished encounters, and invalid claim amounts
- Verified 264 passing API tests, 5 passing web tests, repository-wide TypeScript checks, production web/API builds, and clean diff validation

### ✅ Reports workspace completion
- Replaced the fixed 2020–2099 report request with Manila-aware presets, custom ranges, and URL-backed branch/dentist/status/service/payment filters
- Added operational appointment details, dentist/service workload, financial payment/procedure, and inventory stock tables with usable responsive empty states
- CSV downloads preserve selected filters and return report-specific tabular columns and filenames
- Server-side role visibility now separates operational, financial, and inventory reports while retaining the canonical `reports.basic` entitlement check
- Verified 261 passing API tests, repository-wide TypeScript checks, production web/API builds, and clean diff validation

### ✅ Live Super Admin dashboard
- Replaced all hard-coded `/dentra-admin` KPIs, clinic statuses, and activity with protected live database aggregates and immutable audit events
- Dashboard reports clinic statuses, current active/trial subscriptions, dentist profiles, all-time appointments, and rolling 30-day appointments
- Recent activity intentionally excludes audit metadata, IP addresses, user agents, patient details, and clinical payloads; quick actions now point to the correct create/manage screens
- Added responsive loading, empty, server-error/retry states and Super Admin authorization/aggregate normalization tests
- Verified 257 passing API tests, repository-wide TypeScript checks, production web/API builds, and clean diff validation

### ✅ Dentist self-service professional profile
- Replaced `/app/dentist/profile` with a responsive editor for biography, specialty, professional contact details, HTTPS photo URL, and PRC/license number
- Added dentist-owned profile APIs that derive dentist identity from the active authenticated membership; client-supplied dentist IDs, verification state, publication state, slug, and affiliations are never authoritative
- Added read-only affiliation/status summaries, public-profile preview, publication-readiness checklist, unsaved-change warning, and truthful loading/save/error states
- Audits contain changed field names and tenant context only, not submitted professional values
- Verified 255 passing API tests, repository-wide TypeScript checks, production web/API builds, and clean diff validation

### ✅ Clinic staff and membership management
- Replaced `/app/staff` with a responsive owner/admin workspace for staff invitations, active/pending/inactive membership states, roles, branch access, activation, removal, and permission overrides
- Added tenant-filtered staff APIs with approved-role/permission validation, cross-tenant denial, self-elevation/removal protection, owner-only owner management, and last-active-owner enforcement
- Staff mutations write atomic identifier/state-only audit events; invitation responses never expose password-setup secrets, and production delivery remains explicitly dependent on the notifications provider
- Existing credential users can be attached immediately; new-user invitations remain visibly pending and support safe resend metadata without claiming email delivery
- Verified 252 passing API tests, repository-wide TypeScript checks, production web/API builds, and clean diff validation

### ✅ Runtime readiness and truthful page errors
- API startup, `npm run db:migrate`, and Replit post-merge setup now fail closed when required schema objects are missing, even if Drizzle itself reports no pending migrations
- Added `npm run db:reconcile-order` and used it to apply skipped migrations `0015`–`0033` transactionally through Drizzle; the shared database readiness check and live API health pass
- `/app/settings` now separates login, role denial, not-found, and server/schema errors and uses a reusable branded retry state
- Production builds use `.next-build`; a live local dev server retained HTTP 200 responses throughout a verified production build
- Verified 248 API tests, 5 web error-classification tests, repository-wide typechecks, production builds, shell syntax, and clean diff validation

### ✅ Self-service clinic account profile
- Replaced the `/app/profile` placeholder with responsive personal-information editing, avatar preview, read-only email, and active clinic/branch/role summaries
- Added session-derived `GET/PATCH /v1/profile` endpoints; users can update only their own first name, last name, phone, and HTTPS avatar URL
- Profile audits record only changed field names and tenant context, never submitted contact values; no schema migration was required
- Verified 246 passing API tests, repository-wide TypeScript checks, production web/API builds, live API health, and unauthenticated profile denial
- The standalone web lint command remains interactive because the repository has no ESLint configuration; the Next.js production build completed its built-in lint/type validation

### ✅ Safe local frontend startup command
- Added `npm run dev:safe` to replace a stale Dentra listener on local port 5001 before starting the Next.js development server
- The helper only stops Node/Next.js processes launched within this project; unrelated applications and macOS services are reported and left untouched
- Moved local development URLs and API origin defaults to port 5001 to avoid the macOS AirPlay Receiver conflict; Replit remains on port 5000

### ✅ User manuals
- Added the project-root `docs/` user manual set: general system guide, Super Admin manual, clinic staff/dentist manual, and patient manual
- Documented current routes, roles, tenant/privacy boundaries, daily workflows, feature limitations, troubleshooting, and safe support handoff practices
- Linked the manuals from `README.md` and `docs/README.md`; no credentials or secrets are stored in the manuals

### ✅ MVP 2 recall and follow-up
- Added clinic-scoped recall rules by service and automatically created deduplicated patient recalls after treatment records are recorded
- Added due/upcoming queue projection with contact, dismiss, due-date override, and audited follow-up booking actions with dentist overlap protection
- Added responsive `/app/recalls` queue and settings navigation link; contact reminders enqueue non-sensitive notification-outbox messages
- Added migration `0020_wild_mastermind.sql` and applied it locally
- Verified 239 passing API tests, repository-wide TypeScript checks, and clean diff validation

### ✅ MVP 2 reports baseline
- Added tenant-scoped operational appointment/patient, financial collections/outstanding, and inventory stock reports
- Added role/entitlement-protected JSON and CSV report endpoints plus responsive `/app/reports` summary UI
- Verified repository-wide TypeScript checks and existing API test suite

### ✅ MVP 2 microsite customization baseline
- Added approved theme/accent settings, section toggles, structured SEO fields, and tenant-scoped gallery metadata
- Extended clinic settings and public microsite APIs with validation that rejects arbitrary unsafe markup/scripts
- Added migration `0021_tiny_random.sql` and applied it locally
- Verified 239 passing API tests and repository-wide TypeScript checks

### ✅ MVP 2 subscription operations baseline
- Added tenant-scoped subscription overview, audited clinic change requests, and Super Admin review with effective package assignment
- Added period-scoped usage counters and explicit limit errors plus responsive subscription settings UI
- Added migration `0022_fancy_captain_universe.sql` and applied it locally
- Verified 239 passing API tests and repository-wide TypeScript checks

### ✅ MVP 2 roles and permission matrix
- Added Cashier and Inventory Staff effective permission presets plus tenant-scoped membership permission overrides
- Added role-management API with audit events and migration `0023_abandoned_spirit.sql`
- Verified 239 passing API tests, repository-wide TypeScript checks, and local migration application

### ✅ MVP 3 patient portal baseline
- Added separate patient accounts and sessions with scrypt password hashing and HttpOnly cookies
- Added explicit consented clinic-record linking with contact matching and strict linked-patient tenant filters
- Added read-only appointments, invoices, treatment-plan summaries, and reviewed request records at `/portal`
- Added migration `0024_clammy_trish_tilby.sql` and applied it locally
- Verified 239 passing API tests and repository-wide TypeScript checks

### 🔄 MVP 3 search and discovery
- Added validated branch coordinates and distance-aware public clinic directory results
- Existing publication boundaries remain enforced; near-me UI, open-slot resolution, ranking, and structured data remain queued
- Added migration `0025_blushing_mariko_yashida.sql` and applied it locally

### ✅ MVP 3 verification and moderation baseline
- Added private dentist/clinic verification submissions with expiry/review metadata and audited approve/reject/revoke workflows
- Added protected clinic submission and Super Admin moderation APIs; public profiles never expose document references
- Added migration `0026_volatile_pet_avengers.sql` and applied it locally

### ✅ MVP 3 reviews baseline
- Added completed-appointment and explicit patient-link eligibility, one-review-per-appointment constraint, moderation states, and public aggregates
- Added clinic responses and Super Admin moderation APIs with audit events
- Added migration `0027_ambitious_sage.sql` and applied it locally

### 🔄 MVP 3 enterprise multi-branch
- Added organization and member-clinic boundaries, owner/admin/regional-manager/viewer roles, and organization-scoped consolidated summaries
- Added organization creation, clinic attachment, and access-checked report APIs
- Remaining: cascading entitlements, central catalog, staff branch assignment, and consented transfers
- Added migration `0028_cultured_fenris.sql` and applied it locally

### ✅ MVP 3 advanced analytics baseline
- Added tenant-scoped aggregate analytics for appointment/revenue trends and conversion, no-show, cancellation, and treatment acceptance rates
- Added `reports.advanced` and role gating; no patient names or clinical notes are returned
- Verified 239 passing API tests and repository-wide TypeScript checks

### ✅ MVP 3 online payment safety baseline
- Added expiring hashed invoice payment links, provider-neutral HMAC webhook verification, idempotent event records, and invoice reconciliation
- Added migration `0029_numerous_reavers.sql` and applied it locally; provider credentials remain environment-only
- Hardened webhook signature comparison with length-checked constant-time equality; regex-based comparison is no longer used

### ✅ MVP 3 custom domain verification baseline
- Added normalized custom-domain records, DNS TXT instructions, verification checks, activation guards, and audit events
- Added migration `0030_majestic_wendell_vaughn.sql` and applied it locally; SSL provisioning remains adapter/deployment work

### 🔄 MVP 3 integrations and partner API
- Added tenant-scoped hashed API keys with read scopes, revocation, last-use tracking, and one-time secret delivery
- Added webhook subscription records with one-time signing secrets and event declarations
- Added rate-limited read-only partner appointment export with a bounded date window and strict API-key tenant scope
- Added migration `0031_illegal_leopardon.sql` and applied it locally; provider connectors, calendar/accounting exports, and delivery retries remain queued
- Verified 239 passing API tests and repository-wide TypeScript checks

### ⛔ MVP 3 offline mode security gate
- Added `docs/THREAT_MODEL_OFFLINE_MODE.md` with assets, trust boundaries, threats, and required controls
- No offline PHI cache, device enrollment, or sync code was implemented; the task remains blocked pending independent security review and explicit product approval

### 🔄 MVP 3 platform operations baseline
- Added auditable clinic support-access requests with written justification and time-boxed Super Admin review decisions
- Added tenant export/offboarding request state metadata and protected processing controls; no silent record access or destructive deletion is performed
- Added migration `0032_curly_risque.sql` and applied it locally
- Verified repository-wide TypeScript checks; the existing API test suite remains green

### 🔄 MVP 3 AI imaging baseline
- Added `FeatureKey.AI_IMAGING` and an entitlement-gated radiograph analysis record with strict clinic/file/patient ownership validation
- Added advisory-only confirmation and deterministic oral-health score snapshots; no image pixels or clinical text are sent to an external provider
- Added migration `0033_previous_franklin_richards.sql` and applied it locally
- Remaining provider evaluation, annotation UI, diagnostics assistant, and clinical validation are explicitly queued

### ✅ MVP 3 kiosk check-in baseline
- Added `kiosk.checkin` entitlement and branch/today-scoped public lookup and check-in endpoints with rate limits and identity revalidation
- Added touch-optimized `/kiosk/{branchId}` UI with masked patient display, confirmation, and 60-second inactivity reset
- Kiosk check-ins use row locking, appointment status history, and identifier-only audit metadata; no clinical data is exposed
- Verified repository-wide TypeScript checks and the existing 239-test API suite

### ✅ MVP 2 treatment planning
- Added tenant-scoped treatment plans and multi-item proposals directly from patient profiles
- Added entitlement- and role-protected plan APIs with draft → approved → archived lifecycle and item progress/cancellation transitions
- Linked completed plan items to matching performed treatment records and recorded identifier-only audit events for plan mutations
- Added responsive dentist authoring/approval controls and clinic printable approved-plan summaries
- Added migration `0015_useful_nocturne.sql`, enabled the treatment-plans entitlement for Professional and Enterprise packages, and verified migration application
- Verified 231 passing API tests, repository-wide TypeScript checks, and clean diff validation

### ✅ MVP 2 service catalog and pricing
- Added service category, duration, active/inactive, and public-booking visibility controls to the clinic catalog
- Added tenant-scoped catalog APIs for clinic admins with canonical service-catalog entitlement and audit events
- Added effective-dated clinic base prices and optional branch overrides with history and safe clear/fallback behavior
- Updated invoice generation to resolve the effective branch price while preserving immutable invoice line-item snapshots
- Public directories and booking now exclude inactive or internal-only services
- Added responsive catalog management at `/app/settings/services`, including branch pricing view and price history
- Added migration `0016_opposite_zemo.sql`, backfilled existing service prices, enabled Professional/Enterprise catalog access, and verified local migration application
- Verified 234 passing API tests, repository-wide TypeScript checks, and web/API production builds

### ✅ MVP 2 billing and payments
- Extended invoices with treatment-plan references, subtotal/discount metadata, and partial-payment statuses
- Added multiple installment payments with server-calculated remaining balances and transactional row locking
- Added permission-gated discount reasons and amounts during invoice generation
- Added immutable refund and admin adjustment transactions with reasons, branch/tenant checks, and audit events
- Added invoice detail controls for installments, refunds, adjustments, discounts, and remaining balance
- Added migration `0017_vengeful_magneto.sql` and applied it locally
- Verified 236 passing API tests, repository-wide TypeScript checks, and web/API production builds (with expected build-time fetch warnings when the local API is not running)

### ✅ MVP 2 prescription and clinical-file baseline reconciliation
- Marked MVP 2 Tasks 04–05 complete for the current scope because the immutable prescription/amendment workflow and private tenant-scoped clinical-file upload/signed-access workflows were already delivered under MVP 1 Tasks 20–21
- Deferred hardening remains explicitly documented in Task 05 (malware scanning, patient portal downloads, and video recordings)

### ✅ MVP 2 inventory
- Added tenant-scoped inventory item master with SKU, category, unit, supplier, reorder level, and active state
- Added immutable stock-in, stock-out, and signed adjustment ledger transactions with batch/expiry metadata
- Derived current stock from the ledger and reject stock-outs that exceed available quantity
- Added low-stock and expiry indicators in the clinic settings inventory view
- Added canonical `inventory.manage` entitlement and role-protected inventory APIs with audit events
- Added migration `0018_burly_wolf_cub.sql` and applied it locally
- Verified 238 passing API tests, repository-wide TypeScript checks, and web/API production builds (with expected build-time fetch warnings when the local API is not running)

### ✅ MVP 1 post-merge acceptance audit
- Rechecked every MVP 1 task and implementation step after migration-history/content merges; Tasks 01–21 are now evidence-marked and the release checklist covers Increment 5 business basics
- Enforced canonical feature entitlements and clinic-role authorization on every direct billing, payment, prescription, and clinical-file API, not only sidebar visibility
- Added pre-storage validation that clinical file branch, patient, and optional encounter all belong to the same clinic and relationship; removed fallback HMAC secrets from clinical-file and remote-consult signed access
- Wired finalized encounters to a responsive prescription drawer with encounter preselection and authenticated dentist PRC defaults; added an entitlement-aware patient prescription timeline and gated file/business actions in direct views
- Added direct finalized-encounter invoice preselection, Manila-day payment/collections handling, and enabled MVP 1 business entitlements for the Professional demo package without changing existing deterministic seed IDs
- Corrected stale clinic-login redirects and updated the MVP 1 scope, task index, release evidence, README, and shared feature comments
- Verified 228 passing API tests and repository-wide TypeScript checks; production build and migration checks are recorded with this commit

### ✅ MVP 1 release hardening and synthetic demo data
- Expanded the clean idempotent seed target to 2 clinics, 4 dentists, 20 synthetic patients, and 50 synthetic appointments while retaining fictional test contact and PRC-style identifiers
- Added release-gate coverage for concurrent same-dentist booking, multi-clinic dentist separation, unpublished public 404s, PWA API cache exclusion, synthetic seed targets, and append-only audit enforcement
- Live direct checks confirmed Clinic A receives `403` for Clinic B patients, unpublished clinic/dentist records return `404`, and two simultaneous requests for one dentist/slot return exactly `201 + 409`
- Rendered and visually inspected clinic PWA, Super Admin audit, and public clinic surfaces at 375×812, 768×1024, and 1280×900; CDP metrics found no document-level horizontal overflow
- Added `docs/MVP1_RELEASE_CHECKLIST.md` as the durable evidence matrix for every MVP 1 release gate
- Reseeded the configured database successfully and verified 157 passing API tests plus repository-wide typecheck

### ✅ Immutable audit baseline and Super Admin audit log
- Centralized every API audit append through a shared transaction-aware `writeAudit` helper so domain mutations and their audit records remain atomic
- Covered clinic lifecycle/settings, dentist state/affiliation, package/entitlement, booking/appointment status, patient history, encounter, treatment, and odontogram actions with identifier/state-only metadata
- Added protected, paginated `GET /v1/admin/audit` with actor email, action type, and Manila date-range filters plus clinic scope labels
- Replaced the audit stub with a responsive Super Admin ledger showing timestamp, actor, action, clinic/platform scope, and target entity
- Added and applied migration `0007_audit_immutability.sql`; PostgreSQL now rejects all updates and deletes against `audit_events`
- Verified the live authenticated audit endpoint, 151 passing API tests, and repository-wide typecheck

### ✅ Live clinic and dentist dashboards
- Added live tenant/branch-scoped summary, appointment list, dentist schedule, and recent-patient APIs with feature and membership enforcement
- Dentist schedule/list/status access is additionally restricted to the authenticated linked dentist, including direct API calls
- Added row-locked appointment transition rules with immutable status history and audit events for check-in, start, complete, no-show, and cancel workflows
- Replaced clinic mock KPIs/table and the appointments stub with live responsive views and immediate status-action refresh
- Replaced dentist mock next-up, schedule, and recent patients with live data and a full date/status schedule view
- Both dashboard clients provide loading skeletons, visible error/retry states, 60-second polling, and refresh on document visibility
- Verified live seeded counts/schedule/recent-patient results, 147 API tests, repository-wide typecheck, and production builds

### ✅ Encounter treatment records
- Added feature-protected active service catalog, patient treatment history, and encounter treatment creation APIs
- Treatment creation locks and validates the tenant encounter, derives its patient and performing dentist server-side, and rejects inactive services or finalized encounters
- Added inline draft-encounter treatment entry with service, tooth/area, performed date, and notes; finalized encounter treatments render read-only
- Added treatment timelines to patient clinical profiles with dentist, procedure, tooth/area, date, notes, and encounter navigation
- Writes immutable `treatment.recorded` audits with identifiers only and no treatment-note content
- Verified live seeded service/treatment APIs and finalized encounter rendering, 142 API tests, repository-wide typecheck, and production builds

### ✅ Append-only adult odontogram
- Confirmed the existing event schema covers surface-aware conditions/procedures, encounter links, and self-referencing corrections without a migration
- Added feature-protected history, append-event, and correction APIs with exact clinic/patient/dentist/encounter validation
- Added an interactive responsive SVG showing all 32 permanent teeth in FDI notation, surface selection, validated condition/procedure vocabularies, and visual current states
- Correction actions append a new event referencing the original; no update or delete endpoint exists and the full per-tooth history remains available
- Current-state projection excludes superseded events and resolves the latest effective event per tooth/surface key
- Verified live dentist rendering, 139 API tests including correction and tenant-isolation cases, and repository-wide typecheck

### ✅ Dentist clinical encounters
- Added feature-protected encounter list, create, detail, and update APIs with exact clinic scoping and dentist-derived identity
- Validates the patient tenant, active dentist-branch assignment, and optional appointment linkage before clinical record creation
- Added a complete draft editor and confirmed finalization workflow; finalized encounters are read-only and protected by a transactional state check
- Added dentist encounter lists, patient filtering, prefilled patient/appointment context, and profile appointment links to existing encounters
- Writes distinct immutable create, update, and finalize audits containing identifiers/state only, never clinical free text
- Verified live seeded dentist API/pages, cross-tenant and role denials, 134 API tests, and repository-wide typecheck

### ✅ Tenant-scoped patient management
- Added protected patient list, registration, profile, medical-history, and dental-history APIs with role and feature-key entitlement enforcement
- Enforces the clinic boundary before every patient query and confirmed a seeded Clinic A session receives `403` for Clinic B records
- Added migration `0006_dazzling_legion.sql` for database-enforced per-clinic patient-number uniqueness and serialized number allocation per tenant
- Added responsive staff and dentist patient directories, a registration slide-over, complete demographic/contact/emergency/guardian profiles, and sortable appointment history with encounter links
- Medical and dental questionnaire edits are append-only versions with actor/timestamp timelines and PII-safe audit metadata
- Verified live seeded APIs and rendered list/profile pages, 129 API tests, repository-wide typecheck, and production builds

### ✅ Clinic PWA shell with live tenant context
- Added a protected clinic workspace endpoint that returns real clinic metadata and only active branches authorized by the current membership
- Wired the server-rendered app shell to live clinic, branch, package, and feature-key entitlement data
- Replaced placeholder clinic/branch/user labels and added a validated, clinic-scoped branch selector for multi-branch memberships
- Filters desktop, mobile drawer, and bottom-tab navigation using canonical entitlements while keeping baseline profile/settings access available
- Preserved the installable manifest and network-only API behavior so protected clinical responses are never cached for offline use
- Verified cross-tenant and branch-scope denials, a live seeded clinic session and rendered shell, 124 API tests, and repository-wide typecheck

### ✅ Public appointment booking
- Added public availability resolution using branch operating hours, service duration, active dentist assignments, and all-affiliation schedule conflicts
- Added a rate-limited anonymous booking endpoint with strict input validation and server-owned clinic scope
- Serializes the final same-dentist overlap check with row locks and atomically creates the pending appointment, initial status history, and PII-safe audit event
- Added reusable clinic and dentist booking wizards with prefilled context, live slots, inline race-condition feedback, and a detailed confirmation reference
- Verified both live seeded entry pages and the same-origin availability proxy, 120 API tests including overlap/conflict cases, and repository-wide typecheck

### ✅ Public dentist profile pages
- Added a publication-safe `GET /v1/public/dentists/:slug` boundary for verified, published dentists
- Added crawlable, server-rendered dentist profiles with professional information, specialty/service tags, and dynamic SEO metadata
- Shows only active affiliations at operational, published clinics and branches, with clinic-specific service context
- Added booking links prefilled with the selected dentist, clinic, and branch for the public booking flow
- Verified hidden-profile behavior, API response safety, live seeded rendering, 115 API tests, repository-wide typecheck, and production builds

### ✅ Public clinic microsite and clinic-managed content
- Added structured clinic hero text and per-branch weekly operating hours through migration `0005_faithful_azazel.sql`
- Added a publication-safe clinic detail API and server-rendered microsite with profile, contact/social, map, branch/hour, service, and published dentist sections
- Replaced Clinic Settings stub with tenant-scoped, role-protected profile/hours editing and confirmed entitlement-aware publication controls
- Audits clinic profile, branch-hour, and publication mutations without storing content values in audit metadata
- Standardized PostgreSQL UUID validation so deterministic seeded IDs remain valid while malformed identifiers are rejected
- Verified unpublished clinic 404 behavior, live seeded API/page rendering, 114 API tests, repository-wide typecheck, and production builds

### ✅ Public discovery directories and landing refinement
- Added public clinic and dentist APIs with a server-owned publication boundary: clinics must be operational/published and dentists verified/published
- Added responsive, server-rendered `/clinics` and `/dentists` directories with filtering and pagination
- Public payloads expose only profile, location, service, and published affiliation metadata—never tenant-internal or clinical fields
- Wired homepage published counts to a cached summary endpoint, fixed public navigation/CTA/footer destinations, and added page-specific SEO/Open Graph metadata
- Verified live seeded responses and rendered HTML, location/service filters, 108 API tests, repository-wide typecheck, and production builds

### ✅ Complete Super Admin package and subscription management
- Added tenant-protected `GET /v1/entitlements/:clinicId` resolving all canonical feature keys from the effective package plus latest active overrides
- Returns explicit disabled/unavailable features for deterministic PWA navigation gating
- Enforces same-clinic membership or exact Super Admin access and denies cross-tenant discovery before querying
- Completed package catalog, plan-feature mapping, subscription ledger/reassignment, and entitlement API across all Task 04 steps
- Verified the module with 105 passing API tests, repository-wide typecheck, and web/API production builds

### ✅ Subscription reassignment from the ledger
- Identifies currently effective versus historical subscription rows without deleting plan history
- Reuses the protected, audited effective-date package assignment workflow directly from current subscription rows
- Limits reassignment options to active packages and keeps historical rows read-only
- Verified the integration with 102 passing API tests and repository-wide typecheck

### ✅ Super Admin subscription ledger
- Added protected, paginated `GET /v1/admin/subscriptions` with clinic/package search and status/package filters
- Preserves and displays historical as well as current effective-dated assignments instead of flattening subscription history
- Replaced the subscriptions stub with a responsive filterable ledger linked to clinic detail
- Verified authorization, filter validation, and response behavior with 102 passing API tests and repository-wide typecheck

### ✅ Super Admin package catalog management
- Added a human-readable package price display and a database uniqueness constraint for package-to-feature mappings through migration `0004_bored_sumo.sql`
- Added protected package list/create/edit/deactivate APIs backed exclusively by canonical `FeatureKey` values
- Replaced the package stub with responsive plan cards and a create/edit feature-toggle drawer
- Reports enabled feature count and effective active clinic count per package and audits catalog mutations
- Verified authorization, normalization, feature-key validation, and duplicate handling with 99 passing API tests and repository-wide typecheck

### ✅ Complete Super Admin dentist management
- Added confirmed verify/revoke and publish/unpublish actions with exact Super Admin authorization
- Enforces verification before public profile publication and uses conditional updates to prevent stale state transitions
- Appends immutable verification and publication audit events with previous/next state metadata
- Completed live listing, creation, detail, affiliation, verification, and publication across all five Task 03 steps
- Verified the completed module with 94 passing API tests, repository-wide typecheck, and web/API production builds

### ✅ Super Admin dentist affiliation management
- Added protected add/remove affiliation endpoints and responsive controls on dentist detail
- Resolves clinic scope from the selected branch instead of accepting a client-supplied tenant ID
- Rejects archived/deleted branch targets, duplicate active affiliations, and cross-dentist removals
- Preserves removal history through deactivation and appends tenant-scoped affiliated/unaffiliated audit events transactionally
- Verified authorization, tenant injection denial, scoping, and audit behavior with 89 passing API tests and repository-wide typecheck

### ✅ Super Admin dentist detail
- Added protected `GET /v1/admin/dentists/:dentistId` and linked directory rows to the dentist detail page
- Shows professional profile fields, verification/publication state, and active clinic-branch affiliations
- Keeps the platform response limited to dentist and affiliation metadata with no patient or clinical records
- Verified authorization, identifier validation, and response behavior with 82 passing API tests and repository-wide typecheck

### ✅ Super Admin dentist creation
- Added protected `POST /v1/admin/dentists` with strict normalization and rejection of client-injected fields
- Creates dentist profiles with safe `unverified` and private `draft` defaults, while enforcing globally unique public slugs
- Appends an immutable platform-level `dentist.created` audit event in the same transaction as profile creation
- Added an accessible responsive slide-over with automatic slug generation, inline errors, and a successful refresh into the live directory
- Verified authorization, validation, duplicate handling, audit behavior, and safe defaults with 79 passing API tests, repository-wide typecheck, and web/API production builds

### ✅ Live Super Admin dentist list
- Added protected `GET /v1/admin/dentists` with validated search, verification-state filtering, and pagination
- Enforced exact database-resolved `super_admin` authorization before any dentist query runs
- Returned dentist profile metadata and distinct active clinic-affiliation counts without exposing clinic, patient, or clinical records
- Replaced the `/dentra-admin/dentists` stub with a responsive server-rendered table, filter controls, pagination, loading, empty, and API error states
- Verified authorization and filter behavior with 72 passing API tests, repository-wide typecheck, and web/API production builds

### ✅ Complete Super Admin clinic management
- Added effective-dated package assignment with preserved subscription history and current-period entitlement resolution
- Added reasoned, optionally expiring feature overrides with audited set/remove operations
- Added audited microsite publish/unpublish controls with operational-status and `FeatureKey.MICROSITE_PUBLISH` enforcement
- Added confirmation-based responsive controls and same-origin proxy routes for all three workflows
- Verified authorization, validation, tenant scoping, effective-date rules, audit behavior, entitlement enforcement, 68 API tests, typecheck, and web/API production builds

### ✅ Super Admin clinic branch creation
- Added protected `POST /v1/admin/clinics/:clinicId/branches` with strict normalized validation and route-owned tenant scope
- Serializes branch creation per clinic, automatically makes the first branch main, and rejects a second active main branch
- Creates the branch and immutable audit event atomically without patient or clinical data exposure
- Added an accessible two-step add/review/confirm workflow with inline success and error states
- Verified authorization, validation, tenant-injection rejection, main-branch rules, audit behavior, 49 API tests, typecheck, and web/API production builds

### ✅ Super Admin clinic status actions
- Added protected, validated activate, suspend, archive, and reactivate transitions
- Uses a conditional transactional update and appends an audit event containing the actor and previous/next status
- Suspended and archived clinics no longer resolve active clinic-member authorization
- Added accessible confirmation dialogs and inline success/error feedback on the clinic detail page
- Verified Super Admin authorization boundaries, transition rules, audit action mapping, 39 API tests, typecheck, and web/API production builds

### ✅ Super Admin clinic detail
- Added protected `GET /v1/admin/clinics/:clinicId` and `/dentra-admin/clinics/[clinicId]`
- Shows tenant account metadata, owner, branches, subscription dates, active overrides, and effective feature-key entitlements
- Excludes patient and clinical records from the platform-management response
- Verified against seeded local data, authenticated page rendering, 26 API tests, typecheck, and web/API production builds

### ✅ Super Admin clinic onboarding
- Added the create-clinic page, live active-package options, and protected `POST /v1/admin/clinics`
- Clinic, pending owner membership, initial trial subscription, and audit events are written atomically
- Kept owner login email separate from public clinic contact information
- Verified Super Admin authorization, local package options, authenticated page rendering, 21 API tests, typecheck, and web/API production builds

### ✅ Inter typography and icon alignment
- Aligned the app, Tailwind/global font tokens, brand guidance, and editable wordmarks with Inter
- Applied Next.js's generated Inter class directly to the document body with a safe CSS fallback
- Confirmed Lucide React as the single UI icon system
- Verified live port 5050 output, typecheck, all 15 API tests, and web/API production builds

### ✅ Dentra.ph brand and technical migration
- Replaced customer-facing naming across the public site, Super Admin, Clinic/Dentist app, metadata, and offline experience
- Integrated the approved SVG logo pack through a shared logo component and regenerated PWA/Apple-touch icons
- Migrated npm workspaces to `@dentra/*`, the local PostgreSQL target to `dentra_local`, API identifiers to Dentra, and the seeded Super Admin to `admin@dentra.ph`
- Migrated the Super Admin route to `/dentra-admin`
- Verified the renamed login, migrations, typecheck, 15 API tests, and production build

### ✅ Monorepo scaffolding
- **npm workspaces** set up: `apps/web`, `apps/api` (placeholder), `packages/db`, `packages/shared`
- Root `package.json` with shared scripts (`dev`, `build`, `db:generate`, `db:migrate`, `db:seed`)
- TypeScript configured across all packages

### ✅ Shared packages
- `packages/shared/src/enums.ts` — `PlatformRole`, `ClinicRole`, `FeatureKey`, `AuditAction`, `AppointmentStatus`, `SubscriptionStatus`, etc.
- `packages/shared/src/schemas.ts` — Zod validation schemas

### ✅ Database schema (packages/db)
All Drizzle ORM schema files created:

| File | Tables |
|------|--------|
| `clinics.ts` | `clinics` (+ `prefix` column for short IDs) |
| `branches.ts` | `branches` |
| `dentists.ts` | `dentists`, `dentist_branch_assignments` |
| `users.ts` | `users`, `clinic_memberships` |
| `patients.ts` | `patients`, `patient_medical_histories`, `patient_dental_histories` |
| `appointments.ts` | `appointments`, `appointment_status_history`, `services` |
| `subscriptions.ts` | `packages`, `package_features`, `clinic_subscriptions`, `clinic_feature_overrides` |
| `audit.ts` | `audit_events` |
| `encounters.ts` | `encounters`, `treatment_records` |
| `odontogram.ts` | `odontogram_events` |
| `billing.ts` | `invoices`, `invoice_line_items`, `invoice_payments` |
| `prescriptions.ts` | `prescriptions`, `prescription_items` |
| `clinical-files.ts` | `clinical_files` |
| `ai-interactions.ts` | `ai_interactions` |
| `remote-assessments.ts` | `remote_assessments` |
| `hmo.ts` | `hmo_payers`, `patient_hmo_memberships`, `hmo_claims` |

### ✅ Database migrations

| File | Contents |
|------|---------|
| `0000_talented_speedball.sql` | All base tables (clinics → audit_events) |
| `0001_overrated_loners.sql` | `patient_dental_histories`, `encounters`, `treatment_records`, `odontogram_events` |
| `0002_sleepy_lethal_legion.sql` | `prefix` column + unique constraint on `clinics` |
| `0003_great_zemo.sql` | Better Auth `accounts`, `sessions`, and `verifications`; auth identity fields on `users` |
| `0004_bored_sumo.sql` | Package display price and unique package-feature mappings |
| `0005_faithful_azazel.sql` | Structured clinic hero text and branch operating hours |
| `0006_dazzling_legion.sql` | Tenant-scoped patient-number uniqueness |
| `0007_audit_immutability.sql` | Database trigger rejecting every audit-event update or delete |
| `0008_billing_lite.sql` | Service pricing, invoices, line items, and single-payment records |
| `0009_prescriptions.sql` | Immutable prescriptions and medicine line items |
| `0010_clinical_files.sql` | Private clinical-file metadata |
| `0011_ai_interactions.sql` | Metadata-only AI interaction records |
| `0012_remote_assessments.sql` | Remote photo consultation records |
| `0013_hmo_claims.sql` | HMO payers, patient memberships, claims, and service coverage fields |
| `0014_merge_history_reconciliation.sql` | Idempotent reconciliation for the two merged migration histories |

### ✅ Demo seed data (live in DB)
Script: `scripts/seed-demo.ts` — run with `npm run db:seed`

| Entity | Count | Notes |
|--------|-------|-------|
| Super Admin | 1 | `admin@dentra.ph` |
| Packages | 3 | Starter, Professional, Enterprise |
| Clinics | 2 | Smile Bright Dental (SBD), BrightSmile Dental (BSM) |
| Branches | 3 | 2 for SBD, 1 for BSM |
| Dentists | 4 | Dr. Reyes, Dr. Santos, Dr. Cruz, Dr. Garcia |
| Staff users | 6 | 3 per clinic (admin, receptionist, assistant) |
| Services | 12 | 6 per clinic |
| Patients | 20 | 10 per clinic on a clean seed, synthetic Filipino names + Metro Manila addresses |
| Appointments | 50 | 25 per clinic, date spread with mixed statuses |
| Encounters | 32 | 1 per completed seeded appointment |
| Treatment records | 32 | 1 per encounter |
| Odontogram events | 32 | 1 per encounter |

**Patient number format:** `{PREFIX}{NNNNNN}` — e.g. `SBD000001`, `BSM000012`

### ✅ Web app shell (apps/web — Next.js 14)
**Super Admin section** (`/dentra-admin`)
- Better Auth email/password login with an HTTP-only database session
- Server-side `super_admin` role enforcement on every admin shell route
- Real logout with server-side session invalidation
- Dashboard with sidebar, top bar, mobile tab bar
- Live clinic, dentist, package, subscription, and audit management; platform settings remains a future operations surface

**Clinic / Dentist section** (`/app`)
- Better Auth email/password login with an HTTP-only database session
- Server-side clinic membership enforcement on every app shell route
- Clinic staff versus dentist navigation derived from database membership
- Installable clinic PWA with manifest, app icons, service worker, and safe offline fallback
- App shell with sidebar, top bar, mobile tabs
- Dashboard variants for clinic admin vs dentist
- Live dashboards, appointments, patients, clinic settings, dentist schedule, encounters, treatments, and odontogram; staff/team administration remains a follow-up surface

### ✅ Fastify API foundation (apps/api)
- Fastify 5 TypeScript workspace with development, build, start, typecheck, and test scripts
- `GET /health` liveness endpoint
- `GET /v1/health` readiness endpoint backed by a real PostgreSQL query
- Explicit credentialed CORS allowlist for the frontend origin
- Helmet security headers and cookie parsing ready for the authentication task
- Structured JSON errors for unknown routes and server failures
- Authorization and cookie headers are redacted from API logs
- Graceful shutdown closes the shared PostgreSQL connection pool
- Vitest coverage for liveness, database readiness/failure, and CORS

### ✅ Better Auth backend foundation
- Better Auth mounted at `/v1/auth/*` with database-backed, seven-day sessions
- Email/password sign-in enabled; public sign-up disabled until invite/onboarding flows exist
- `GET /v1/session-context` returns only backend-resolved platform roles and active clinic memberships
- Reusable `superAdmin` and tenant/clinic role guards enforce server-side authorization boundaries
- Auth tokens/cookies remain redacted from logs; secure, HTTP-only, SameSite cookies are configured
- Fastify and Better Auth rate limits protect auth endpoints, with a stricter email sign-in limit
- Migration `0003_great_zemo.sql` applied and verified on local PostgreSQL
- API authorization/auth-route test suite expanded to 11 passing tests

### ✅ Real Super Admin sign-in (task #13)
- Replaced the legacy Super Admin localStorage session flag with Better Auth sign-in and logout
- Added same-origin Next.js auth/session proxy routes so secure cookies work across the split web/API deployment
- Protected `/dentra-admin/(shell)` with a server-rendered backend session and exact `super_admin` role check
- Seeded Super Admin credentials idempotently from the ignored `SUPER_ADMIN_PASSWORD` environment variable
- Admin identity in the shell is populated from the authenticated database user rather than hardcoded authorization state
- Verified the full flow manually: denied before login → successful login → protected page 200 → logout → denied again
- Added the web workspace to the repository-wide TypeScript check

### ✅ Live Super Admin clinic list (task #12)
- Added protected `GET /v1/admin/clinics` with validated search, status, and pagination filters
- Enforced an exact database-resolved `super_admin` role before any clinic query runs
- Returned clinic account metadata with latest package name and active branch count; no patient or clinical data is exposed
- Replaced the `/dentra-admin/clinics` stub with a responsive server-rendered table
- Added search by clinic name/slug/prefix, status filtering, pagination, loading, empty, and API error states
- Added API denial and success coverage; API suite now has 15 passing tests

### ✅ Real Clinic and Dentist sign-in
- Replaced the legacy Clinic localStorage session flag and client-selected role with Better Auth email/password sign-in
- Added a server-rendered clinic membership guard for `/app/(shell)` routes
- Derived clinic staff versus dentist access from `/v1/session-context`
- Added real session invalidation on logout and removed `ClinicAuthGuard.tsx`
- Seeded idempotent credential accounts for clinic staff and Dr. Maria Reyes using `CLINIC_DEMO_PASSWORD`

### ✅ Clinic PWA static shell
- Added a clinic-scoped web app manifest and install icons
- Added a minimal service worker with network-first navigation and an offline fallback
- Explicitly excluded `/api/*` and `/v1/*` requests from caching so protected clinical data is not served stale

### ✅ Scripts & automation
- `scripts/post-merge.sh` — auto-runs migrations after task merges
- `scripts/generate-migration.sh` — helper to generate new migration files
- `scripts/apply-migrations.sh` — applies pending migrations
- `scripts/seed-demo.ts` — idempotent demo data seeder

### ✅ Documentation
- `README.md` — project overview
- `DEVELOPER.md` — local setup, conventions, workflow
- `AGENTS.md` — agent coordination rules
- `replit.md` — Replit-specific setup notes
- `tasks/README.md` + `tasks/mvp1/`, `tasks/mvp2/`, `tasks/mvp3/` — 52 scoped task files

### ✅ Billing lite — service pricing, invoices & receipts (task #22)
- Added `price_php` column to `services` table and `invoices`, `invoice_line_items`, `invoice_payments` tables via migration `0008_billing_lite.sql`
- Added `InvoiceStatus` and `PaymentMethod` enums + billing `AuditAction` entries to `@dentra/shared`
- Created `apps/api/src/clinic/billing-service.ts` with full service: list/price-update for services, generate invoice from finalized encounter, record single payment, today's earnings
- Created `apps/api/src/routes/clinic-billing.ts` with 6 routes under `/v1/clinic/:clinicId/*`, registered in `app.ts` / `server.ts`
- Added web proxy route `apps/web/app/api/clinic/[...path]/route.ts`
- Added Billing nav item to `AppSidebar.tsx`
- Built invoice list page (`/app/billing`) with patient/status search filter and pagination
- Built invoice detail page (`/app/billing/[invoiceId]`) as server component + client child for payment modal + print
- Built service pricing settings page (`/app/settings/services`) with inline editable price fields
- Updated clinic dashboard to show live Today's Collections tile fetched from `/v1/clinic/:clinicId/earnings/today`
- Seeded all 12 demo services with PHP prices (₱350–₱8,000); seed script updated to include `pricePhp`
- All 222 API tests pass; typecheck clean

### ✅ Prescription builder / e-Rx (task #23)
- Added tenant-scoped `prescriptions` and `prescription_items` via migration `0009_prescriptions.sql`, including immutable amendment links
- Added protected issue, list, detail, and amend workflows with finalized-encounter validation and `prescription.issued` audit records
- Built prescription list, new prescription, detail, amendment, and browser-printable prescription pages
- Added dentist PRC and clinic/patient identity snapshots so issued prescriptions remain historically accurate

### ✅ Clinical file uploads — X-rays & photos (task #24)
- Added tenant-scoped clinical file metadata via migration `0010_clinical_files.sql`
- Added private multipart upload, validated file allowlists and size limits, short-lived signed access, and file deletion workflows
- Built encounter and patient file views with upload controls, image preview, and PDF access
- Scoped every metadata lookup and storage key to the clinic, patient, branch, and optional encounter

### ✅ AI clinical assistance — notes, voice-to-text & suggestions (task #25)
- Migration `0011_ai_interactions.sql`: metadata-only `ai_interactions` table (feature, model, token counts, latency, outcome)
- `AiAssistanceService` with provider-agnostic interface; `AiInteractionType` enum added to `@dentra/shared`
- Routes: `POST /v1/clinic/:clinicId/ai/suggest-notes`, `POST /v1/clinic/:clinicId/ai/suggest-recall`; encounter ownership validated against clinic/branch scope before any AI call
- Web: AI note suggestion panel on encounter edit page; `AIRecallBanner` (labelled "Review only") on recall display; voice-to-text dictation using Web Speech API
- Security: encounterId validated to clinic + caller branch; AI routes require clinic member auth; no PII in audit logs

### ✅ Tele-dentistry — remote photo consultations (task #26)
- Migration `0012_remote_assessments.sql`: `remote_assessments` with private photo metadata; status: `pending → reviewed | closed`
- Public submission endpoint `POST /v1/public/consult/:clinicId` — no auth required; up to 5 photos per consult
- Photos stored in Replit Object Storage at `teledentistry/{clinicId}/{assessmentId}/{index}`; 15-minute HMAC-SHA256 signed download tokens (same pattern as clinical files)
- Clinic routes: list, get, review, close assessments; `closeAssessment` has duplicate-close guard; `reviewAssessment` blocks already-reviewed/closed assessments
- Web: `/app/dentist/remote-consults` list with status tabs; detail page with signed photo gallery + assessment form + close action; public `/consult/[clinicId]` submission page
- `@fastify/multipart` limit raised to `files: 5` globally

### ✅ HMO / Insurance claims module (task #27)
- Migration `0013_hmo_claims.sql`: `hmo_payers`, `patient_hmo_memberships`, `hmo_claims`; `is_hmo_covered` + `hmo_standard_rate_php` columns on `services`
- `HmoService` with full payer/membership/claim CRUD; `assertTransition()` enforces status matrix: `prepared → submitted → approved | rejected → paid`
- Paid transition: locks claim + invoice with `FOR UPDATE`; requires approved amount = invoice total (prevents partial/overpayment); rejects if invoice already paid/voided or if another paid claim exists for same invoice; marks invoice paid atomically
- Cross-tenant validation on every FK: patient, payer, membership, invoice, encounter all scoped to clinic + patient
- Claim status PATCH restricted to clinic admin/owner; claim number globally unique (`HMOCLM` + 8-digit global count + 4-digit random suffix)
- Web: `/app/settings/hmo-payers` payer catalog; `/app/billing/hmo-claims` tracker with status tabs; claim detail with progress tracker + status action forms + printable claim document (`window.print()`); patient HMO tab with membership add/delete; HMO Claims sidebar nav item; Settings page card
- 24 Vitest unit tests covering billing guard logic (zero/under/over/exact amount), status transitions, and concurrent payment paths

---

## Queued (Proposed Tasks)

> **Proposal alignment review (Aug 2026):** The executive summary PDF was reviewed. Features in the proposal's MVP that were deferred to MVP 2 have been promoted to MVP 1 Increment 5 (tasks #22–24). Three new features not in any task file were added: AI clinical assistance (#25, MVP 2), tele-dentistry (#26, MVP 2), HMO/insurance (#27, MVP 2), plus AI imaging and kiosk check-in added to MVP 3 docs.

The August 12 page audit added a prioritized completion backlog. MVP 1 page/runtime
follow-ups are `tasks/mvp1/23`–`27`; MVP 2 workflow follow-ups are `16`–`17`;
MVP 3 frontend completion tasks are `14`–`23`. See `tasks/PAGE_AUDIT.md` for the
route findings, dependencies, and recommended execution order.

---

## Known Gaps / Tech Debt

- **Clinic owner invitation delivery** — clinic creation links or creates a pending owner identity and membership, but invite email delivery and password setup remain a separate onboarding step.
- **Multi-clinic workspace selection** — branch switching is live and all API requests remain tenant-scoped, but a user with memberships in multiple clinics still enters the first active clinic; an explicit clinic switcher is future UX work.
- **Clinic staff/team administration** — the membership schema and authorization resolver are live, but invite, role-change, deactivate, and password-setup delivery workflows remain follow-up work.
- **Super Admin overview metrics** — management ledgers and audit data are live, while the overview KPI/activity cards still use presentation data and should be wired in a future platform-operations task.
- **Legacy clinic prefix default** — admin creation requires a non-empty unique prefix, but the database column retains its historical empty-string default for legacy compatibility.
- **Dependency upgrades pending** — `npm audit` reports 2 high advisories in the existing Next.js/PostCSS stack and 4 moderate build-tool advisories through Drizzle Kit. The runtime Drizzle ORM, new Fastify API, and Vitest test runner were upgraded to patched releases; the remaining fixes require separate tested framework/tooling upgrades.

---

## Reference

### Demo credentials (after seed)
| Role | Email | How to log in |
|------|-------|---------------|
| Super Admin | `admin@dentra.ph` | `/dentra-admin/login` → password from local/Replit `SUPER_ADMIN_PASSWORD` |
| Clinic Admin (SBD) | `admin@smilebrightdental.ph` | `/cl-login` → password from local/Replit `CLINIC_DEMO_PASSWORD` |
| Clinic Admin (BSM) | `admin@brightsmile.ph` | `/cl-login` → password from local/Replit `CLINIC_DEMO_PASSWORD` |
| Dentist | `dr.reyes@smilebrightdental.ph` | `/cl-login` → password from local/Replit `CLINIC_DEMO_PASSWORD` |

### Clinic prefixes
| Clinic | Prefix | Status |
|--------|--------|--------|
| Smile Bright Dental | `SBD` | Active, Professional plan |
| BrightSmile Dental Clinic | `BSM` | Trial, Starter plan |

### Useful scripts
```bash
npm run dev          # Start Next.js locally on port 5001
npm run dev:safe     # Safely replace a stale local Dentra frontend process
npm run api:dev      # Start Fastify API on port 3001
npm run api:start    # Start the production API bundle
npm run test         # Run workspace tests
npm run typecheck    # Run workspace TypeScript checks
npm run db:generate  # Generate a new Drizzle migration from schema changes
npm run db:migrate   # Apply pending migrations
npm run db:seed      # Load demo data (idempotent)
npm run db:studio    # Open Drizzle Studio (requires DATABASE_URL)
```
