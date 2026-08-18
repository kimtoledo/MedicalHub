# Dentra.ph Presentation Demo

This runbook prepares a synthetic, non-destructive Smile Bright Dental scenario for a presentation. It never prints passwords and never deletes clinic transactions.

## Prepare

Set `SUPER_ADMIN_PASSWORD`, `CLINIC_DEMO_PASSWORD`, and `DATABASE_URL` in the local environment, then run:

```bash
DEMO_DATE=2026-08-19 DEMO_SCENARIO=1 npm run demo:prepare
```

Omit `DEMO_DATE` to use today's date in Asia/Manila. Preparation first refreshes the existing synthetic baseline, then upserts only fixed scenario-owned records and runs the read-only readiness checks.

If a scenario has already produced an encounter, preparation stops instead of rewriting that history. Select the next bounded scenario:

```bash
DEMO_SCENARIO=2 npm run demo:prepare
```

Scenarios 1–9 are supported. This produces new fixed synthetic patient/appointment IDs and preserves the earlier presentation history.

## Accounts

| Surface | Email | Password source |
|---|---|---|
| Super Admin | `admin@dentra.ph` | `SUPER_ADMIN_PASSWORD` environment variable |
| Clinic Admin | `admin@smilebrightdental.ph` | `CLINIC_DEMO_PASSWORD` environment variable |
| Dentist | `dr.reyes@smilebrightdental.ph` | `CLINIC_DEMO_PASSWORD` environment variable |

Never paste the password values into slides, documentation, chat, commits, or screen recordings.

## Recommended presentation flow

1. Sign in to `/dentra-admin/login` as Super Admin.
2. Open **Dentists**, show the global PRC identity and clinic/branch affiliations.
3. Open the pending synthetic verification candidate, verify with a short presentation reason, then show the held message in **Email Logs**.
4. Sign out and use `/cl-login` as the Smile Bright clinic admin.
5. Open **Today** and show Completed, In Treatment, Waiting, and Upcoming queues.
6. Use the `Demo-Ready` synthetic patient to demonstrate the quick cleaning handoff and completion.
7. Continue to billing/payment or create a follow-up appointment while the patient context remains available.
8. Sign in as Dr. Maria Reyes to show the same PRC-linked professional profile, branch schedule, and dentist-owned patient workflow.

## Readiness-only check

```bash
DEMO_DATE=2026-08-19 DEMO_SCENARIO=1 npm run demo:check
```

The command checks accounts, clinic state, subscription, required features, PRC linking, service modes, schedules, closures, queue states, and the verification candidate. It is read-only and exits non-zero if anything is missing.

## Local and same-Wi-Fi access

- Computer: `http://localhost:5001/app`
- Phone on the same Wi-Fi: `http://<computer-lan-ip>:5001/app`

Keep the frontend bound to `0.0.0.0`, the API running on port `3001`, and macOS firewall access allowed for Node.js. The browser uses the frontend's same-origin API proxy, so the phone does not need to call port `3001` directly.
