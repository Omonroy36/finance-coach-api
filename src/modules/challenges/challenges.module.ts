import type { FastifyInstance } from 'fastify';
import { challengesRoutes } from './challenges.routes';

export default async function challengesModule(app: FastifyInstance) {
  await challengesRoutes(app);
}
