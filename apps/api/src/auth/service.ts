import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import type { DB } from '@toothhub/db';
import * as schema from '@toothhub/db/schema';
import { betterAuth } from 'better-auth';
import type { ApiConfig } from '../config.js';
import { createAuthorizationResolver } from './authorization.js';
import type { AuthServices, BetterAuthSession } from './types.js';

export function createAuthServices(config: ApiConfig, database: DB): AuthServices {
  const auth = betterAuth({
    appName: 'ToothHub PH',
    secret: config.authSecret,
    baseURL: config.authBaseUrl,
    basePath: '/v1/auth',
    trustedOrigins: config.corsOrigins,
    database: drizzleAdapter(database, {
      provider: 'pg',
      schema,
      usePlural: true,
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
    },
    user: {
      fields: {
        image: 'avatarUrl',
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    verification: {
      storeIdentifier: 'hashed',
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
      },
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ['x-toothhub-client-ip'],
      },
      database: {
        generateId: 'uuid',
      },
      useSecureCookies: config.nodeEnv === 'production',
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.nodeEnv === 'production',
      },
    },
  });

  return {
    handler: auth.handler,
    getSession: async (headers) =>
      (await auth.api.getSession({ headers })) as BetterAuthSession | null,
    resolveAuthorization: createAuthorizationResolver(database),
  };
}
