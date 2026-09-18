import nodemailer, { type Transporter } from 'nodemailer';
import type { PlatformEmailSettings } from '../config.js';

/**
 * Platform-wide SMTP sender (SMTP2GO). This is the fallback email transport for
 * notificationOutbox rows that have no clinic-connected provider — either a
 * platform notification (null clinicId, e.g. dentist verification) or a clinic
 * that has not connected its own provider. Clinic-connected providers still take
 * precedence; see providers-service.ts.
 */
export type PlatformEmailService = {
  isConfigured: () => boolean;
  /** Sends one plain-text email. Throws on any transport/auth failure so the outbox can retry. */
  send: (recipient: string, subject: string, body: string) => Promise<void>;
};

export function createPlatformEmailService(settings?: PlatformEmailSettings): PlatformEmailService {
  if (!settings) {
    return {
      isConfigured: () => false,
      send: async () => {
        throw new Error('No platform email transport is configured (set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM)');
      },
    };
  }

  const from = settings.fromName ? `${settings.fromName} <${settings.from}>` : settings.from;
  let transporter: Transporter | null = null;
  const getTransport = () =>
    (transporter ??= nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: { user: settings.user, pass: settings.password },
    }));

  return {
    isConfigured: () => true,
    send: async (recipient, subject, body) => {
      await getTransport().sendMail({ from, to: recipient, subject, text: body });
    },
  };
}
