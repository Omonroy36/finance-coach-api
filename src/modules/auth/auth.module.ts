import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.routes';

export default async function authModule(app: FastifyInstance) {
  await authRoutes(app);
}
