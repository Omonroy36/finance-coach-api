import type { FastifyInstance } from 'fastify';
import { budgetsRoutes } from './budgets.routes';

export default async function budgetsModule(app: FastifyInstance) {
  await budgetsRoutes(app);
}
