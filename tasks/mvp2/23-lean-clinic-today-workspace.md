# Lean Clinic Today Workspace

> **Status:** ✅ Done — implemented and verified locally; Replit task reference unavailable in the current Codex session

---

## What & Why

Small clinics may operate with only a dentist and one clinic coordinator. Their daily work should be organized around the next patient action, not around navigating separate system modules. The clinic dashboard will become a unified **Today** workspace that exposes the common actions and queues needed to run the current day.

---

## Scope

- Present `/app` as the clinic's **Today** workspace without removing the detailed module pages.
- Put **Register patient** and **New appointment** actions at the top of the workspace.
- Add tenant-scoped patient search with direct access to the selected patient record.
- Group today's appointments into actionable queues: waiting/check-in, in treatment, upcoming, and completed.
- Show one clear primary next action per appointment while retaining secondary status actions.
- Keep active-branch context and existing tenant, role, entitlement, and scheduling enforcement.
- Make all primary actions usable on a phone without horizontal scrolling.

---

## Security and workflow invariants

- Do not broaden server permissions merely because an action is visible in the workspace.
- Use the authenticated clinic and active branch; never accept tenant authority from display state alone.
- Keep clinical authorship and financial audit data attributed to the authenticated actor.
- Preserve the full appointment, patient, encounter, treatment, and billing pages as drill-down views.
- Do not expose patient contact or clinical data in client logs, analytics payloads, or cached responses.

---

## Done looks like

1. A two-person clinic can begin its common patient and appointment tasks from `/app`.
2. Staff can find an existing patient without first navigating to the patient directory.
3. Today's work is grouped by operational state and communicates what should happen next.
4. Registering a patient and creating an appointment reuse the existing validated workflows.
5. Desktop and mobile layouts remain usable and accessible.
6. Web tests, typecheck, production build, and diff validation pass.

---

## Explicit non-goals

- Changing clinical sign-off rules.
- Creating a generic employee task-management system.
- Removing specialist pages or advanced filters.
- Sharing user accounts between staff members.
- Implementing walk-in-to-payment orchestration; that is tracked in task 24.

---

## Delivered

- Reframed `/app` and clinic navigation as the **Today** daily workspace.
- Added top-level Register Patient, New Appointment, and Billing actions by reusing existing validated workflows.
- Added debounced, tenant-scoped patient search with direct record links.
- Grouped appointments into Waiting, In Treatment, Upcoming, Completed, and Closed queues.
- Added one-click routine progress actions inside Today; destructive actions and detailed work remain guarded.
- Added focused queue tests and authenticated live smoke checks.
