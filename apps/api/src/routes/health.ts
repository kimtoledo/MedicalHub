import type { FastifyInstance } from 'fastify';

export type HealthRoutesOptions = {
  checkDatabase: () => Promise<void>;
};

export async function registerHealthRoutes(
  app: FastifyInstance,
  options: HealthRoutesOptions,
): Promise<void> {
  app.get('/health', async () => ({
    status: 'ok' as const,
    service: 'toothhub-api' as const,
  }));

  app.get('/v1/health', async (request, reply) => {
    try {
      await options.checkDatabase();

      return {
        status: 'ok' as const,
        service: 'toothhub-api' as const,
        database: 'connected' as const,
      };
    } catch {
      request.log.error('Database readiness check failed');
      return reply.status(503).send({
        status: 'unavailable' as const,
        service: 'toothhub-api' as const,
        database: 'disconnected' as const,
      });
    }
  });
}
