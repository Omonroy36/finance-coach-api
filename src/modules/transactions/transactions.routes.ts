import type { FastifyInstance } from 'fastify';
import { TransactionsService } from './transactions.service';
import { createTransactionSchema, updateTransactionSchema, listTransactionsSchema } from './transactions.schemas';
import { requireAuth } from '../../shared/middleware/require-auth.middleware';

export async function transactionsRoutes(app: FastifyInstance) {
  const svc = new TransactionsService();

  app.addHook('preHandler', requireAuth);

  app.get('/', async (request) => {
    const query = listTransactionsSchema.parse(request.query);
    return svc.list(request.userId, query);
  });

  app.post('/', async (request, reply) => {
    const body = createTransactionSchema.parse(request.body);
    const tx = await svc.createTransaction(request.userId, body);
    return reply.status(201).send(tx);
  });

  app.get('/summary', async (request) => {
    const query = request.query as { period?: string };
    const period = (['week', 'month', 'quarter', 'year'].includes(query.period ?? '')
      ? query.period
      : 'month') as 'week' | 'month' | 'quarter' | 'year';
    return svc.getSummary(request.userId, period);
  });

  app.get('/recurring', async (request) => {
    return svc.getRecurring(request.userId);
  });

  app.get('/:transactionId', async (request) => {
    const { transactionId } = request.params as { transactionId: string };
    return svc.getTransaction(request.userId, transactionId);
  });

  app.patch('/:transactionId', async (request) => {
    const { transactionId } = request.params as { transactionId: string };
    const body = updateTransactionSchema.parse(request.body);
    return svc.updateTransaction(request.userId, transactionId, body);
  });

  app.delete('/:transactionId', async (request, reply) => {
    const { transactionId } = request.params as { transactionId: string };
    await svc.deleteTransaction(request.userId, transactionId);
    return reply.status(204).send();
  });
}
