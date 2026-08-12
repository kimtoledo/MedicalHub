import { and, asc, desc, eq, gt, isNull, lte, or } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { writeAudit } from '@dentra/db/audit';
import {
  branches,
  servicePriceHistory,
  services,
} from '@dentra/db/schema';
import { AuditAction } from '@dentra/shared';

export type ServiceCatalogInput = {
  name: string;
  category: string;
  description?: string | null;
  pricePhp?: string | null;
  durationMinutes: number;
  isBookable: boolean;
  isActive: boolean;
};

export type ServicePriceInput = {
  branchId?: string | null;
  pricePhp: string | null;
  effectiveFrom?: string;
};

export type ServiceCatalogItem = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  durationMinutes: string;
  basePricePhp: string | null;
  pricePhp: string | null;
  priceSource: 'base' | 'branch';
  branchId: string | null;
  isBookable: boolean;
  isActive: boolean;
};

export type ServicePriceHistoryItem = {
  id: string;
  branchId: string | null;
  branchName: string | null;
  pricePhp: string | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
};

export type ServiceCatalogActor = {
  id: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
};

export class ServiceCatalogError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
  }
}

export type ClinicServiceCatalogService = {
  listServices: (clinicId: string, branchId?: string | null) => Promise<ServiceCatalogItem[]>;
  listBranches: (clinicId: string) => Promise<Array<{ id: string; name: string }>>;
  createService: (clinicId: string, input: ServiceCatalogInput, actor: ServiceCatalogActor) => Promise<{ id: string }>;
  updateService: (clinicId: string, serviceId: string, input: Partial<ServiceCatalogInput>, actor: ServiceCatalogActor) => Promise<{ id: string }>;
  setPrice: (clinicId: string, serviceId: string, input: ServicePriceInput, actor: ServiceCatalogActor) => Promise<{ id: string; pricePhp: string | null; branchId: string | null }>;
  listPriceHistory: (clinicId: string, serviceId: string) => Promise<ServicePriceHistoryItem[] | null>;
};

function bool(value: string | boolean): boolean {
  return value === true || value === 'true';
}

function validPrice(value: string | null): boolean {
  return value === null || /^\d+(?:\.\d{1,2})?$/.test(value);
}

async function resolvePrice(
  database: DB,
  clinicId: string,
  serviceId: string,
  branchId: string | null | undefined,
  at = new Date(),
  fallbackPrice: string | null = null,
): Promise<{ pricePhp: string | null; source: 'base' | 'branch' }> {
  const latest = async (query: unknown) => {
    const builder = query as {
      orderBy?: (order: unknown) => { limit: (count: number) => Promise<Array<{ pricePhp: string | null }>> };
      limit: (count: number) => Promise<Array<{ pricePhp: string | null }>>;
    };
    return builder.orderBy
      ? builder.orderBy(desc(servicePriceHistory.effectiveFrom)).limit(1)
      : builder.limit(1);
  };
  if (branchId) {
    const branchPriceRows = await latest(database
      .select({ pricePhp: servicePriceHistory.pricePhp })
      .from(servicePriceHistory)
      .where(and(
        eq(servicePriceHistory.clinicId, clinicId),
        eq(servicePriceHistory.serviceId, serviceId),
        eq(servicePriceHistory.branchId, branchId),
        lte(servicePriceHistory.effectiveFrom, at),
        or(isNull(servicePriceHistory.effectiveTo), gt(servicePriceHistory.effectiveTo, at)),
      )));
    const [branchPrice] = branchPriceRows;
    if (branchPrice) return { pricePhp: branchPrice.pricePhp, source: 'branch' };
  }

  const basePriceRows = await latest(database
    .select({ pricePhp: servicePriceHistory.pricePhp })
    .from(servicePriceHistory)
    .where(and(
      eq(servicePriceHistory.clinicId, clinicId),
      eq(servicePriceHistory.serviceId, serviceId),
      isNull(servicePriceHistory.branchId),
      lte(servicePriceHistory.effectiveFrom, at),
      or(isNull(servicePriceHistory.effectiveTo), gt(servicePriceHistory.effectiveTo, at)),
    )));
  const [basePrice] = basePriceRows;
  return { pricePhp: basePrice ? basePrice.pricePhp : fallbackPrice, source: 'base' };
}

export async function getEffectiveServicePrice(
  database: DB,
  clinicId: string,
  serviceId: string,
  branchId: string | null | undefined,
  at = new Date(),
  fallbackPrice: string | null = null,
) {
  return resolvePrice(database, clinicId, serviceId, branchId, at, fallbackPrice);
}

