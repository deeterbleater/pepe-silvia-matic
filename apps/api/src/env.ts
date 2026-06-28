import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.string().url(),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  CLERK_SECRET_KEY: z.string().optional(),
  DEV_AUTH_BYPASS: z.coerce.boolean().default(false)
});

export const env = EnvSchema.parse(process.env);

