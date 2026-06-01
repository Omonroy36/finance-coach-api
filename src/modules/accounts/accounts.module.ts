import type { FastifyInstance } from 'fastify';
import { accountsRoutes } from './accounts.routes';

export default async function accountsModule(app: FastifyInstance) {
  await accountsRoutes(app);
}
