# Dentist Patient Registration Modal

> **Status:** ✅ Done — implemented and verified locally; Replit task reference unavailable in the current Codex session

---

## What & Why

The dentist patient directory at `/app/dentist/patients` currently opens the shared patient-registration form as a right-side drawer. Dentist registration should use a centered modal so the workflow feels focused and does not resemble navigation or a sliding inspector.

---

## Scope

- Render patient registration as a centered, responsive modal on `/app/dentist/patients`.
- Keep the existing drawer behavior on `/app/patients` for clinic staff.
- Reuse the same form, validation, tenant-scoped API, loading, and error behavior.
- Close on backdrop click, Escape, or the close button when a save is not in progress.
- Lock background scrolling while open and restore focus when closed.
- Redirect a successfully registered dentist patient to `/app/dentist/patients/{patientId}`.

---

## Done looks like

1. Dentist registration opens in a centered modal on desktop and mobile.
2. Clinic-staff registration remains a right-side drawer.
3. The modal is keyboard accessible and prevents background scrolling.
4. Successful registration stays in the dentist route family.
5. Web typecheck, tests, build, and diff validation pass.

---

## Delivered

- Added a reusable `modal` presentation variant to the shared patient-registration form.
- Enabled the centered modal only for `/app/dentist/patients`; `/app/patients` retains its existing drawer.
- Added backdrop/Escape dismissal guards, background scroll locking, initial focus, and trigger-focus restoration.
- Kept successful registration within the dentist route family.
- Verified the production web build, web typecheck, and all 9 web tests.
