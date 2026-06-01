import type { FastifyInstance } from 'fastify';
import { ForecastingService } from './forecasting.service';
import { requireAuth } from '../../shared/middleware/require-auth.middleware';

export async function forecastingRoutes(app: FastifyInstance) {
  const svc = new ForecastingService();

  app.addHook('preHandler', requireAuth);

  app.get('/cashflow', async (request) => {
    const { months } = request.query as { months?: string };
    return svc.getForecasts(request.userId, Math.min(Number(months ?? 3), 12));
  });

  app.get('/cashflow/:period', async (request) => {
    const { period } = request.params as { period: string };
    return svc.getForecastByPeriod(request.userId, period);
  });

  app.post('/cashflow/refresh', async (request) => {
    return svc.refreshForecasts(request.userId);
  });

  app.get('/goal/:goalId/projection', async (request) => {
    const { goalId } = request.params as { goalId: string };
    return svc.getGoalProjection(request.userId, goalId);
  });

  app.get('/runway', async (request) => {
    return svc.getRunway(request.userId);
  });
}
