import type { FastifyInstance } from 'fastify';
import { BudgetsService } from './budgets.service';
import { createBudgetSchema, updateBudgetSchema } from './budgets.schemas';
import { requireAuth } from '../../shared/middleware/require-auth.middleware';

export async function budgetsRoutes(app: FastifyInstance) {
  const svc = new BudgetsService();

  app.addHook('preHandler', requireAuth);

  app.get('/', async (request) => svc.listBudgets(request.userId));

  app.post('/', async (request, reply) => {
    const body = createBudgetSchema.parse(request.body);
    const budget = await svc.createBudget(request.userId, body);
    return reply.status(201).send(budget);
  });

  app.get('/summary', async (request) => svc.listBudgets(request.userId));

  app.get('/:budgetId', async (request) => {
    const { budgetId } = request.params as { budgetId: string };
    return svc.getBudget(request.userId, budgetId);
  });

  app.patch('/:budgetId', async (request) => {
    const { budgetId } = request.params as { budgetId: string };
    const body = updateBudgetSchema.parse(request.body);
    return svc.updateBudget(request.userId, budgetId, body);
  });

  app.delete('/:budgetId', async (request, reply) => {
    const { budgetId } = request.params as { budgetId: string };
    await svc.deleteBudget(request.userId, budgetId);
    return reply.status(204).send();
  });

  app.get('/:budgetId/snapshots', async (request) => {
    const { budgetId } = request.params as { budgetId: string };
    const q = request.query as { limit?: string; skip?: string };
    return svc.getSnapshots(request.userId, budgetId, Math.min(Number(q.limit ?? 20), 100), Number(q.skip ?? 0));
  });
}
