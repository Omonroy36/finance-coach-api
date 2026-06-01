import type { FastifyInstance } from 'fastify';
import { NotificationsService } from './notifications.service';
import { requireAuth } from '../../shared/middleware/require-auth.middleware';

export async function notificationsRoutes(app: FastifyInstance) {
  const svc = new NotificationsService();

  app.addHook('preHandler', requireAuth);

  app.get('/', async (request) => {
    const q = request.query as { status?: string; channel?: string; limit?: string; skip?: string };
    return svc.list(request.userId, q.status, q.channel, Math.min(Number(q.limit ?? 20), 100), Number(q.skip ?? 0));
  });

  app.get('/unread-count', async (request) => svc.getUnreadCount(request.userId));

  app.get('/:notificationId', async (request) => {
    const { notificationId } = request.params as { notificationId: string };
    return svc.getNotification(request.userId, notificationId);
  });

  app.patch('/:notificationId/read', async (request) => {
    const { notificationId } = request.params as { notificationId: string };
    return svc.markRead(request.userId, notificationId);
  });

  app.post('/read-all', async (request, reply) => {
    await svc.markAllRead(request.userId);
    return reply.status(204).send();
  });

  app.delete('/:notificationId', async (request, reply) => {
    const { notificationId } = request.params as { notificationId: string };
    await svc.delete(request.userId, notificationId);
    return reply.status(204).send();
  });
}
