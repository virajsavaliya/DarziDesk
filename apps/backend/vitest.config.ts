import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    // 30s timeout — some tests hit a real Postgres DB
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Limit concurrency to 1 to avoid table-truncation race conditions
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
