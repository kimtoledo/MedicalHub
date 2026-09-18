import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const rootEnvPath = fileURLToPath(new URL('../../../.env', import.meta.url));
dotenv.config({ path: rootEnvPath });

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().min(1).default('0.0.0.0'),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  API_LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:5001'),
  CORS_ORIGINS: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  BETTER_AUTH_URL: z.string().url().optional(),
  // Platform-wide SMTP transport (SMTP2GO). Used as the fallback email sender
  // for notificationOutbox rows with no clinic-connected provider — e.g.
  // dentist-verification emails, which carry a null clinicId.
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65_535).optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  // "true" for implicit TLS (port 465). Defaults to false — STARTTLS is
  // negotiated automatically on 587/2525.
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_FROM_NAME: z.string().min(1).optional(),
});

export type PlatformEmailSettings = {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean;
  from: string;
  fromName?: string;
};

export type ApiConfig = {
  nodeEnv: z.infer<typeof environmentSchema>['NODE_ENV'];
  host: string;
  port: number;
  logLevel: z.infer<typeof environmentSchema>['API_LOG_LEVEL'];
  corsOrigins: string[];
  authSecret: string;
  authBaseUrl: string;
  /** Present only when SMTP_HOST, SMTP_USER, SMTP_PASSWORD and EMAIL_FROM are all set. */
  platformEmail?: PlatformEmailSettings;
};

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): ApiConfig {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => issue.message).join('; ');
    throw new Error(`Invalid API configuration: ${issues}`);
  }

  const corsOrigins = (result.data.CORS_ORIGINS ?? result.data.NEXT_PUBLIC_APP_URL)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const authSecret = result.data.BETTER_AUTH_SECRET ?? result.data.SESSION_SECRET;

  if (!authSecret) {
    throw new Error(
      'Invalid API configuration: BETTER_AUTH_SECRET or SESSION_SECRET (minimum 32 characters) is required',
    );
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_SECURE, EMAIL_FROM, EMAIL_FROM_NAME } = result.data;
  const platformEmail: PlatformEmailSettings | undefined =
    SMTP_HOST && SMTP_USER && SMTP_PASSWORD && EMAIL_FROM
      ? {
          host: SMTP_HOST,
          port: SMTP_PORT ?? (SMTP_SECURE ? 465 : 587),
          user: SMTP_USER,
          password: SMTP_PASSWORD,
          secure: SMTP_SECURE ?? false,
          from: EMAIL_FROM,
          fromName: EMAIL_FROM_NAME,
        }
      : undefined;

  return {
    nodeEnv: result.data.NODE_ENV,
    host: result.data.API_HOST,
    port: result.data.API_PORT,
    logLevel: result.data.API_LOG_LEVEL,
    corsOrigins,
    authSecret,
    authBaseUrl:
      result.data.BETTER_AUTH_URL ?? `http://localhost:${result.data.API_PORT}`,
    platformEmail,
  };
}
