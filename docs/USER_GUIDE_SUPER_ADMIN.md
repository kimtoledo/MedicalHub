# Dentra.ph Super Admin Manual

This manual is for platform operators using `/dentra-admin`. Super Admin is a platform role, not a shortcut into every clinic’s clinical data. Use the least privilege necessary and rely on audit records for every privileged action.

## 1. Access and navigation

1. Start the frontend and API, or open the deployed Dentra.ph frontend.
2. Go to `/dentra-admin/login`.
3. Sign in with the Super Admin email (seed default: `admin@dentra.ph`) and the password configured in `SUPER_ADMIN_PASSWORD`.
4. After sign-in, use the admin shell navigation:

- Overview — platform summary and recent activity.
- Clinics — search, inspect, create, activate/suspend/archive, publish, add branches, and manage clinic package/feature state.
- Dentists — create, inspect, affiliate, verify, publish, or unpublish dentist profiles.
- Packages — manage subscription packages and feature entitlements.
- Subscriptions — review clinic subscription/change requests.
- Audit — inspect immutable platform and tenant-scoped audit events.
- Settings — platform settings available to the current build.

Platform operations, verification, moderation, organization, custom-domain, integration, and export workflows may also be available through their protected API endpoints even when a dedicated admin screen is still being expanded. Use the documented route/API response and do not assume an unrendered UI means the action is safe to perform manually.

## 2. Clinic lifecycle management

### Create a clinic

1. Open **Clinics → New clinic**.
2. Enter the legal/display name, unique slug, unique prefix, contact information, address, and initial branch details.
3. Assign the intended package only after confirming the commercial decision.
4. Review the generated owner/membership state. Owner invitation delivery and password setup are not fully automated; coordinate onboarding through the approved process.
5. Save and record the clinic identifier in the task/support record, not in public chat.

The prefix is used in human-readable identifiers such as patient and appointment references. It must be unique and should not expose sensitive information.

### Review and change status

Clinic status controls whether the tenant can operate:

- `trial` — available during onboarding/trial.
- `active` — operating normally.
- `suspended` — temporarily blocked while retaining records.
- `archived` — retired tenant state; do not reactivate without an approved decision.

Before suspending or archiving, check active appointments, outstanding balances, subscription requests, export/offboarding requests, and the reason. Status changes are audited.

### Publication and verification

Publication controls public visibility; it is not the same as internal activation. A clinic can be active but unpublished. Verification submissions contain review metadata and document references; never expose private document references on a public page. Approve only after the required evidence is reviewed, and revoke/expire when appropriate.

### Branches

Open the clinic detail view to review branches. Check branch name, contact, address, operating hours, active state, and staff/dentist assignments. Branch scope affects schedule visibility, appointment operations, kiosk URLs, and staff access. Do not attach a branch to a different clinic.

## 3. Dentist and affiliation management

1. Open **Dentists** and search by name, slug, or verification state.
2. Review the dentist profile and license/verification information.
3. Create or update clinic/branch affiliations only after confirming the dentist’s authorization.
4. Set publication state separately from verification state.
5. When removing an affiliation, check upcoming appointments and branch schedule ownership first.

Public dentist profiles require the appropriate publication and verification boundaries. A dentist may be affiliated with multiple clinics; affiliation does not merge patient records between tenants.

## 4. Packages, entitlements, and subscriptions

Feature access uses canonical entitlement keys, not package names. When changing a package:

1. Review the package’s active state and feature list.
2. Confirm the requested feature is the correct canonical key (for example `inventory.manage`, `reports.advanced`, or `microsite.customize`).
3. Review affected clinics before changing a package used by active tenants.
4. Use a clinic feature override only for a documented exception, pilot, or remediation.
5. Set an expiration where temporary access is intended.
6. Record the business reason; the change is audited.

For a subscription/change request, review the requesting clinic, requested package, request type, reason, effective date, and current usage. Approving a request should be followed by confirming the effective entitlement and clinic-facing status.

## 5. Audit review

The audit ledger is append-only. Use filters for actor, action, clinic scope, and Manila date range. Typical actions include clinic lifecycle, publication, verification, permissions, billing adjustments, payment events, support access, domain activation, and integration key operations.

When investigating an issue:

1. Identify the tenant and affected entity ID.
2. Filter by action and date range.
3. Compare the state transition metadata with the source screen/request.
4. Do not edit or delete the audit event to “clean up” a mistake.
5. If a support session is needed, create a written support-access request and wait for explicit approval.

## 6. Moderation and trust workflows

### Verification

Review dentist/clinic submissions, document type, submitted time, reviewer, expiry, and decision reason. Approve only verifiable submissions. Rejection should be specific enough for remediation without exposing private evidence.

### Reviews

Moderate patient reviews for eligibility, abuse, privacy violations, and policy violations. Approved reviews contribute to public aggregates; rejected or pending reviews do not. A clinic response is a response, not a moderation override.

### Public discovery

Public search should show only active, published, and appropriately verified records. If a clinic or dentist is missing, check status, publication state, deletion state, branch activity, and required verification rather than changing the public result directly.

## 7. Organizations and multi-branch operations

Organizations group clinics for consolidated reporting. Verify that:

- the clinic is explicitly attached to the organization;
- the member’s organization role is appropriate (`owner`, `admin`, `regional_manager`, or `viewer`);
- reports are limited to attached clinics;
- a user does not gain access to an unrelated clinic through an organization lookup.

Organization reporting is a summary baseline. Central catalog propagation, branch-specific staff assignment UI, organization entitlements, and consented patient transfer workflows remain separate implementation areas.

## 8. Platform operations and support access

Super Admin support actions must be deliberate and auditable:

1. Require a written reason from the requester.
2. Approve only the smallest time window and scope needed.
3. Never use a support request as a reason to browse unrelated clinical records.
4. Keep the request ID and outcome in the support ticket.
5. For export/offboarding, track request status and retention policy; do not promise a downloadable artifact until the export worker has completed.

The current platform-operations baseline supports request metadata, review states, time-boxed approval, and audit events. Actual export workers, retention automation, restore drills, alerting, and maintenance mode require their own operational rollout.

## 9. Custom domains and integrations

### Custom domains

1. Clinic admin submits a normalized hostname.
2. The system returns a DNS TXT verification token/instruction.
3. Wait for the clinic’s DNS change, then run verification.
4. Activate only after verified state is recorded.
5. Treat SSL provisioning, DNS polling, and canonical redirects as deployment/provider responsibilities until their adapters are configured.

### Integration API keys

API keys are shown only once at creation. Store them in the clinic’s approved secret manager; never place them in email, screenshots, source control, or `.env` committed to git. Use the smallest scope, rotate/revoke immediately if exposed, and review last-use activity.

The current partner API baseline supports read-only appointment export with `appointments.read`, webhook declarations, rate limiting, and tenant scope. Calendar/accounting connectors, outbound delivery workers, and read-write resources are not yet complete.

## 10. Security and incident response

- Rotate a secret when exposure is suspected; do not merely delete a screenshot.
- Revoke compromised integration keys and review their audit events.
- Suspend a compromised user or clinic only after confirming tenant impact and preserving evidence.
- Do not reset a password to a value shared in a ticket.
- Escalate suspected cross-tenant access immediately; include route, time, clinic IDs, and redacted error evidence.
- Offline clinical storage is explicitly blocked pending threat-model review. Do not approve browser cache or device enrollment workarounds.
