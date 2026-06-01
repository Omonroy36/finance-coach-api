import type { FastifyInstance } from 'fastify';
import { InsightsService } from './insights.service';
import { requireAuth } from '../../shared/middleware/require-auth.middleware';

export async function insightsRoutes(app: FastifyInstance) {
  const svc = new InsightsService();

  app.addHook('preHandler', requireAuth);

  app.get('/', async (request) => {
    const q = request.query as { type?: string; severity?: string; isRead?: string; limit?: string; skip?: string };
    return svc.list(request.userId, {
      type: q.type,
      severity: q.severity,
      isRead: q.isRead,
      limit: Math.min(Number(q.limit ?? 20), 100),
      skip: Number(q.skip ?? 0),
    });
  });

  app.get('/:insightId', async (request) => {
    const { insightId } = request.params as { insightId: string };
    return svc.getInsight(request.userId, insightId);
  });

  app.patch('/:insightId/read', async (request) => {
    const { insightId } = request.params as { insightId: string };
    return svc.markRead(request.userId, insightId);
  });

  app.post('/read-all', async (request, reply) => {
    await svc.markAllRead(request.userId);
    return reply.status(204).send();
  });

  app.delete('/:insightId', async (request, reply) => {
    const { insightId } = request.params as { insightId: string };
    await svc.dismiss(request.userId, insightId);
    return reply.status(204).send();
  });
}
