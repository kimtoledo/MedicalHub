import { and, eq } from 'drizzle-orm';
import type { DB } from '@dentra/db';
import { clinicNotificationProviders } from '@dentra/db/schema';
import { writeAudit } from '@dentra/db/audit';
import { AuditAction } from '@dentra/shared';
import { decryptSecret, encryptSecret } from '../crypto/secret-box.js';

const CREDENTIAL_PURPOSE = 'notification-provider-credential';

export type NotificationChannel = 'email' | 'sms';
export type NotificationProviderActor = { id: string; email: string; ipAddress?: string; userAgent?: string };
export class NotificationProviderError extends Error { constructor(public code: string, message: string, public statusCode = 400) { super(message); } }

export type SendGridCredential = { apiKey: string };
export type TwilioCredential = { accountSid: string; authToken: string };

function credentialFields(providerName: 'sendgrid' | 'twilio', credential: Record<string, string>) {
  if (providerName === 'sendgrid') return { apiKey: credential.apiKey };
  return { accountSid: credential.accountSid, authToken: credential.authToken };
}

// Exported for direct unit testing of the HTTP request shape without a database.
export async function sendViaSendGrid(fromAddress: string, credential: SendGridCredential, recipient: string, subject: string, body: string) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { authorization: `Bearer ${credential.apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: recipient }] }],
      from: { email: fromAddress },
      subject,
      content: [{ type: 'text/plain', value: body }],
    }),
  });
  if (!response.ok) throw new Error(`SendGrid responded with HTTP ${response.status}`);
}

export async function sendViaTwilio(fromAddress: string, credential: TwilioCredential, recipient: string, body: string) {
  const auth = Buffer.from(`${credential.accountSid}:${credential.authToken}`).toString('base64');
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${credential.accountSid}/Messages.json`, {
    method: 'POST',
    headers: { authorization: `Basic ${auth}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: recipient, From: fromAddress, Body: body }).toString(),
  });
  if (!response.ok) throw new Error(`Twilio responded with HTTP ${response.status}`);
}

export type NotificationProvidersService = ReturnType<typeof createNotificationProvidersService>;
export function createNotificationProvidersService(database: DB) {
  return {
    status: async (clinicId: string) => database.select({ id: clinicNotificationProviders.id, channel: clinicNotificationProviders.channel, providerName: clinicNotificationProviders.providerName, fromAddress: clinicNotificationProviders.fromAddress, status: clinicNotificationProviders.status, lastUsedAt: clinicNotificationProviders.lastUsedAt, lastError: clinicNotificationProviders.lastError, createdAt: clinicNotificationProviders.createdAt }).from(clinicNotificationProviders).where(eq(clinicNotificationProviders.clinicId, clinicId)),

    setProvider: async (clinicId: string, channel: NotificationChannel, providerName: 'sendgrid' | 'twilio', credential: Record<string, string>, fromAddress: string, actor: NotificationProviderActor) => {
      const fields = credentialFields(providerName, credential);
      if (Object.values(fields).some((value) => !value)) throw new NotificationProviderError('INVALID_CREDENTIAL', `Missing required ${providerName} credential fields`, 400);
      const credentialCiphertext = encryptSecret(CREDENTIAL_PURPOSE, JSON.stringify(fields));
      const [existing] = await database.select({ id: clinicNotificationProviders.id }).from(clinicNotificationProviders).where(and(eq(clinicNotificationProviders.clinicId, clinicId), eq(clinicNotificationProviders.channel, channel))).limit(1);
      const [row] = existing
        ? await database.update(clinicNotificationProviders).set({ providerName, fromAddress, credentialCiphertext, status: 'active', lastError: null, updatedAt: new Date() }).where(eq(clinicNotificationProviders.id, existing.id)).returning({ id: clinicNotificationProviders.id, channel: clinicNotificationProviders.channel, providerName: clinicNotificationProviders.providerName, fromAddress: clinicNotificationProviders.fromAddress, status: clinicNotificationProviders.status })
        : await database.insert(clinicNotificationProviders).values({ clinicId, channel, providerName, fromAddress, credentialCiphertext }).returning({ id: clinicNotificationProviders.id, channel: clinicNotificationProviders.channel, providerName: clinicNotificationProviders.providerName, fromAddress: clinicNotificationProviders.fromAddress, status: clinicNotificationProviders.status });
      await writeAudit(database, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'clinic_notification_provider', entityId: row.id, action: AuditAction.NOTIFICATION_PROVIDER_CONNECTED, metadata: JSON.stringify({ channel, providerName }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return row;
    },

    removeProvider: async (clinicId: string, channel: NotificationChannel, actor: NotificationProviderActor) => {
      const [row] = await database.delete(clinicNotificationProviders).where(and(eq(clinicNotificationProviders.clinicId, clinicId), eq(clinicNotificationProviders.channel, channel))).returning({ id: clinicNotificationProviders.id });
      if (!row) throw new NotificationProviderError('PROVIDER_NOT_FOUND', 'No provider configured for this channel', 404);
      await writeAudit(database, { actorId: actor.id, actorEmail: actor.email, clinicId, entityType: 'clinic_notification_provider', entityId: row.id, action: AuditAction.NOTIFICATION_PROVIDER_REMOVED, metadata: JSON.stringify({ channel }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return row;
    },

    /** Resolves the clinic's configured provider for a channel and sends. Throws (never silently no-ops) so callers can retry/mark-failed accurately. */
    send: async (clinicId: string, channel: NotificationChannel, recipient: string, subject: string, body: string) => {
      const [config] = await database.select({ id: clinicNotificationProviders.id, providerName: clinicNotificationProviders.providerName, fromAddress: clinicNotificationProviders.fromAddress, credentialCiphertext: clinicNotificationProviders.credentialCiphertext, status: clinicNotificationProviders.status }).from(clinicNotificationProviders).where(and(eq(clinicNotificationProviders.clinicId, clinicId), eq(clinicNotificationProviders.channel, channel))).limit(1);
      if (!config || config.status !== 'active') throw new Error(`No active ${channel} provider is configured for this clinic`);
      const decrypted = decryptSecret(CREDENTIAL_PURPOSE, config.credentialCiphertext);
      if (!decrypted) throw new Error('Unable to recover the provider credential');
      const credential = JSON.parse(decrypted) as Record<string, string>;
      try {
        if (config.providerName === 'sendgrid') await sendViaSendGrid(config.fromAddress, credential as SendGridCredential, recipient, subject, body);
        else await sendViaTwilio(config.fromAddress, credential as TwilioCredential, recipient, body);
        await database.update(clinicNotificationProviders).set({ lastUsedAt: new Date(), lastError: null }).where(eq(clinicNotificationProviders.id, config.id));
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : 'Provider send failed';
        await database.update(clinicNotificationProviders).set({ lastError: message.slice(0, 500) }).where(eq(clinicNotificationProviders.id, config.id));
        throw caught;
      }
    },
  };
}
