import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { ApiConfig } from '../src/config.js';

const config: ApiConfig = {
  nodeEnv: 'test',
  host: '127.0.0.1',
  port: 3001,
  logLevel: 'silent',
  corsOrigins: ['http://localhost:3000'],
  authSecret: 'test-secret-that-is-at-least-32-characters',
  authBaseUrl: 'http://localhost:3001',
};

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe('health routes', () => {
  it('returns liveness without querying the database', async () => {
    let checks = 0;
    app = await buildApp({
      config,
      checkDatabase: async () => {
        checks += 1;
      },
      logger: false,
    });

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', service: 'dentra-api' });
    expect(checks).toBe(0);
  });

  it('reports database readiness on the versioned endpoint', async () => {
    app = await buildApp({
      config,
      checkDatabase: async () => undefined,
      logger: false,
    });

    const response = await app.inject({ method: 'GET', url: '/v1/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ok',
      service: 'dentra-api',
      database: 'connected',
    });
  });

  it('returns 503 without leaking database errors', async () => {
    app = await buildApp({
      config,
      checkDatabase: async () => {
        throw new Error('postgresql://secret@private-host/patient-data');
      },
      logger: false,
    });

    const response = await app.inject({ method: 'GET', url: '/v1/health' });

    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain('secret');
    expect(response.json()).toEqual({
      status: 'unavailable',
      service: 'dentra-api',
      database: 'disconnected',
    });
  });

  it('allows configured browser origins with credentials', async () => {
    app = await buildApp({
      config,
      checkDatabase: async () => undefined,
      logger: false,
    });

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/v1/health',
      headers: {
        origin: 'http://localhost:3000',
        'access-control-request-method': 'GET',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });
});
