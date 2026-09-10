/**
 * Environment configuration — validated at startup via Zod.
 *
 * This module parses and validates all required environment variables.
 * If any required variable is missing or malformed, the process exits
 * immediately with a clear error message — preventing silent misconfiguration.
 *
 * .env loading: Uses Node's built-in `fs` to read a `.env` file from the
 * current working directory. No external dotenv dependency required.
 * Variables already set in the environment (e.g. CI secrets) are never
 * overwritten.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// .env loader — runs before Zod validation
// ---------------------------------------------------------------------------
function loadDotEnv(): void {
  const envPath = resolve(process.cwd(), '.env');
  let raw: string;
  try {
    raw = readFileSync(envPath, 'utf8');
  } catch {
    // No .env file — rely solely on the shell environment (CI, Docker, etc.)
    return;
  }

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    // Skip blank lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    // Strip optional surrounding quotes from the value
    const rawVal = trimmed.slice(eqIdx + 1).trim();
    const value = rawVal.replace(/^(['"])(.*)\1$/, '$2');

    // Never override variables already set in the environment
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();



const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  // Database
  DATABASE_URL: z
    .string()
    .url('DATABASE_URL must be a valid PostgreSQL connection string'),

  // JWT
  JWT_SECRET: z
    .string()
    .min(64, 'JWT_SECRET must be at least 64 characters (256-bit minimum)'),
  JWT_ACCESS_EXPIRES_IN: z
    .string()
    .default('7d'),

  // Password reset
  RESET_TOKEN_EXPIRES_MINUTES: z
    .coerce.number().int().positive().default(60),

  // Logging
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
    .default('info'),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.errors
      .map((e) => `  • ${e.path.join('.')}: ${e.message}`)
      .join('\n');

    process.stderr.write(
      `\n[FATAL] Invalid environment configuration:\n${formatted}\n\n` +
        `  → Copy apps/backend/.env.example to apps/backend/.env and fill in all values.\n\n`,
    );
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();
export type Env = typeof env;
