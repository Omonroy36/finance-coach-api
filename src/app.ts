import Fastify from 'fastify';
import fp from 'fastify-plugin';

// Plugins
import errorHandlerPlugin from './plugins/error-handler.plugin';
import requestIdPlugin from './plugins/request-id.plugin';
import corsPlugin from './plugins/cors.plugin';
import helmetPlugin from './plugins/helmet.plugin';
import rateLimitPlugin from './plugins/rate-limit.plugin';
import authPlugin from './plugins/auth.plugin';
import swaggerPlugin from './plugins/swagger.plugin';
import multipartPlugin from './plugins/multipart.plugin';

// Modules
import authModule from './modules/auth/auth.module';
import usersModule from './modules/users/users.module';
import accountsModule from './modules/accounts/accounts.module';
import transactionsModule from './modules/transactions/transactions.module';
import budgetsModule from './modules/budgets/budgets.module';
import goalsModule from './modules/goals/goals.module';
import insightsModule from './modules/insights/insights.module';
import recommendationsModule from './modules/recommendations/recommendations.module';
import gamificationModule from './modules/gamification/gamification.module';
import challengesModule from './modules/challenges/challenges.module';
import notificationsModule from './modules/notifications/notifications.module';
import forecastingModule from './modules/forecasting/forecasting.module';

// Map pino numeric levels -> Google Cloud Logging severity strings.
// Cloud Run reads the `severity` field from each JSON log line to colour/filter
// logs in Cloud Logging. See: https://cloud.google.com/logging/docs/agent/logging/configuration#special-fields
const PINO_LEVEL_TO_GCP_SEVERITY: Record<string, string> = {
  trace: 'DEBUG',
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
  fatal: 'CRITICAL',
};

const isProduction = process.env['NODE_ENV'] === 'production';

export function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info',
      // Development: human-readable, colourised output via pino-pretty.
      // Production: structured single-line JSON to stdout (Cloud Run captures
      // stdout/stderr automatically — no log files, no transport needed).
      transport: !isProduction
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
      // In production, emit GCP-friendly fields so Cloud Logging classifies
      // entries correctly: `severity` instead of a numeric level, and `message`
      // as the primary text key.
      ...(isProduction
        ? {
            messageKey: 'message',
            formatters: {
              level(label: string) {
                return { severity: PINO_LEVEL_TO_GCP_SEVERITY[label] ?? 'DEFAULT' };
              },
            },
          }
        : {}),
    },
    trustProxy: true,
    requestIdHeader: 'x-request-id',
  });

  // Core plugins (order matters)
  void app.register(fp(requestIdPlugin));
  void app.register(fp(errorHandlerPlugin));
  void app.register(fp(helmetPlugin));
  void app.register(fp(corsPlugin));
  void app.register(fp(authPlugin));
  void app.register(fp(rateLimitPlugin));
  void app.register(fp(swaggerPlugin));
  void app.register(fp(multipartPlugin));

  // Health check — lightweight liveness probe for Cloud Run / load balancers.
  // Intentionally does NOT touch the DB or Redis so it stays fast and cannot be
  // brought down by a slow dependency. `logLevel: 'silent'` keeps probe spam out
  // of the logs.
  app.get('/health', { logLevel: 'silent' }, async () => ({ status: 'ok' }));

  // API v1 prefix
  void app.register(
    async (v1) => {
      void v1.register(authModule, { prefix: '/auth' });
      void v1.register(usersModule, { prefix: '/users' });
      void v1.register(accountsModule, { prefix: '/accounts' });
      void v1.register(transactionsModule, { prefix: '/transactions' });
      void v1.register(budgetsModule, { prefix: '/budgets' });
      void v1.register(goalsModule, { prefix: '/goals' });
      void v1.register(insightsModule, { prefix: '/insights' });
      void v1.register(recommendationsModule, { prefix: '/recommendations' });
      void v1.register(gamificationModule, { prefix: '/gamification' });
      void v1.register(challengesModule, { prefix: '/challenges' });
      void v1.register(notificationsModule, { prefix: '/notifications' });
      void v1.register(forecastingModule, { prefix: '/forecasting' });
    },
    { prefix: '/api/v1' },
  );

  return app;
}