export function createClinicServiceCatalogService(database: DB): ClinicServiceCatalogService {
  return {
    listServices: async (clinicId, branchId) => {
      const rows = await database
        .select({
          id: services.id,
          name: services.name,
          category: services.category,
          description: services.description,
          durationMinutes: services.durationMinutes,
          basePricePhp: services.pricePhp,
          isBookable: services.isBookable,
          isActive: services.isActive,
        })
        .from(services)
        .where(eq(services.clinicId, clinicId))
        .orderBy(asc(services.category), asc(services.name));
      return Promise.all(rows.map(async (row) => {
        const resolved = await resolvePrice(database, clinicId, row.id, branchId);
        return {
          ...row,
          pricePhp: resolved.pricePhp,
          priceSource: resolved.source,
          branchId: branchId ?? null,
          isBookable: bool(row.isBookable),
          isActive: bool(row.isActive),
        };
      }));
    },

    listBranches: (clinicId) => database
      .select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(and(eq(branches.clinicId, clinicId), eq(branches.isActive, true), isNull(branches.deletedAt)))
      .orderBy(asc(branches.name)),

    createService: async (clinicId, input, actor) => {
      if (!validPrice(input.pricePhp ?? null)) throw new ServiceCatalogError('INVALID_PRICE', 'Price must be a non-negative PHP amount');
      return database.transaction(async (transaction) => {
        const [created] = await transaction.insert(services).values({
          clinicId,
          name: input.name,
          category: input.category,
          description: input.description || null,
          pricePhp: input.pricePhp ?? null,
          durationMinutes: String(input.durationMinutes),
          isBookable: input.isBookable,
          isActive: input.isActive ? 'true' : 'false',
        }).returning({ id: services.id });
        if (input.pricePhp !== null && input.pricePhp !== undefined) {
          await transaction.insert(servicePriceHistory).values({
            clinicId,
            serviceId: created.id,
            pricePhp: input.pricePhp,
            effectiveFrom: new Date(),
            createdBy: actor.id,
          });
        }
        await writeAudit(transaction, {
          actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'service', entityId: created.id,
          action: AuditAction.SERVICE_CREATED,
          metadata: JSON.stringify({ fields: ['name', 'category', 'description', 'durationMinutes', 'isBookable', 'isActive', 'pricePhp'] }),
          ipAddress: actor.ipAddress, userAgent: actor.userAgent,
        });
        return created;
      });
    },

    updateService: async (clinicId, serviceId, input, actor) => {
      if (input.pricePhp !== undefined && !validPrice(input.pricePhp)) throw new ServiceCatalogError('INVALID_PRICE', 'Price must be a non-negative PHP amount');
      return database.transaction(async (transaction) => {
        const [existing] = await transaction.select({ id: services.id }).from(services).where(and(eq(services.id, serviceId), eq(services.clinicId, clinicId))).limit(1).for('update');
        if (!existing) throw new ServiceCatalogError('NOT_FOUND', 'Service not found', 404);
        const { pricePhp, ...fields } = input;
        const values = {
          ...(fields.name !== undefined ? { name: fields.name } : {}),
          ...(fields.category !== undefined ? { category: fields.category } : {}),
          ...(fields.description !== undefined ? { description: fields.description || null } : {}),
          ...(fields.durationMinutes !== undefined ? { durationMinutes: String(fields.durationMinutes) } : {}),
          ...(fields.isBookable !== undefined ? { isBookable: fields.isBookable } : {}),
          ...(fields.isActive !== undefined ? { isActive: fields.isActive ? 'true' : 'false' } : {}),
          ...(pricePhp !== undefined ? { pricePhp } : {}),
        };
        if (Object.keys(values).length > 0) await transaction.update(services).set(values).where(and(eq(services.id, serviceId), eq(services.clinicId, clinicId)));
        if (pricePhp !== undefined) {
          const effectiveFrom = new Date();
          const [current] = await transaction.select({ id: servicePriceHistory.id }).from(servicePriceHistory).where(and(eq(servicePriceHistory.clinicId, clinicId), eq(servicePriceHistory.serviceId, serviceId), isNull(servicePriceHistory.branchId), isNull(servicePriceHistory.effectiveTo))).orderBy(desc(servicePriceHistory.effectiveFrom)).limit(1).for('update');
          if (current) await transaction.update(servicePriceHistory).set({ effectiveTo: effectiveFrom }).where(eq(servicePriceHistory.id, current.id));
          await transaction.insert(servicePriceHistory).values({ clinicId, serviceId, pricePhp, effectiveFrom, createdBy: actor.id });
        }
        await writeAudit(transaction, {
          actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'service', entityId: serviceId,
          action: pricePhp !== undefined ? AuditAction.SERVICE_PRICE_CHANGED : AuditAction.SERVICE_UPDATED,
          metadata: JSON.stringify({ fields: Object.keys(input) }), ipAddress: actor.ipAddress, userAgent: actor.userAgent,
        });
        return { id: serviceId };
      });
    },

    setPrice: async (clinicId, serviceId, input, actor) => {
      if (!validPrice(input.pricePhp)) throw new ServiceCatalogError('INVALID_PRICE', 'Price must be a non-negative PHP amount');
      const effectiveFrom = input.effectiveFrom ? new Date(input.effectiveFrom) : new Date();
      if (Number.isNaN(effectiveFrom.getTime())) throw new ServiceCatalogError('INVALID_DATE', 'Effective date is invalid');
      return database.transaction(async (transaction) => {
        const [service] = await transaction.select({ id: services.id }).from(services).where(and(eq(services.id, serviceId), eq(services.clinicId, clinicId))).limit(1).for('update');
        if (!service) throw new ServiceCatalogError('NOT_FOUND', 'Service not found', 404);
        if (input.branchId) {
          const [branch] = await transaction.select({ id: branches.id }).from(branches).where(and(eq(branches.id, input.branchId), eq(branches.clinicId, clinicId), eq(branches.isActive, true), isNull(branches.deletedAt))).limit(1);
          if (!branch) throw new ServiceCatalogError('BRANCH_NOT_FOUND', 'Branch not found', 404);
        }
        const branchClause = input.branchId ? eq(servicePriceHistory.branchId, input.branchId) : isNull(servicePriceHistory.branchId);
        const [current] = await transaction.select({ id: servicePriceHistory.id, effectiveFrom: servicePriceHistory.effectiveFrom }).from(servicePriceHistory).where(and(eq(servicePriceHistory.clinicId, clinicId), eq(servicePriceHistory.serviceId, serviceId), branchClause, isNull(servicePriceHistory.effectiveTo))).orderBy(desc(servicePriceHistory.effectiveFrom)).limit(1).for('update');
        if (current && effectiveFrom <= current.effectiveFrom) throw new ServiceCatalogError('EFFECTIVE_DATE_CONFLICT', 'Effective date must be later than the current price record', 409);
        if (current) await transaction.update(servicePriceHistory).set({ effectiveTo: effectiveFrom }).where(eq(servicePriceHistory.id, current.id));
        if (input.pricePhp !== null || !input.branchId) await transaction.insert(servicePriceHistory).values({ clinicId, serviceId, branchId: input.branchId ?? null, pricePhp: input.pricePhp, effectiveFrom, createdBy: actor.id });
        if (!input.branchId) await transaction.update(services).set({ pricePhp: input.pricePhp }).where(and(eq(services.id, serviceId), eq(services.clinicId, clinicId)));
        await writeAudit(transaction, {
          actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'service', entityId: serviceId,
          action: AuditAction.SERVICE_PRICE_CHANGED,
          metadata: JSON.stringify({ branchId: input.branchId ?? null, effectiveFrom: effectiveFrom.toISOString() }), ipAddress: actor.ipAddress, userAgent: actor.userAgent,
        });
        return { id: serviceId, pricePhp: input.pricePhp, branchId: input.branchId ?? null };
      });
    },

    listPriceHistory: async (clinicId, serviceId) => {
      const [service] = await database.select({ id: services.id }).from(services).where(and(eq(services.id, serviceId), eq(services.clinicId, clinicId))).limit(1);
      if (!service) return null;
      return database.select({
        id: servicePriceHistory.id,
        branchId: servicePriceHistory.branchId,
        branchName: branches.name,
        pricePhp: servicePriceHistory.pricePhp,
        effectiveFrom: servicePriceHistory.effectiveFrom,
        effectiveTo: servicePriceHistory.effectiveTo,
        createdAt: servicePriceHistory.createdAt,
      }).from(servicePriceHistory).leftJoin(branches, eq(servicePriceHistory.branchId, branches.id)).where(and(eq(servicePriceHistory.clinicId, clinicId), eq(servicePriceHistory.serviceId, serviceId))).orderBy(desc(servicePriceHistory.effectiveFrom));
    },
  };
}
