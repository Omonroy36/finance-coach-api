import type { FastifyInstance } from 'fastify';
import { notificationsRoutes } from './notifications.routes';

export default async function notificationsModule(app: FastifyInstance) {
  await notificationsRoutes(app);
}
