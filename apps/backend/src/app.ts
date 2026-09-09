/**
 * Express application factory.
 *
 * Creates and configures the Express app separately from the server entry point.
 * Exporting the app factory (rather than the server) makes it easy to:
 *  - Test routes without binding to a port (supertest pattern)
 *  - Apply different middleware in test vs. production
 */

import express, { type Application, type Request, type Response } from 'express';
import { healthRouter } from './routes/health';
import { authRouter } from './modules/auth/auth.router';
import { usersRouter } from './modules/users/user.router';
import { customersRouter } from './modules/customers/customer.router';
import {
  customerMeasurementsRouter,
  measurementsRouter,
} from './modules/measurements/measurement.router';
import { garmentTemplatesRouter } from './modules/measurements/template.router';
import { fabricsRouter } from './modules/fabrics/fabric.router';
import { ordersRouter } from './modules/orders/order.router';
import { staffRouter } from './modules/staff/staff.router';
import { dashboardRouter } from './modules/dashboard/dashboard.router';
import { invoiceRouter } from './modules/invoices/invoice.router';
import { notificationRouter } from './modules/notifications/notification.router';
import { portalRouter } from './modules/portal/portal.router';
import {
  publicMarketplaceRouter,
  shopMarketplaceRouter,
  adminMarketplaceRouter,
} from './modules/marketplace/marketplace.router';
import { adminSubscriptionRouter, publicSubscriptionRouter } from './modules/subscriptions/subscription.router';
import { devRouter } from './modules/dev/dev.router';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): Application {
  const app = express();

  // ---------------------------------------------------------------------------
  // Request parsing
  // ---------------------------------------------------------------------------
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ---------------------------------------------------------------------------
  // Routes
  // ---------------------------------------------------------------------------
  // Root index / discovery
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'DarziDesk API',
      status: 'running',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth',
        users: '/api/users',
        customers: '/api/customers',
        measurements: '/api/measurements',
        garmentTemplates: '/api/garment-templates',
        fabrics: '/api/fabrics',
        orders: '/api/orders',
        staff: '/api/staff',
        dashboard: '/api/dashboard',
        invoices: '/api/invoices',
        notifications: '/api/notifications',
        portal: '/api/portal',
        dev: '/api/dev',
      },
    });
  });

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/customers/:customerId/measurements', customerMeasurementsRouter);
  app.use('/api/customers', customersRouter);
  app.use('/api/measurements', measurementsRouter);
  app.use('/api/garment-templates', garmentTemplatesRouter);
  app.use('/api/fabrics', fabricsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/staff', staffRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/invoices', invoiceRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/portal', portalRouter);
  app.use('/api/marketplace', publicMarketplaceRouter);
  app.use('/api/shop', shopMarketplaceRouter);
  app.use('/api/admin/marketplace', adminMarketplaceRouter);
  app.use('/api/admin', adminSubscriptionRouter);
  app.use('/api/public', publicSubscriptionRouter);
  app.use('/api/dev', devRouter);

  // 404 handler — must come after all routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        message: 'Route not found',
        code: 'NOT_FOUND',
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Error handler — must be registered LAST, after all routes and middleware
  // ---------------------------------------------------------------------------
  app.use(errorHandler);

  return app;
}
