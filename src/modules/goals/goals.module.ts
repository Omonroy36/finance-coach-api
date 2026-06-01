import type { FastifyInstance } from 'fastify';
import { goalsRoutes } from './goals.routes';

export default async function goalsModule(app: FastifyInstance) {
  await goalsRoutes(app);
}
