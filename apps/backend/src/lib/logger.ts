/**
 * Pino logger singleton.
 *
 * - Development: uses pino-pretty for human-readable, colorized output.
 * - Production:  outputs structured JSON to stdout for log aggregators
 *                (Datadog, CloudWatch, Loki, etc.).
 *
 * Import this logger everywhere instead of using console.log.
 * ESLint is configured to flag console.log as an error.
 */

import pino, { type DestinationStream } from 'pino';
import { env } from '../config/env';

const isDev = env.NODE_ENV === 'development';

export const logger = pino(
  {
    level: env.LOG_LEVEL,
    // Redact sensitive fields from log output — never log secrets
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token', '*.secret'],
      censor: '[REDACTED]',
    },
    // Serialize Date objects as ISO strings
    timestamp: pino.stdTimeFunctions.isoTime,
    // Base fields included on every log line
    base: {
      service: 'darzi-desk-api',
      env: env.NODE_ENV,
    },
  },
  isDev
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname,service,env',
        },
      }) as unknown as DestinationStream
    : undefined,
);

export type Logger = typeof logger;
