# Self-Service Clinic Account Profile

> **Status:** ✅ Done — implemented and verified in the current Codex session

## What & Why

Replace the `/app/profile` placeholder with secure self-service account management
for authenticated clinic staff. Users need one place to review their Dentra account
and clinic access while updating only their own basic contact information.

## Done looks like

- `/app/profile` displays the signed-in user's account and active clinic memberships.
- First name, last name, phone, and hosted avatar URL are editable.
- Email, role, clinic, and branch access are read-only.
- API identity comes only from the authenticated server session.
- Updates are validated and audited using changed field names, never field values.
- The page includes responsive loading, error, success, disabled, and unsaved states.
- API tests cover authentication, authorization, validation, and self-only updates.

## Out of scope

- Dentist professional/public profile editing at `/app/dentist/profile`.
- Email, password, role, membership, or branch-assignment changes.
- File-based avatar uploads and notification preferences.

## Steps

1. **Task record** — ✅ Scope and security boundaries documented.
2. **Self-profile API** — ✅ Authenticated read/update service and routes derive identity from the session and audit changed field names only.
3. **Profile UI** — ✅ Responsive form, avatar preview, unsaved/success/error states, and read-only access summary.
4. **Verification** — ✅ 246 API tests, repository typecheck, and production builds pass.

## Project task ref

- Approved by the project owner in the current Codex session; external tracker reference pending.
