# ToothHub PH — Task Folder

This folder is the **single source of truth** for all planned work across MVP 1, MVP 2, and MVP 3.
Each markdown file describes one discrete work item: what it is, what "done" looks like, its current status, and which project task in the tracker covers it (if any).

---

## Folder structure

```
tasks/
  README.md          ← you are here
  mvp1/              ← Foundation + Core Dental Operations
    00-overview.md
    01-platform-foundation.md
    02-super-admin-clinic-management.md
    03-super-admin-dentist-management.md
    04-super-admin-package-management.md
    05-public-landing-site.md
    06-clinic-microsite.md
    07-dentist-profile-page.md
    08-appointment-booking-public.md
    09-clinic-pwa-shell.md
    10-patient-management.md
    11-clinical-encounter.md
    12-odontogram.md
    13-treatment-records.md
    14-clinic-dashboard-live.md
    15-audit-baseline.md
    16-hardening-and-demo-data.md
  mvp2/              ← Complete Clinic Business Operations
    00-overview.md
    01-treatment-planning.md
    02-service-catalog-pricing.md
    03-billing-payments.md
    04-prescriptions.md
    05-clinical-files-media.md
    06-inventory.md
    07-notifications.md
    08-recall-followup.md
    09-reports.md
    10-microsite-customization.md
    11-subscription-operations.md
    12-new-roles.md
  mvp3/              ← Ecosystem + Scale
    00-overview.md
    01-patient-portal.md
    02-search-discovery.md
    03-verification-moderation.md
    04-reviews.md
    05-enterprise-multibranch.md
    06-advanced-analytics.md
    07-online-payments.md
    08-custom-domains.md
    09-integrations-api.md
    10-offline-mode.md
    11-platform-operations.md
```

---

## Status badges

Each task file carries one of these statuses at the top:

| Badge | Meaning |
|-------|---------|
| ✅ **Done** | Merged and live in the main branch |
| 🔵 **Active** | In the project task tracker, accepted or in progress |
| 📋 **Draft** | In the task tracker as a draft (not yet accepted) |
| 🔲 **Queued** | Scoped and ready — no tracker task created yet |
| 🔜 **Future** | MVP 2 or 3 — not started, not yet scoped in detail |

---

## Golden rule — any change needs a task

> **If you want to build, change, or remove anything — even small things — create a project task first.**

This applies to the agent, to you, and to any contributor working in this repo (Replit Agent, Codex, VS Code).

**Why:**
- Prevents two agents working on the same file simultaneously.
- Gives everyone a shared view of what is in flight.
- Keeps the git history meaningful and auditable.
- Avoids "mystery changes" that break dependent work.

**How:**
1. Find the relevant task file in this folder.
2. If no task exists yet, define the work in a new file here.
3. Then open the Replit task panel and create/propose a project task that points to the file.
4. Only start coding once the task is accepted and assigned.

If the work is a bug fix or a one-line correction with no risk of conflict, use your judgment — but when in doubt, file a task.

---

## Existing project task references

| Task ref | Title | Status |
|----------|-------|--------|
| #5 | Database foundation & migration workflow | ✅ Done |
| #9 | Super Admin panel — login, dashboard & navigation | ✅ Done |
| #10 | Clinic & Dentist dashboard variants | ✅ Done |
| #11 | Update README & add Developer setup guide | ✅ Done |
| #6 | Connect Replit PostgreSQL and apply the first migration | 📋 Draft |
| #7 | Scaffold the Fastify API server (apps/api) | 📋 Draft |
| #8 | Add authentication with Better Auth | 📋 Draft |
| #12 | Let Super Admin see and search all clinics from one table | 📋 Draft |
| #13 | Replace mock login with real Super Admin session on sign-in | 📋 Draft |
