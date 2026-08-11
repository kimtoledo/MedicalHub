# MVP 2 - Complete Clinic Business Operations

## Release objective
Expand Dentra.ph from core clinical workflow into day-to-day clinic business operations while preserving the same tenant, permission, entitlement, and audit architecture.

## 1. Treatment planning
- proposed treatment plans;
- multiple plan items;
- tooth/area;
- procedure;
- estimated fee;
- priority/sequence;
- status: proposed/accepted/scheduled/in-progress/completed/cancelled;
- link completed plan items to actual treatment records;
- printable/shareable summary if approved.

## 2. Service catalog and pricing
- clinic-level procedure catalog;
- optional branch-specific pricing;
- service duration;
- bookable/non-bookable;
- active/inactive;
- price history strategy so old invoices are not changed when current price changes.

## 3. Billing and payments
- invoice number;
- patient;
- encounter/treatment plan relationship;
- invoice lines;
- discount with permission/reason;
- totals;
- payment status;
- partial payments;
- payment method;
- remaining balance;
- refund/adjustment workflow with audit.

No full general-ledger accounting in this MVP.

## 4. Prescriptions
- prescription record;
- items;
- medicine name;
- dose/frequency/duration;
- instructions;
- dentist attribution;
- printable output;
- immutable issued snapshot strategy.

## 5. Clinical files/media
- radiographs;
- intraoral/extraoral photos;
- consent/referral/lab documents;
- private storage;
- patient/encounter/tooth metadata;
- authorized signed retrieval;
- upload validation.

## 6. Inventory
- item master;
- SKU/category/unit;
- supplier;
- current/reorder level;
- expiration/batch where needed;
- stock in/out/adjustment;
- immutable stock transaction history;
- low-stock alerts/dashboard.

## 7. Notifications
### Email
- booking confirmation;
- appointment reminder;
- cancellation/reschedule;
- recall reminder.

### SMS
Provider adapter, usage metering, opt-out/consent policy to be defined before real launch.

Avoid sensitive clinical details in notification text.

## 8. Recall/follow-up
- recall rule by service/procedure;
- due date;
- patient recall queue;
- reminder status;
- manual override;
- follow-up appointment creation.

## 9. Reports
Operational:
- appointment counts/status/no-show;
- patient counts;
- procedure counts;
- dentist workload.

Financial:
- collections;
- outstanding balances;
- invoice/payment summary;
- revenue by service/dentist/branch if permitted.

Inventory:
- current stock;
- usage;
- low stock;
- expiring items where tracked.

## 10. Microsite customization
- theme presets;
- approved brand color;
- content sections on/off;
- gallery;
- additional service content;
- SEO fields;
- preview before publish.

Do not permit arbitrary unsafe HTML/JavaScript from tenants.

## 11. Subscription operations
- upgrade/downgrade request or admin action;
- add-ons;
- usage counters where required;
- storage/SMS limit enforcement;
- entitlement effective-date handling.

Payment automation for subscription can remain manual until the commercial provider is selected.

## 12. New roles
- Cashier
- Inventory Staff
- more granular clinic permission presets

## 13. MVP 2 release gates
- financial changes are transactional/audited;
- protected files are private;
- inventory balances reconcile to transactions;
- notifications do not leak sensitive clinical content;
- new modules honor role + entitlement + tenant checks;
- price changes do not rewrite historical invoices;
- reports cannot aggregate another tenant's data;
- reminders handle retries without accidental duplicates.
