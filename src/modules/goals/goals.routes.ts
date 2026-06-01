import type { FastifyInstance } from 'fastify';
import { GoalsService } from './goals.service';
import { createGoalSchema, updateGoalSchema, addContributionSchema } from './goals.schemas';
import { requireAuth } from '../../shared/middleware/require-auth.middleware';

export async function goalsRoutes(app: FastifyInstance) {
  const svc = new GoalsService();

  app.addHook('preHandler', requireAuth);

  app.get('/', async (request) => {
    const { status } = request.query as { status?: string };
    return svc.listGoals(request.userId, status);
  });

  app.post('/', async (request, reply) => {
    const body = createGoalSchema.parse(request.body);
    return reply.status(201).send(await svc.createGoal(request.userId, body));
  });

  app.get('/:goalId', async (request) => {
    const { goalId } = request.params as { goalId: string };
    return svc.getGoal(request.userId, goalId);
  });

  app.patch('/:goalId', async (request) => {
    const { goalId } = request.params as { goalId: string };
    const body = updateGoalSchema.parse(request.body);
    return svc.updateGoal(request.userId, goalId, body);
  });

  app.delete('/:goalId', async (request, reply) => {
    const { goalId } = request.params as { goalId: string };
    await svc.deleteGoal(request.userId, goalId);
    return reply.status(204).send();
  });

  app.post('/:goalId/contributions', async (request, reply) => {
    const { goalId } = request.params as { goalId: string };
    const body = addContributionSchema.parse(request.body);
    return reply.status(201).send(await svc.addContribution(request.userId, goalId, body));
  });

  app.get('/:goalId/contributions', async (request) => {
    const { goalId } = request.params as { goalId: string };
    const q = request.query as { limit?: string; skip?: string };
    return svc.getContributions(request.userId, goalId, Math.min(Number(q.limit ?? 20), 100), Number(q.skip ?? 0));
  });

  app.get('/:goalId/snapshots', async (request) => {
    const { goalId } = request.params as { goalId: string };
    const q = request.query as { limit?: string; skip?: string };
    return svc.getSnapshots(request.userId, goalId, Math.min(Number(q.limit ?? 20), 100), Number(q.skip ?? 0));
  });
}
