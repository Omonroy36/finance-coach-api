import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RecommendationsService } from './recommendations.service';
import { requireAuth } from '../../shared/middleware/require-auth.middleware';

export async function recommendationsRoutes(app: FastifyInstance) {
  const svc = new RecommendationsService();

  app.addHook('preHandler', requireAuth);

  app.get('/', async (request) => {
    const q = request.query as { status?: string; limit?: string; skip?: string };
    return svc.list(request.userId, q.status, Math.min(Number(q.limit ?? 20), 100), Number(q.skip ?? 0));
  });

  app.get('/:recommendationId', async (request) => {
    const { recommendationId } = request.params as { recommendationId: string };
    return svc.getRecommendation(request.userId, recommendationId);
  });

  app.patch('/:recommendationId/status', async (request) => {
    const { recommendationId } = request.params as { recommendationId: string };
    const { status } = z.object({ status: z.enum(['accepted', 'dismissed', 'completed']) }).parse(request.body);
    return svc.updateStatus(request.userId, recommendationId, status);
  });
}
