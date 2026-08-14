import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { httpInstrumentationMiddleware } from '@hono/otel';
import { AppDependencies, addressRoutes, contactRoutes, customerRoutes, healthRoutes } from './routes';
import { contextMiddleware, errorHandler } from './middlewares';

export function createApp(deps: AppDependencies): Hono {
  const app = new Hono();

  if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    app.use('*', httpInstrumentationMiddleware({
      serviceName: process.env.OTEL_SERVICE_NAME ?? 'customer-service',
      captureRequestHeaders: ['x-request-id'],
      spanNameFactory: (c) => `HTTP ${c.req.method} ${c.req.path}`,
    }));
  }
  app.use('*', logger());
  app.use('*', contextMiddleware());
  app.use(
    '*',
    cors({
      origin: deps.corsOrigin,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id', 'X-User-Id', 'X-Country-Code', 'X-Permissions'],
    }),
  );

  app.route('/', healthRoutes());
  app.route('/', customerRoutes(deps));
  app.route('/', contactRoutes(deps));
  app.route('/', addressRoutes(deps));

  app.onError(errorHandler);
  app.notFound((c) => c.json({ code: 'NOT_FOUND', message: 'Recurso no encontrado.' }, 404));

  return app;
}
