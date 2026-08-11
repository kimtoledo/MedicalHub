# MVP 1 Release Checklist

Verified on **August 12, 2026** against the local Dentra.ph application and configured PostgreSQL database.

| Release gate | Result | Evidence |
|---|---|---|
| Cross-tenant protected records | ✅ Pass | Direct Clinic A request for Clinic B patients returned `403`; patient, encounter, odontogram, dashboard, settings, workspace, and entitlement route tests deny before service queries. |
| Client tenant/identity injection | ✅ Pass | Strict request schemas reject supplied `clinicId`, patient number, dentist identity, and other server-owned fields. |
| API entitlement enforcement | ✅ Pass | Direct patient/clinical requests with disabled entitlements return `403 ENTITLEMENT_REQUIRED`. |
| Multi-clinic dentist separation | ✅ Pass | Automated test requests each authorized membership independently and confirms the exact clinic scope reaches the service. |
| Unpublished public records | ✅ Pass | Live unpublished clinic and dentist URLs returned `404`; route tests cover both contracts. |
| Concurrent booking conflict | ✅ Pass | Two live concurrent requests for one dentist and one slot returned exactly one `201` and one `409`; an automated concurrent HTTP test preserves the gate. |
| Odontogram correction history | ✅ Pass | Corrections append a new event referencing the prior event; no update/delete route exists and tests verify the history/current-state contract. |
| PWA protected-data cache safety | ✅ Pass | Service worker bypasses `/api/*` and `/v1/*`; static release test verifies no API route is included in the shell cache. |
| Sensitive-action auditing | ✅ Pass | Shared transaction-aware audit writer covers MVP 1 mutations; migration `0007_audit_immutability.sql` rejects audit updates/deletes. |
| Synthetic demo data | ✅ Pass | Clean seed target is 1 Super Admin, 2 clinics, 4 dentists, 20 synthetic patients, and 50 synthetic appointments with generated test contact/license data. |
| Responsive layouts | ✅ Pass | Chrome DevTools Protocol checks at 375×812, 768×1024, and 1280×900 found no document overflow; clinic PWA, Super Admin audit, and public clinic views were visually inspected. |

## Verification commands

```bash
npm run db:migrate
npm run db:seed
npm run test
npm run typecheck
npm run build
```

The automated release gates are in `apps/api/test/mvp1-release-gates.test.ts` and the relevant route suites. This checklist is a functional MVP gate, not a substitute for a professional security assessment before processing real patient data.
