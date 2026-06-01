import type { FastifyInstance } from 'fastify';
import { recommendationsRoutes } from './recommendations.routes';

export default async function recommendationsModule(app: FastifyInstance) {
  await recommendationsRoutes(app);
}
