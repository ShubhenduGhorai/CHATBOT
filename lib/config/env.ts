import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32).optional(),
  JWT_ISSUER: z.string().min(1).default('chatbot'),
  JWT_AUDIENCE: z.string().min(1).default('chatbot-users'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  DEFAULT_TENANT_SLUG: z.string().min(1).default('default'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4.1-mini'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID_PRO: z.string().optional(),
  STRIPE_PRICE_ID_BUSINESS: z.string().optional(),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  FREE_PLAN_MESSAGE_LIMIT: z.coerce.number().int().positive().default(50)
});
export const env = envSchema.parse(process.env);
