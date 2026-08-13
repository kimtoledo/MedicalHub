import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FeatureKey } from '@dentra/shared';
import { requireClinicFeature } from '../clinic/access.js';
import type { AuthServices, ClinicRole } from '../auth/types.js';
import type { EntitlementService } from '../entitlements/service.js';
import type { PaymentService } from '../payments/service.js';
import { PaymentError } from '../payments/service.js';
import { postgresUuidSchema } from '../validation.js';
const clinic = z.object({ clinicId: postgresUuidSchema });
const invoice = z.object({ invoiceId: postgresUuidSchema });
const link = z.object({ token: z.string().min(20) });
const clinicLink = z.object({ clinicId: postgresUuidSchema, linkId: postgresUuidSchema });
const body = z.object({ expiresAt: z.string().datetime({ offset: true }) }).strict();
const webhook = z.object({ eventId: z.string().min(3).max(200), eventType: z.string().min(3).max(100), paymentId: z.string().min(2).max(200), linkToken: z.string().min(20), amountPhp: z.string().regex(/^\d+(?:\.\d{1,2})?$/), success: z.boolean() }).strict();
const roles: readonly ClinicRole[] = ['clinic_owner', 'clinic_admin', 'cashier'];
const sendError = (reply: any, caught: unknown) => { if (caught instanceof PaymentError) return reply.status(caught.statusCode).send({ success: false, error: { code: caught.code, message: caught.message } }); throw caught; };
export async function registerOnlinePaymentRoutes(app: FastifyInstance, options: { auth: AuthServices; entitlements: EntitlementService; payments: PaymentService }) {
  app.post('/v1/clinic/:clinicId/invoices/:invoiceId/payment-link', async (request, reply) => { const p = clinic.extend(invoice.shape).safeParse(request.params); const b = body.safeParse(request.body); if (!p.success || !b.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid payment link request' } }); const auth = await requireClinicFeature(request, reply, options, p.data.clinicId, FeatureKey.BILLING_PAYMENTS, [...roles]); if (!auth) return; try { return reply.status(201).send({ success: true, data: await options.payments.createLink(p.data.clinicId, p.data.invoiceId, new Date(b.data.expiresAt), { id: auth.user.id, email: auth.user.email }) }); } catch (caught) { return sendError(reply, caught); } });
  app.get('/v1/clinic/:clinicId/invoices/:invoiceId/payment-links', async (request, reply) => { const p = clinic.extend(invoice.shape).safeParse(request.params); if (!p.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request' } }); const auth = await requireClinicFeature(request, reply, options, p.data.clinicId, FeatureKey.BILLING_PAYMENTS, [...roles]); if (!auth) return; try { return reply.send({ success: true, data: await options.payments.listLinks(p.data.clinicId, p.data.invoiceId) }); } catch (caught) { return sendError(reply, caught); } });
  app.post('/v1/clinic/:clinicId/payment-links/:linkId/cancel', async (request, reply) => { const p = clinicLink.safeParse(request.params); if (!p.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request' } }); const auth = await requireClinicFeature(request, reply, options, p.data.clinicId, FeatureKey.BILLING_PAYMENTS, [...roles]); if (!auth) return; try { return reply.send({ success: true, data: await options.payments.cancelLink(p.data.clinicId, p.data.linkId, { id: auth.user.id, email: auth.user.email }) }); } catch (caught) { return sendError(reply, caught); } });
  app.get('/v1/public/payment-links/:token', async (request, reply) => { const p = link.safeParse(request.params); if (!p.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid payment link' } }); try { return reply.send({ success: true, data: await options.payments.getLink(p.data.token) }); } catch (caught) { return sendError(reply, caught); } });
  app.post('/v1/public/payment-webhooks/:provider', async (request, reply) => { const provider = z.object({ provider: z.string().min(2).max(50) }).safeParse(request.params); const parsed = webhook.safeParse(request.body); const signature = String(request.headers['x-dentra-payment-signature'] ?? ''); if (!provider.success || !parsed.success) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid webhook payload' } }); try { const payload = JSON.stringify(parsed.data); return reply.send({ success: true, data: await options.payments.webhook({ ...parsed.data, provider: provider.data.provider, eventType: 'payment', payload, signature }) }); } catch (caught) { return sendError(reply, caught); } });
}
