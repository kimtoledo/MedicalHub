import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';
import { and, asc, desc, eq, gte, lt, lte } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { integrationApiKeys, integrationWebhookDeliveries, integrationWebhooks, appointments, branches, invoicePayments, invoiceTransactions, invoices, patients, services } from '@dentra/db/schema';
import { writeAudit } from '@dentra/db/audit';
import { AuditAction } from '@dentra/shared';

export type IntegrationActor = { id: string; email: string; ipAddress?: string; userAgent?: string };
export type IntegrationScope = 'appointments.read' | 'invoices.read' | 'webhooks.manage' | 'calendar.feed';
export class IntegrationError extends Error {
  constructor(public code: string, message: string, public statusCode = 400) { super(message); }
}

export const MAX_DELIVERY_ATTEMPTS = 5;
const DELIVERY_TIMEOUT_MS = 5_000;
export function backoffMs(attempts: number) { return Math.min(60, 2 ** attempts) * 60_000; }

function digest(value: string) { return createHash('sha256').update(value).digest('hex'); }
function issue(prefix: string) { return `${prefix}_${randomBytes(30).toString('base64url')}`; }

// Outbound webhook payloads must be SIGNED with the plaintext secret, which a
// one-way hash (secretHash, kept only for the one-time-reveal audit trail)
// cannot provide. This encrypts the secret at rest with a server-held key so
// it can be recovered at delivery time without ever being stored in plaintext.
// Exported (with the pair below) so their round-trip/tamper-detection behavior
// can be unit-tested without a database.
export function encryptionKey() {
  const base = process.env.BETTER_AUTH_SECRET ?? process.env.SESSION_SECRET ?? 'development-secret-key-not-for-production-use';
  return createHash('sha256').update(`${base}:webhook-secret-encryption`).digest();
}
export function encryptSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}
export function decryptSecret(ciphertext: string): string | null {
  try {
    const [ivB64, tagB64, dataB64] = ciphertext.split(':');
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

export type IntegrationService = ReturnType<typeof createIntegrationService>;
export function createIntegrationService(database: DB) {
  async function attemptDelivery(deliveryId: string) {
    const [delivery] = await database.select({ id: integrationWebhookDeliveries.id, webhookId: integrationWebhookDeliveries.webhookId, eventType: integrationWebhookDeliveries.eventType, payload: integrationWebhookDeliveries.payload, attempts: integrationWebhookDeliveries.attempts, status: integrationWebhookDeliveries.status }).from(integrationWebhookDeliveries).where(eq(integrationWebhookDeliveries.id, deliveryId)).limit(1);
    if (!delivery || delivery.status !== 'queued') return;

    const fail = async (reason: string, responseStatus: number | null = null) => {
      const attempts = delivery.attempts + 1;
      const permanent = attempts >= MAX_DELIVERY_ATTEMPTS;
      const trimmedReason = reason.slice(0, 500);
      await database.update(integrationWebhookDeliveries).set({ status: permanent ? 'failed' : 'queued', attempts, responseStatus, lastError: trimmedReason, nextAttemptAt: new Date(Date.now() + backoffMs(attempts)) }).where(eq(integrationWebhookDeliveries.id, deliveryId));
      await database.update(integrationWebhooks).set({ failureReason: trimmedReason }).where(eq(integrationWebhooks.id, delivery.webhookId));
      if (!permanent) setTimeout(() => { void attemptDelivery(deliveryId); }, backoffMs(attempts));
    };

    const [webhook] = await database.select({ id: integrationWebhooks.id, endpointUrl: integrationWebhooks.endpointUrl, secretCiphertext: integrationWebhooks.secretCiphertext, status: integrationWebhooks.status }).from(integrationWebhooks).where(eq(integrationWebhooks.id, delivery.webhookId)).limit(1);
    if (!webhook || webhook.status !== 'active') { await fail('Webhook is no longer active'); return; }
    if (!webhook.secretCiphertext) { await fail('Webhook secret unavailable — recreate this webhook to enable delivery'); return; }
    const secret = decryptSecret(webhook.secretCiphertext);
    if (!secret) { await fail('Unable to recover the webhook signing secret'); return; }

    const signature = createHmac('sha256', secret).update(delivery.payload).digest('hex');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(webhook.endpointUrl, { method: 'POST', headers: { 'content-type': 'application/json', 'x-dentra-webhook-signature': signature, 'x-dentra-webhook-event': delivery.eventType }, body: delivery.payload, signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
      if (!response.ok) { await fail(`Endpoint responded with HTTP ${response.status}`, response.status); return; }
      await database.update(integrationWebhookDeliveries).set({ status: 'delivered', attempts: delivery.attempts + 1, responseStatus: response.status, deliveredAt: new Date() }).where(eq(integrationWebhookDeliveries.id, deliveryId));
      await database.update(integrationWebhooks).set({ lastDeliveryAt: new Date(), failureReason: null }).where(eq(integrationWebhooks.id, delivery.webhookId));
    } catch (caught) {
      await fail(caught instanceof Error ? caught.message : 'Delivery request failed');
    }
  }

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
      const [row] = await database.insert(integrationWebhooks).values({ clinicId, name: input.name, endpointUrl: input.endpointUrl, eventTypes: input.eventTypes, secretHash: digest(secret), secretCiphertext: encryptSecret(secret) }).returning({ id: integrationWebhooks.id, name: integrationWebhooks.name, endpointUrl: integrationWebhooks.endpointUrl, eventTypes: integrationWebhooks.eventTypes, status: integrationWebhooks.status, createdAt: integrationWebhooks.createdAt });
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

    /** Software-agnostic ledger rows (invoice issued / payment received / refund / adjustment) for a clinic's own accounting export — not a partner-API resource. */
    accountingLedger: async (clinicId: string, from: string, to: string) => {
      const [issued, received, transactions] = await Promise.all([
        database.select({ date: invoices.issuedAt, reference: invoices.invoiceNumber, amountPhp: invoices.totalAmountPhp, patientFirstName: patients.firstName, patientLastName: patients.lastName }).from(invoices).innerJoin(patients, eq(invoices.patientId, patients.id)).where(and(eq(invoices.clinicId, clinicId), gte(invoices.issuedAt, new Date(`${from}T00:00:00Z`)), lte(invoices.issuedAt, new Date(`${to}T23:59:59Z`)))),
        database.select({ date: invoicePayments.paymentDate, reference: invoices.invoiceNumber, amountPhp: invoicePayments.amountPhp, paymentMethod: invoicePayments.paymentMethod }).from(invoicePayments).innerJoin(invoices, eq(invoicePayments.invoiceId, invoices.id)).where(and(eq(invoicePayments.clinicId, clinicId), gte(invoicePayments.paymentDate, from), lte(invoicePayments.paymentDate, to))),
        database.select({ date: invoiceTransactions.transactionDate, reference: invoices.invoiceNumber, type: invoiceTransactions.type, amountPhp: invoiceTransactions.amountPhp, paymentMethod: invoiceTransactions.paymentMethod, reason: invoiceTransactions.reason }).from(invoiceTransactions).innerJoin(invoices, eq(invoiceTransactions.invoiceId, invoices.id)).where(and(eq(invoiceTransactions.clinicId, clinicId), gte(invoiceTransactions.transactionDate, from), lte(invoiceTransactions.transactionDate, to))),
      ]);
      const rows = [
        ...issued.map((row) => ({ date: (row.date ?? new Date()).toISOString().slice(0, 10), type: 'invoice_issued' as const, reference: row.reference, description: `Invoice issued to ${[row.patientFirstName, row.patientLastName].filter(Boolean).join(' ')}`, amountPhp: row.amountPhp, paymentMethod: null as string | null })),
        ...received.map((row) => ({ date: row.date, type: 'payment_received' as const, reference: row.reference, description: 'Payment received', amountPhp: row.amountPhp, paymentMethod: row.paymentMethod as string | null })),
        ...transactions.map((row) => ({ date: row.date, type: (row.type === 'refund' ? 'refund' : 'adjustment') as 'refund' | 'adjustment', reference: row.reference, description: row.reason, amountPhp: `-${row.amountPhp}`, paymentMethod: row.paymentMethod as string | null })),
      ];
      return rows.sort((a, b) => a.date.localeCompare(b.date));
    },

    /**
     * Fire-and-forget: enqueue a delivery row per matching active webhook and
     * kick off a delivery attempt. Never awaited by callers — a slow or
     * unreachable clinic endpoint must never delay the request that
     * triggered the event (booking, payment, etc).
     */
    dispatchEvent: (clinicId: string, eventType: string, data: Record<string, unknown>) => {
      void (async () => {
        try {
          const webhooks = await database.select({ id: integrationWebhooks.id, eventTypes: integrationWebhooks.eventTypes }).from(integrationWebhooks).where(and(eq(integrationWebhooks.clinicId, clinicId), eq(integrationWebhooks.status, 'active')));
          const matching = webhooks.filter((webhook) => (webhook.eventTypes ?? []).includes(eventType));
          if (!matching.length) return;
          const payload = JSON.stringify({ eventType, clinicId, data, occurredAt: new Date().toISOString() });
          for (const webhook of matching) {
            const [delivery] = await database.insert(integrationWebhookDeliveries).values({ webhookId: webhook.id, clinicId, eventType, payload }).returning({ id: integrationWebhookDeliveries.id });
            if (delivery) void attemptDelivery(delivery.id);
          }
        } catch {
          // Best-effort — a dispatch failure must never surface to the caller's own request.
        }
      })();
    },

    /** Drains any deliveries left queued past their retry time — meant for a boot-time sweep after a process restart interrupts in-memory retry timers. */
    processDueDeliveries: async (limit = 50) => {
      const due = await database.select({ id: integrationWebhookDeliveries.id }).from(integrationWebhookDeliveries).where(and(eq(integrationWebhookDeliveries.status, 'queued'), lte(integrationWebhookDeliveries.nextAttemptAt, new Date()))).orderBy(asc(integrationWebhookDeliveries.nextAttemptAt)).limit(limit);
      for (const row of due) await attemptDelivery(row.id);
      return { processed: due.length };
    },

    listDeliveries: async (clinicId: string, webhookId: string) => database.select({ id: integrationWebhookDeliveries.id, eventType: integrationWebhookDeliveries.eventType, status: integrationWebhookDeliveries.status, attempts: integrationWebhookDeliveries.attempts, responseStatus: integrationWebhookDeliveries.responseStatus, lastError: integrationWebhookDeliveries.lastError, deliveredAt: integrationWebhookDeliveries.deliveredAt, createdAt: integrationWebhookDeliveries.createdAt }).from(integrationWebhookDeliveries).where(and(eq(integrationWebhookDeliveries.clinicId, clinicId), eq(integrationWebhookDeliveries.webhookId, webhookId))).orderBy(desc(integrationWebhookDeliveries.createdAt)).limit(20),
  };
}
