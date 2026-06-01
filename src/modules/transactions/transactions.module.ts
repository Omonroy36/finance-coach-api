import type { FastifyInstance } from 'fastify';
import { transactionsRoutes } from './transactions.routes';

export default async function transactionsModule(app: FastifyInstance) {
  await transactionsRoutes(app);
}
