import type { FastifyInstance } from 'fastify';
import { AccountsService } from './accounts.service';
import {
  createAccountSchema,
  updateAccountSchema,
  plaidExchangeSchema,
  createCategorySchema,
  updateCategorySchema,
} from './accounts.schemas';
import { requireAuth } from '../../shared/middleware/require-auth.middleware';

export async function accountsRoutes(app: FastifyInstance) {
  const svc = new AccountsService();

  app.addHook('preHandler', requireAuth);

  // Accounts
  app.get('/', async (request) => svc.listAccounts(request.userId));

  app.post('/', async (request, reply) => {
    const body = createAccountSchema.parse(request.body);
    const account = await svc.createAccount(request.userId, body);
    return reply.status(201).send(account);
  });

  app.get('/:accountId', async (request) => {
    const { accountId } = request.params as { accountId: string };
    return svc.getAccount(request.userId, accountId);
  });

  app.patch('/:accountId', async (request) => {
    const { accountId } = request.params as { accountId: string };
    const body = updateAccountSchema.parse(request.body);
    return svc.updateAccount(request.userId, accountId, body);
  });

  app.delete('/:accountId', async (request, reply) => {
    const { accountId } = request.params as { accountId: string };
    await svc.deleteAccount(request.userId, accountId);
    return reply.status(204).send();
  });

  // Integrations
  app.get('/integrations', async (request) => svc.listConnections(request.userId));

  app.post('/integrations/plaid/exchange', async (request, reply) => {
    const { publicToken, institutionId, institutionName } = plaidExchangeSchema.parse(request.body);
    const conn = await svc.exchangePlaidToken(request.userId, publicToken, { institutionId, institutionName });
    return reply.status(201).send(conn);
  });

  app.delete('/integrations/:connectionId', async (request, reply) => {
    const { connectionId } = request.params as { connectionId: string };
    await svc.deleteConnection(request.userId, connectionId);
    return reply.status(204).send();
  });

  app.post('/integrations/:connectionId/sync', async (request) => {
    const { connectionId } = request.params as { connectionId: string };
    return svc.triggerSync(request.userId, connectionId);
  });

  // Categories
  app.get('/categories', async (request) => svc.listCategories(request.userId));

  app.post('/categories', async (request, reply) => {
    const body = createCategorySchema.parse(request.body);
    const cat = await svc.createCategory(request.userId, body);
    return reply.status(201).send(cat);
  });

  app.patch('/categories/:categoryId', async (request) => {
    const { categoryId } = request.params as { categoryId: string };
    const body = updateCategorySchema.parse(request.body);
    return svc.updateCategory(request.userId, categoryId, body);
  });

  app.delete('/categories/:categoryId', async (request, reply) => {
    const { categoryId } = request.params as { categoryId: string };
    await svc.deleteCategory(request.userId, categoryId);
    return reply.status(204).send();
  });
}
