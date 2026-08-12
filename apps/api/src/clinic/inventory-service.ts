import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { writeAudit } from '@dentra/db/audit';
import { inventoryItems, inventoryTransactions } from '@dentra/db/schema';
import { AuditAction } from '@dentra/shared';

export type InventoryItemInput = { name: string; sku?: string | null; category: string; unit: string; supplier?: string | null; reorderLevel: string; isActive: boolean };
export type InventoryTransactionInput = { direction: 'in' | 'out' | 'adjustment'; quantity: string; reason: string; batchNumber?: string | null; expiresAt?: string | null; transactionDate: string };
export type InventoryItemView = InventoryItemInput & { id: string; currentStock: string; isLowStock: boolean; nextExpiry: string | null };
export type InventoryTransactionView = Omit<InventoryTransactionInput, 'expiresAt'> & { expiresAt: string | null; id: string; itemId: string; recordedBy: string | null; createdAt: Date };
export type InventoryActor = { id: string; email: string; ipAddress?: string; userAgent?: string };

export class InventoryError extends Error { constructor(public readonly code: string, message: string, public readonly statusCode = 400) { super(message); } }

export type ClinicInventoryService = {
  listItems: (clinicId: string) => Promise<InventoryItemView[]>;
  createItem: (clinicId: string, input: InventoryItemInput, actor: InventoryActor) => Promise<{ id: string }>;
  updateItem: (clinicId: string, itemId: string, input: Partial<InventoryItemInput>, actor: InventoryActor) => Promise<{ id: string }>;
  recordTransaction: (clinicId: string, itemId: string, input: InventoryTransactionInput, actor: InventoryActor) => Promise<{ id: string; currentStock: string }>;
  listTransactions: (clinicId: string, itemId: string) => Promise<InventoryTransactionView[] | null>;
};

function numeric(value: string) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : NaN; }
function ensureQuantity(value: string, allowNegative = false) { const parsed = numeric(value); if (!Number.isFinite(parsed) || (!allowNegative && parsed <= 0)) throw new InventoryError('INVALID_QUANTITY', 'Quantity must be greater than zero'); return parsed; }
function ensureDate(value: string) { const date = new Date(`${value}T00:00:00Z`); if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime())) throw new InventoryError('INVALID_DATE', 'Date must use YYYY-MM-DD'); return date; }

