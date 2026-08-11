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
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:5000'),
  CORS_ORIGINS: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  BETTER_AUTH_URL: z.string().url().optional(),
});

export type ApiConfig = {
  nodeEnv: z.infer<typeof environmentSchema>['NODE_ENV'];
  host: string;
  port: number;
  logLevel: z.infer<typeof environmentSchema>['API_LOG_LEVEL'];
  corsOrigins: string[];
  authSecret: string;
  authBaseUrl: string;
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

  return {
    nodeEnv: result.data.NODE_ENV,
    host: result.data.API_HOST,
    port: result.data.API_PORT,
    logLevel: result.data.API_LOG_LEVEL,
    corsOrigins,
    authSecret,
    authBaseUrl:
      result.data.BETTER_AUTH_URL ?? `http://localhost:${result.data.API_PORT}`,
  };
}
