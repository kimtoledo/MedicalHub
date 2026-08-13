import { createHash, randomBytes } from 'node:crypto';
import { and, asc, eq, gte, lt } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { integrationApiKeys, integrationWebhooks, appointments, branches, patients, services } from '@dentra/db/schema';
import { writeAudit } from '@dentra/db/audit';
import { AuditAction } from '@dentra/shared';

export type IntegrationActor = { id: string; email: string; ipAddress?: string; userAgent?: string };
export type IntegrationScope = 'appointments.read' | 'invoices.read' | 'webhooks.manage';
export class IntegrationError extends Error {
  constructor(public code: string, message: string, public statusCode = 400) { super(message); }
}

function digest(value: string) { return createHash('sha256').update(value).digest('hex'); }
function issue(prefix: string) { return `${prefix}_${randomBytes(30).toString('base64url')}`; }

export type IntegrationService = ReturnType<typeof createIntegrationService>;
export function createIntegrationService(database: DB) {
  return {
    listKeys: async (clinicId: string) => database.select({ id: integrationApiKeys.id, name: integrationApiKeys.name, keyPrefix: integrationApiKeys.keyPrefix, scopes: integrationApiKeys.scopes, status: integrationApiKeys.status, lastUsedAt: integrationApiKeys.lastUsedAt, createdAt: integrationApiKeys.createdAt, revokedAt: integrationApiKeys.revokedAt }).from(integrationApiKeys).where(eq(integrationApiKeys.clinicId, clinicId)).orderBy(asc(integrationApiKeys.createdAt)),
    createKey: async (clinicId: string, name: string, scopes: IntegrationScope[], actor: IntegrationActor) => {
      const key = issue('dtk');
      const [row] = await database.insert(integrationApiKeys).values({ clinicId, name, keyPrefix: key.slice(0, 12), keyHash: digest(key), scopes }).returning({ id: integrationApiKeys.id, name: integrationApiKeys.name, keyPrefix: integrationApiKeys.keyPrefix, scopes: integrationApiKeys.scopes, createdAt: integrationApiKeys.createdAt });
      if (!row) throw new IntegrationError('KEY_CREATE_FAILED', 'Unable to create API key', 500);
      await writeAudit(database, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'integration_api_key', entityId: row.id, action: AuditAction.INTEGRATION_API_KEY_CREATED, metadata: JSON.stringify({ scopes }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return { ...row, secret: key };
    },
    revokeKey: async (clinicId: string, keyId: string, actor: IntegrationActor) => {
      const [row] = await database.update(integrationApiKeys).set({ status: 'revoked', revokedAt: new Date() }).where(and(eq(integrationApiKeys.id, keyId), eq(integrationApiKeys.clinicId, clinicId), eq(integrationApiKeys.status, 'active'))).returning({ id: integrationApiKeys.id });
      if (!row) throw new IntegrationError('KEY_NOT_FOUND', 'Active API key not found', 404);
      await writeAudit(database, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'integration_api_key', entityId: row.id, action: AuditAction.INTEGRATION_API_KEY_REVOKED, metadata: JSON.stringify({}), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return row;
    },
    authenticate: async (secret: string): Promise<{ clinicId: string; scopes: string[]; keyId: string } | null> => {
      const [row] = await database.select({ id: integrationApiKeys.id, clinicId: integrationApiKeys.clinicId, scopes: integrationApiKeys.scopes }).from(integrationApiKeys).where(and(eq(integrationApiKeys.keyHash, digest(secret)), eq(integrationApiKeys.status, 'active'))).limit(1);
      if (!row) return null;
      await database.update(integrationApiKeys).set({ lastUsedAt: new Date() }).where(eq(integrationApiKeys.id, row.id));
      return { clinicId: row.clinicId, scopes: row.scopes ?? [], keyId: row.id };
    },
    listWebhooks: async (clinicId: string) => database.select({ id: integrationWebhooks.id, name: integrationWebhooks.name, endpointUrl: integrationWebhooks.endpointUrl, eventTypes: integrationWebhooks.eventTypes, status: integrationWebhooks.status, lastDeliveryAt: integrationWebhooks.lastDeliveryAt, failureReason: integrationWebhooks.failureReason, createdAt: integrationWebhooks.createdAt }).from(integrationWebhooks).where(eq(integrationWebhooks.clinicId, clinicId)).orderBy(asc(integrationWebhooks.createdAt)),
    createWebhook: async (clinicId: string, input: { name: string; endpointUrl: string; eventTypes: string[] }, actor: IntegrationActor) => {
      const secret = issue('whsec');
      const [row] = await database.insert(integrationWebhooks).values({ clinicId, name: input.name, endpointUrl: input.endpointUrl, eventTypes: input.eventTypes, secretHash: digest(secret) }).returning({ id: integrationWebhooks.id, name: integrationWebhooks.name, endpointUrl: integrationWebhooks.endpointUrl, eventTypes: integrationWebhooks.eventTypes, status: integrationWebhooks.status, createdAt: integrationWebhooks.createdAt });
      if (!row) throw new IntegrationError('WEBHOOK_CREATE_FAILED', 'Unable to create webhook', 500);
      await writeAudit(database, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'integration_webhook', entityId: row.id, action: AuditAction.INTEGRATION_WEBHOOK_CREATED, metadata: JSON.stringify({ eventTypes: input.eventTypes }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return { ...row, secret };
    },
    disableWebhook: async (clinicId: string, webhookId: string, actor: IntegrationActor) => {
      const [row] = await database.update(integrationWebhooks).set({ status: 'disabled' }).where(and(eq(integrationWebhooks.id, webhookId), eq(integrationWebhooks.clinicId, clinicId), eq(integrationWebhooks.status, 'active'))).returning({ id: integrationWebhooks.id });
      if (!row) throw new IntegrationError('WEBHOOK_NOT_FOUND', 'Active webhook not found', 404);
      await writeAudit(database, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'integration_webhook', entityId: row.id, action: AuditAction.INTEGRATION_WEBHOOK_DISABLED, metadata: JSON.stringify({}), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return row;
    },
    appointments: async (clinicId: string, from: Date, to: Date) => database.select({ id: appointments.id, branchId: appointments.branchId, branchName: branches.name, status: appointments.status, startsAt: appointments.startsAt, endsAt: appointments.endsAt, patientFirstName: patients.firstName, patientLastName: patients.lastName, patientNumber: patients.patientNumber, serviceName: services.name }).from(appointments).innerJoin(branches, eq(appointments.branchId, branches.id)).leftJoin(patients, and(eq(appointments.patientId, patients.id), eq(patients.clinicId, clinicId))).leftJoin(services, and(eq(appointments.serviceId, services.id), eq(services.clinicId, clinicId))).where(and(eq(appointments.clinicId, clinicId), gte(appointments.startsAt, from), lt(appointments.startsAt, to))).orderBy(asc(appointments.startsAt)),
  };
}
