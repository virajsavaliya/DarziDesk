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
import { execSync } from 'child_process';
import type { Server } from 'http';

let server: Server | null = null;

async function waitForDatabase(maxRetries = 15, delayMs = 1500): Promise<void> {
  let attempt = 0;
  let autoStartedDocker = false;

  while (attempt < maxRetries) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      logger.info('✅ PostgreSQL connected and ready at localhost:5432');
      return;
    } catch (err: unknown) {
      attempt++;
      const errorMessage = err instanceof Error ? err.message : String(err);

      if (!autoStartedDocker && (errorMessage.includes("Can't reach database server") || errorMessage.includes('connection refused'))) {
        try {
          logger.warn('⚠️  Database at localhost:5432 unreachable. Attempting to start Docker PostgreSQL container...');
          execSync('docker compose up -d postgres 2>/dev/null || docker start darzi_desk_postgres 2>/dev/null', {
            stdio: 'ignore',
            timeout: 5000,
          });
          autoStartedDocker = true;
        } catch {
          // Docker CLI may not be available or is still booting; retry loop will handle it
        }
      }

      if (attempt >= maxRetries) {
        logger.fatal(
          { error: errorMessage },
          '❌ Could not connect to PostgreSQL at localhost:5432 after 15 attempts.\n' +
          '👉 Please make sure Docker Desktop is running, then run:\n' +
          '   docker compose up -d postgres\n',
        );
        process.exit(1);
      }

      logger.warn(`⏳ Waiting for PostgreSQL at localhost:5432 to accept connections... (${attempt}/${maxRetries})`);
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
}

async function bootstrap(): Promise<void> {
  // 1. Wait until database is guaranteed accessible
  await waitForDatabase();

  // 2. Start accepting HTTP requests
  const app = createApp();

  server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV },
      `🚀 DarziDesk API running on http://localhost:${env.PORT}`,
    );
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
function shutdown(signal: string): void {
  logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown...');

  const closeDb = (): void => {
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
  };

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      closeDb();
    });
  } else {
    closeDb();
  }

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
