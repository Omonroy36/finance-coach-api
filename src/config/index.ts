import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z.string().url(),

  REDIS_URL: z.string().url(),
  REDIS_PREFIX: z.string().default('finance:'),

  JWT_PRIVATE_KEY_BASE64: z.string().min(1),
  JWT_PUBLIC_KEY_BASE64: z.string().min(1),
  JWT_ACCESS_TOKEN_TTL: z.coerce.number().default(900),
  JWT_REFRESH_TOKEN_TTL: z.coerce.number().default(2592000),
  JWT_ISSUER: z.string().default('finance-coach'),
  JWT_AUDIENCE: z.string().default('finance-coach-app'),

  INTEGRATION_ENCRYPTION_KEY: z.string().length(64),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),
  APPLE_PRIVATE_KEY_BASE64: z.string().optional(),

  PLAID_CLIENT_ID: z.string().optional(),
  PLAID_SECRET: z.string().optional(),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
  PLAID_WEBHOOK_URL: z.string().url().optional(),

  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY_BASE64: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email().default('noreply@financecoach.app'),

  CORS_ORIGIN: z.string().default('http://localhost:3001'),

  RATE_LIMIT_AUTH: z.coerce.number().default(5),
  RATE_LIMIT_GLOBAL: z.coerce.number().default(300),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
