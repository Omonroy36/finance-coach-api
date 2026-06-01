import type { FastifyInstance } from 'fastify';
import { UsersService } from './users.service';
import { updateProfileSchema } from './users.schemas';
import { requireAuth } from '../../shared/middleware/require-auth.middleware';

export async function usersRoutes(app: FastifyInstance) {
  const svc = new UsersService();

  app.addHook('preHandler', requireAuth);

  app.get('/me', async (request) => {
    return svc.getMe(request.userId);
  });

  app.patch('/me', async (request) => {
    const body = updateProfileSchema.parse(request.body);
    return svc.updateProfile(request.userId, body);
  });

  app.delete('/me', async (request, reply) => {
    await svc.deleteAccount(request.userId);
    return reply.status(204).send();
  });

  app.get('/me/score', async (request) => {
    return svc.getLatestScore(request.userId);
  });

  app.get('/me/score/history', async (request) => {
    const query = request.query as { limit?: string; skip?: string };
    const limit = Math.min(Number(query.limit ?? 20), 100);
    const skip = Number(query.skip ?? 0);
    return svc.getScoreHistory(request.userId, limit, skip);
  });
}
