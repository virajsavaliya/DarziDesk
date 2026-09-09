/**
 * Server entry point.
 *
 * Responsibilities:
 * 1. Load and validate environment config (exits if invalid).
 * 2. Create the Express app.
 * 3. Bind to PORT and start accepting requests.
 * 4. Handle graceful shutdown on SIGTERM/SIGINT.
 */

import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { createApp } from './app';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV },
    `🚀 DarziDesk API running on http://localhost:${env.PORT}`,
  );
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
function shutdown(signal: string): void {
  logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown...');

  server.close(() => {
    logger.info('HTTP server closed');

    prisma.$disconnect()
      .then(() => {
        logger.info('Database connection closed');
        logger.info('Graceful shutdown complete');
        process.exit(0);
      })
      .catch((err: unknown) => {
        logger.error({ err }, 'Error disconnecting from database');
        process.exit(1);
      });
  });

  // Force-kill if graceful shutdown takes longer than 10 seconds
  setTimeout(() => {
    logger.error('Graceful shutdown timeout — forcing exit');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => { shutdown('SIGTERM'); });
process.on('SIGINT',  () => { shutdown('SIGINT'); });

// Catch unhandled promise rejections — log and exit to avoid undefined state
process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled promise rejection — shutting down');
  process.exit(1);
});

// Catch uncaught synchronous exceptions
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — shutting down');
  process.exit(1);
});
