# Continuous Patient Transaction Flow

> **Status:** ✅ Done — guided routine transaction path implemented and verified; Replit task reference unavailable in the current Codex session

---

## What & Why

Routine clinic work currently crosses appointments, encounters, service records, billing, and recalls. A small team needs one guided transaction path that preserves those records while avoiding repeated searching and duplicate input.

---

## Scope

- Add a guided walk-in flow: find/register patient, choose service and dentist, then create the visit.
- Carry patient, appointment, branch, dentist, service, and encounter context forward automatically.
- Show a single recommended next action: check in, start, document, complete, generate invoice, collect payment, or schedule follow-up.
- Support a streamlined `Complete and bill` path for eligible quick services without combining clinical and financial database transactions incorrectly.
- Return the user to the Today workspace with a clear completed/next-step state.
- Preserve full encounter documentation for standard or clinically complex services.

---

## Done looks like

1. An existing-patient walk-in can be opened in one guided flow.
2. Routine appointments progress without reselecting the same patient/service/branch.
3. Quick-service documentation can continue directly into invoice generation.
4. Every clinical, appointment, invoice, payment, and audit record remains separately valid and attributable.
5. Failed later steps never roll back already-valid finalized clinical records.
6. API/UI tests, typechecks, builds, and tenant/role checks pass.

---

## Explicit non-goals

- Auto-charging a patient.
- Letting non-dentists sign prescriptions or falsely appear as the treating dentist.
- Replacing the detailed encounter or invoice workspaces.

---

## Delivered so far

- Added an **Add walk-in** flow to Today that reuses tenant-scoped patient search, active branch, services, dentists, and server-provided availability.
- New patients can be registered with the minimal required details inside the walk-in flow and are immediately selected for the visit.
- The flow selects the first valid remaining slot, creates a confirmed appointment through the existing scheduling transaction, then checks the patient in through the legal status endpoint.
- If the second step fails, the created appointment remains valid and the UI links directly to it instead of retrying creation.
- Quick-service completion can now continue directly to invoice generation with the newly created encounter preselected.
- Today queues provide the recommended check-in/start/continue/review-and-bill action without duplicating patient context.
- Recording payment now refreshes the invoice state and presents direct **Back to Today** and **Schedule follow-up** handoffs.
- Focused queue tests, full API/web suites, authenticated live reads, typechecks, and production builds pass.
