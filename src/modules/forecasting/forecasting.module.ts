import type { FastifyInstance } from 'fastify';
import { forecastingRoutes } from './forecasting.routes';

export default async function forecastingModule(app: FastifyInstance) {
  await forecastingRoutes(app);
}
