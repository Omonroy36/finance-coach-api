import type { FastifyInstance } from 'fastify';
import { ChallengesService } from './challenges.service';
import { requireAuth } from '../../shared/middleware/require-auth.middleware';

export async function challengesRoutes(app: FastifyInstance) {
  const svc = new ChallengesService();

  app.addHook('preHandler', requireAuth);

  app.get('/', async () => svc.listAvailable());

  app.get('/active', async (request) => svc.getActive(request.userId));

  app.get('/history', async (request) => {
    const q = request.query as { limit?: string; skip?: string };
    return svc.getHistory(request.userId, Math.min(Number(q.limit ?? 20), 100), Number(q.skip ?? 0));
  });

  app.get('/:challengeId', async (request) => {
    const { challengeId } = request.params as { challengeId: string };
    return svc.getChallenge(challengeId);
  });

  app.post('/:challengeId/join', async (request, reply) => {
    const { challengeId } = request.params as { challengeId: string };
    return reply.status(201).send(await svc.joinChallenge(request.userId, challengeId));
  });

  app.delete('/active/:userChallengeId', async (request, reply) => {
    const { userChallengeId } = request.params as { userChallengeId: string };
    await svc.abandonChallenge(request.userId, userChallengeId);
    return reply.status(204).send();
  });
}
