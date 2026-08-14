import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { ClinicBrandingService } from '../src/clinic/branding-service.js';
import { ClinicBrandingError } from '../src/clinic/branding-service.js';
import type { AuthServices, AuthorizationContext } from '../src/auth/types.js';
import type { ApiConfig } from '../src/config.js';

const config: ApiConfig = { nodeEnv: 'test', host: '127.0.0.1', port: 3001, logLevel: 'silent', corsOrigins: [], authSecret: 'test-secret-that-is-at-least-32-characters', authBaseUrl: 'http://localhost:3001' };
const clinicId = '33333333-3333-4333-8333-333333333333';
const otherId = '44444444-4444-4444-8444-444444444444';

const owner: AuthorizationContext = { user: { id: 'user', email: 'owner@test', name: 'Owner', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId, branchId: null, role: 'clinic_owner', dentistId: null }] };
const assistant: AuthorizationContext = { user: { id: 'user2', email: 'assistant@test', name: 'Assistant', platformRole: null }, strategies: ['clinicMember'], clinicMemberships: [{ clinicId, branchId: null, role: 'dental_assistant', dentistId: null }] };

let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; });

const auth = (context: AuthorizationContext | null): AuthServices => ({
  handler: vi.fn(async () => new Response()),
  getSession: vi.fn(async () => context ? { session: { id: 's', userId: context.user.id, expiresAt: new Date('2030-01-01') }, user: context.user } : null),
  resolveAuthorization: vi.fn(async () => context),
});

const branding = (): ClinicBrandingService => ({
  uploadImage: vi.fn(async () => ({ updatedAt: '2026-01-01T00:00:00.000Z' })),
  setCoverMode: vi.fn(async (_id, coverMode) => ({ coverMode })),
  streamImage: vi.fn(async () => ({ buffer: Buffer.from('fake-image-bytes'), mimeType: 'image/png' })),
});

async function setup(context: AuthorizationContext | null, service: ClinicBrandingService) {
  app = await buildApp({ config, checkDatabase: async () => undefined, logger: false, auth: auth(context), clinicBranding: service });
}

function multipartBody(boundary: string, filename: string, mimeType: string, content: string): string {
  return `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n${content}\r\n--${boundary}--\r\n`;
}

describe('clinic branding routes', () => {
  it('rejects an unauthenticated upload', async () => {
    const service = branding(); await setup(null, service);
    const boundary = 'test-boundary';
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${clinicId}/branding/logo`, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }, payload: multipartBody(boundary, 'logo.png', 'image/png', 'fake') });
    expect(response.statusCode).toBe(401);
    expect(service.uploadImage).not.toHaveBeenCalled();
  });

  it('denies upload from a non-admin clinic role', async () => {
    const service = branding(); await setup(assistant, service);
    const boundary = 'test-boundary';
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${clinicId}/branding/logo`, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }, payload: multipartBody(boundary, 'logo.png', 'image/png', 'fake') });
    expect(response.statusCode).toBe(403);
    expect(service.uploadImage).not.toHaveBeenCalled();
  });

  it('denies cross-tenant upload before touching the service', async () => {
    const service = branding(); await setup(owner, service);
    const boundary = 'test-boundary';
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${otherId}/branding/logo`, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }, payload: multipartBody(boundary, 'logo.png', 'image/png', 'fake') });
    expect(response.statusCode).toBe(403);
    expect(service.uploadImage).not.toHaveBeenCalled();
  });

  it('uploads a logo for the Clinic Owner and returns the updated timestamp', async () => {
    const service = branding(); await setup(owner, service);
    const boundary = 'test-boundary';
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${clinicId}/branding/logo`, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }, payload: multipartBody(boundary, 'logo.png', 'image/png', 'fake-bytes') });
    expect(response.statusCode).toBe(201);
    expect(service.uploadImage).toHaveBeenCalledWith(clinicId, 'logo', expect.objectContaining({ mimeType: 'image/png' }), expect.objectContaining({ id: owner.user.id }));
  });

  it('rejects an upload with no file part', async () => {
    const service = branding(); await setup(owner, service);
    const boundary = 'test-boundary';
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${clinicId}/branding/cover`, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }, payload: `--${boundary}--\r\n` });
    expect(response.statusCode).toBe(400);
    expect(service.uploadImage).not.toHaveBeenCalled();
  });

  it('surfaces a branding service error with its mapped status', async () => {
    const service = branding();
    (service.uploadImage as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new ClinicBrandingError('TOO_LARGE', 'Image exceeds the 5 MB limit'));
    await setup(owner, service);
    const boundary = 'test-boundary';
    const response = await app!.inject({ method: 'POST', url: `/v1/clinic/${clinicId}/branding/cover`, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }, payload: multipartBody(boundary, 'cover.png', 'image/png', 'fake-bytes') });
    expect(response.statusCode).toBe(413);
  });

  it('updates the cover mode for the Clinic Owner', async () => {
    const service = branding(); await setup(owner, service);
    const response = await app!.inject({ method: 'PATCH', url: `/v1/clinic/${clinicId}/branding/cover-mode`, payload: { coverMode: 'image' } });
    expect(response.statusCode).toBe(200);
    expect(service.setCoverMode).toHaveBeenCalledWith(clinicId, 'image', expect.objectContaining({ id: owner.user.id }));
  });

  it('rejects an invalid cover mode value', async () => {
    const service = branding(); await setup(owner, service);
    const response = await app!.inject({ method: 'PATCH', url: `/v1/clinic/${clinicId}/branding/cover-mode`, payload: { coverMode: 'video' } });
    expect(response.statusCode).toBe(400);
    expect(service.setCoverMode).not.toHaveBeenCalled();
  });

  it('serves a public branding image without authentication', async () => {
    const service = branding(); await setup(null, service);
    const response = await app!.inject({ method: 'GET', url: `/v1/public/clinics/${clinicId}/branding/logo` });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('image/png');
  });

  it('returns 404 when a clinic has no uploaded branding image', async () => {
    const service = branding();
    (service.streamImage as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    await setup(null, service);
    const response = await app!.inject({ method: 'GET', url: `/v1/public/clinics/${clinicId}/branding/cover` });
    expect(response.statusCode).toBe(404);
  });
});