export function createClinicInventoryService(database: DB): ClinicInventoryService {
  const stockFor = async (clinicId: string, itemId: string, transaction: DB = database) => {
    const [row] = await transaction.select({ stock: sql<string>`COALESCE(SUM(CASE WHEN ${inventoryTransactions.direction} = 'in' THEN ${inventoryTransactions.quantity} WHEN ${inventoryTransactions.direction} = 'out' THEN -${inventoryTransactions.quantity} ELSE ${inventoryTransactions.quantity} END), 0)` }).from(inventoryTransactions).where(and(eq(inventoryTransactions.clinicId, clinicId), eq(inventoryTransactions.itemId, itemId)));
    return Number(row?.stock ?? '0');
  };

  return {
    listItems: async (clinicId) => {
      const items = await database.select({ id: inventoryItems.id, name: inventoryItems.name, sku: inventoryItems.sku, category: inventoryItems.category, unit: inventoryItems.unit, supplier: inventoryItems.supplier, reorderLevel: inventoryItems.reorderLevel, isActive: inventoryItems.isActive }).from(inventoryItems).where(eq(inventoryItems.clinicId, clinicId)).orderBy(asc(inventoryItems.category), asc(inventoryItems.name));
      return Promise.all(items.map(async (item) => {
        const currentStock = await stockFor(clinicId, item.id);
        const [expiry] = await database.select({ expiresAt: inventoryTransactions.expiresAt }).from(inventoryTransactions).where(and(eq(inventoryTransactions.clinicId, clinicId), eq(inventoryTransactions.itemId, item.id), gte(inventoryTransactions.expiresAt, new Date()))).orderBy(asc(inventoryTransactions.expiresAt)).limit(1);
        return { ...item, isActive: item.isActive === 'true', currentStock: currentStock.toFixed(3).replace(/\.?(0)+$/, ''), isLowStock: currentStock <= Number(item.reorderLevel), nextExpiry: expiry?.expiresAt?.toISOString() ?? null };
      }));
    },
    createItem: async (clinicId, input, actor) => {
      if (numeric(input.reorderLevel) < 0) throw new InventoryError('INVALID_REORDER_LEVEL', 'Reorder level cannot be negative');
      return database.transaction(async (tx) => {
        const [created] = await tx.insert(inventoryItems).values({ clinicId, name: input.name, sku: input.sku || null, category: input.category, unit: input.unit, supplier: input.supplier || null, reorderLevel: input.reorderLevel, isActive: input.isActive ? 'true' : 'false' }).returning({ id: inventoryItems.id });
        await writeAudit(tx, { clinicId, actorId: actor.id, actorEmail: actor.email, action: AuditAction.INVENTORY_ITEM_CREATED, entityType: 'inventory_item', entityId: created.id, metadata: JSON.stringify({ fields: ['name', 'sku', 'category', 'unit', 'supplier', 'reorderLevel', 'isActive'] }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
        return created;
      });
    },
    updateItem: async (clinicId, itemId, input, actor) => {
      if (input.reorderLevel !== undefined && numeric(input.reorderLevel) < 0) throw new InventoryError('INVALID_REORDER_LEVEL', 'Reorder level cannot be negative');
      const [existing] = await database.select({ id: inventoryItems.id }).from(inventoryItems).where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.clinicId, clinicId))).limit(1);
      if (!existing) throw new InventoryError('NOT_FOUND', 'Inventory item not found', 404);
      await database.update(inventoryItems).set({ ...(input.name !== undefined ? { name: input.name } : {}), ...(input.sku !== undefined ? { sku: input.sku || null } : {}), ...(input.category !== undefined ? { category: input.category } : {}), ...(input.unit !== undefined ? { unit: input.unit } : {}), ...(input.supplier !== undefined ? { supplier: input.supplier || null } : {}), ...(input.reorderLevel !== undefined ? { reorderLevel: input.reorderLevel } : {}), ...(input.isActive !== undefined ? { isActive: input.isActive ? 'true' : 'false' } : {}) }).where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.clinicId, clinicId)));
      await writeAudit(database, { clinicId, actorId: actor.id, actorEmail: actor.email, action: AuditAction.INVENTORY_ITEM_UPDATED, entityType: 'inventory_item', entityId: itemId, metadata: JSON.stringify({ fields: Object.keys(input) }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return { id: itemId };
    },
    recordTransaction: async (clinicId, itemId, input, actor) => database.transaction(async (tx) => {
      const [item] = await tx.select({ id: inventoryItems.id }).from(inventoryItems).where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.clinicId, clinicId), eq(inventoryItems.isActive, 'true'))).limit(1).for('update');
      if (!item) throw new InventoryError('NOT_FOUND', 'Active inventory item not found', 404);
      const quantity = ensureQuantity(input.quantity, input.direction === 'adjustment');
      ensureDate(input.transactionDate);
      if (input.direction === 'adjustment' && quantity === 0) throw new InventoryError('INVALID_QUANTITY', 'Adjustment cannot be zero');
      const current = await stockFor(clinicId, itemId, tx as unknown as DB);
      const next = current + (input.direction === 'in' ? quantity : input.direction === 'out' ? -quantity : quantity);
      if (next < -0.0001) throw new InventoryError('INSUFFICIENT_STOCK', `Only ${current.toFixed(3)} units are available`, 409);
      const [created] = await tx.insert(inventoryTransactions).values({ clinicId, itemId, direction: input.direction, quantity: String(Math.abs(quantity)), reason: input.reason, batchNumber: input.batchNumber || null, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null, recordedBy: actor.id, transactionDate: input.transactionDate }).returning({ id: inventoryTransactions.id });
      await writeAudit(tx, { clinicId, actorId: actor.id, actorEmail: actor.email, action: AuditAction.INVENTORY_TRANSACTION_RECORDED, entityType: 'inventory_transaction', entityId: created.id, metadata: JSON.stringify({ itemId, direction: input.direction, quantity: String(Math.abs(quantity)) }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return { id: created.id, currentStock: next.toFixed(3).replace(/\.?(0)+$/, '') };
    }),
    listTransactions: async (clinicId, itemId) => {
      const [item] = await database.select({ id: inventoryItems.id }).from(inventoryItems).where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.clinicId, clinicId))).limit(1);
      if (!item) return null;
      const rows = await database.select({ id: inventoryTransactions.id, itemId: inventoryTransactions.itemId, direction: inventoryTransactions.direction, quantity: inventoryTransactions.quantity, reason: inventoryTransactions.reason, batchNumber: inventoryTransactions.batchNumber, expiresAt: inventoryTransactions.expiresAt, transactionDate: inventoryTransactions.transactionDate, recordedBy: inventoryTransactions.recordedBy, createdAt: inventoryTransactions.createdAt }).from(inventoryTransactions).where(and(eq(inventoryTransactions.clinicId, clinicId), eq(inventoryTransactions.itemId, itemId))).orderBy(desc(inventoryTransactions.createdAt));
      return rows.map((row) => ({ ...row, expiresAt: row.expiresAt?.toISOString() ?? null }));
    },
  };
}
