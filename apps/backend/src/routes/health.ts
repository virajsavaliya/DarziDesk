/**
 * Health check route.
 *
 * GET /api/health
 *
 * Returns a JSON payload confirming the API is alive, the current timestamp,
 * and process uptime. Used by load balancers, monitoring tools, and CI smoke tests.
 */

import { Router, type Request, type Response } from 'express';
import type { HealthResponse } from '@darzi-desk/types';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  const payload: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime() * 100) / 100,
  };

  res.status(200).json(payload);
});
