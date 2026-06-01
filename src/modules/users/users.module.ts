import type { FastifyInstance } from 'fastify';
import { usersRoutes } from './users.routes';

export default async function usersModule(app: FastifyInstance) {
  await usersRoutes(app);
}
