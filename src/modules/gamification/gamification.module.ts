import type { FastifyInstance } from 'fastify';
import { gamificationRoutes } from './gamification.routes';

export default async function gamificationModule(app: FastifyInstance) {
  await gamificationRoutes(app);
}
