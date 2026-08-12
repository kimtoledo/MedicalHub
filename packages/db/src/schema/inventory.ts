import { index, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { id, timestamps } from './helpers';

export const inventoryTransactionDirectionEnum = pgEnum('inventory_transaction_direction', ['in', 'out', 'adjustment']);

export const inventoryItems = pgTable('inventory_items', {
  id: id(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 200 }).notNull(),
  sku: varchar('sku', { length: 100 }),
  category: varchar('category', { length: 100 }).notNull().default('General'),
  unit: varchar('unit', { length: 50 }).notNull().default('piece'),
  supplier: varchar('supplier', { length: 200 }),
  reorderLevel: numeric('reorder_level', { precision: 12, scale: 3 }).notNull().default('0'),
  isActive: varchar('is_active', { length: 10 }).notNull().default('true'),
  ...timestamps,
}, (t) => ({ clinicIdx: index('inventory_items_clinic_idx').on(t.clinicId), skuIdx: index('inventory_items_sku_idx').on(t.clinicId, t.sku) }));

export const inventoryTransactions = pgTable('inventory_transactions', {
  id: id(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'restrict' }),
  itemId: uuid('item_id').notNull().references(() => inventoryItems.id, { onDelete: 'restrict' }),
  direction: inventoryTransactionDirectionEnum('direction').notNull(),
  quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull(),
  reason: text('reason').notNull(),
  batchNumber: varchar('batch_number', { length: 100 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  recordedBy: uuid('recorded_by'),
  transactionDate: varchar('transaction_date', { length: 20 }).notNull(),
  ...timestamps,
}, (t) => ({ clinicIdx: index('inventory_transactions_clinic_idx').on(t.clinicId), itemIdx: index('inventory_transactions_item_idx').on(t.clinicId, t.itemId), expiryIdx: index('inventory_transactions_expiry_idx').on(t.clinicId, t.expiresAt) }));

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
