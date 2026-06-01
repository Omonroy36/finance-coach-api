import type { FastifyInstance } from 'fastify';
import { insightsRoutes } from './insights.routes';

export default async function insightsModule(app: FastifyInstance) {
  await insightsRoutes(app);
}
