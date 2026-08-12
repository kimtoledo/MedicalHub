import { index, numeric, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { branches } from './branches';
import { clinics } from './clinics';
import { services } from './appointments';
import { id, timestamps } from './helpers';

/** Effective-dated clinic and branch service prices. */
export const servicePriceHistory = pgTable(
  'service_price_history',
  {
    id: id(),
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'restrict' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    pricePhp: numeric('price_php', { precision: 10, scale: 2 }),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
    effectiveTo: timestamp('effective_to', { withTimezone: true }),
    createdBy: uuid('created_by'),
    ...timestamps,
  },
  (t) => ({
    serviceIdx: index('service_price_history_service_idx').on(t.clinicId, t.serviceId, t.effectiveFrom),
    branchIdx: index('service_price_history_branch_idx').on(t.clinicId, t.branchId, t.serviceId, t.effectiveFrom),
    activeIdx: index('service_price_history_active_idx').on(t.clinicId, t.serviceId, t.branchId, t.effectiveTo),
  }),
);

export type ServicePriceHistory = typeof servicePriceHistory.$inferSelect;
export type NewServicePriceHistory = typeof servicePriceHistory.$inferInsert;
