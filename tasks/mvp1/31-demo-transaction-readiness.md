# Presentation Demo Transaction Readiness

> **Status:** ✅ Done — deterministic scenario prepared for August 19, 2026; Replit task reference unavailable in the current Codex session

---

## What & Why

The general demo seed is idempotent, but its appointment dates are only calculated on the first insert. A long-lived development database can therefore have valid synthetic records with no useful activity on the presentation date. Tomorrow's demonstration needs a repeatable, safe preparation command that refreshes only a clearly identified synthetic scenario and confirms the accounts, permissions, PRC link, services, availability, and daily queue are ready.

---

## Scope

- Add a deterministic presentation scenario under the existing Smile Bright Dental demo tenant.
- Refresh only scenario-owned records by fixed IDs; never delete or modify unrelated clinic/patient transactions.
- Prepare synthetic patients and a small same-day queue that demonstrates confirmed, checked-in, in-treatment, and completed states without slot overlap.
- Keep a quick cleaning service and a standard braces-adjustment service ready for the low-click transaction flow.
- Ensure the demo dentist login remains linked to the global PRC profile and the main clinic branch.
- Add a read-only readiness command that reports actionable pass/fail checks without printing passwords, connection strings, tokens, or clinical payloads.
- Document exact presentation accounts, route order, reset behavior, and recovery steps.

---

## Done looks like

1. `npm run demo:prepare` safely refreshes the deterministic synthetic scenario for the current Manila date.
2. Rerunning preparation produces the same scenario records without duplicates and leaves unrelated rows untouched.
3. `npm run demo:check` fails non-zero when a required account, clinic, entitlement, PRC link, service, or appointment state is missing.
4. The clinic Today workspace has useful records in each key queue and supports a clean appointment-to-treatment handoff.
5. The Super Admin can demonstrate the existing PRC/verification/email-preview flow without a real email provider.
6. Repository tests, typechecks, builds, database readiness, and live app/API smoke checks pass.

---

## Safety rules

- All patient and appointment content is fictional and clearly marked as presentation data.
- Preparation is tenant-scoped to the fixed Smile Bright Dental demo clinic ID.
- No broad `DELETE`, truncate, schema mutation, raw SQL, or reset of non-scenario records.
- Credentials remain environment-owned and are never written into documentation or terminal output.
- Existing completed clinical, billing, and audit history is not rewritten.

---

## Presentation route

1. Super Admin: dentist PRC profile, clinic affiliation, verification action, Email Logs preview.
2. Clinic Today: find the presentation patient and view the prepared daily queues.
3. Start or continue the checked-in visit, then demonstrate quick-service completion.
4. Continue to billing/payment or create a follow-up appointment using the preserved patient context.
5. Dentist login: confirm the same PRC profile, branch schedule, and patient access.

---

## Delivered

- `npm run demo:prepare` refreshes the baseline synthetic seed, upserts only fixed scenario records, and automatically runs the readiness gate.
- `DEMO_DATE` targets a Manila presentation date; `DEMO_SCENARIO=1..9` allows a fresh bounded run without deleting an earlier demonstration's clinical history.
- Preparation refreshes clinic/subscription readiness, PRC-linked dentist access, cleaning/braces services, branch/dentist hours, four fictional patients, and four non-overlapping queue states.
- A consumed scenario guard stops preparation when any scenario appointment already has an encounter and instructs the operator to choose the next scenario.
- `npm run demo:check` performs 13 read-only checks covering accounts, clinic state, subscription, features, PRC link, service modes, queue/date, schedules, closures, and the verification candidate.
- [Presentation runbook](../../docs/PRESENTATION_DEMO.md) documents environment-owned credentials, route order, safe recovery, readiness-only checks, and local-network access.
- Scenario 1 was prepared twice for August 19, 2026 with no duplicates; authenticated Super Admin, clinic Today/options, and dentist-profile API smoke checks returned HTTP 200.
- Verified 526 API tests, 18 web tests, strict demo-script/API/web typechecks, production API/web builds, and database schema readiness.
