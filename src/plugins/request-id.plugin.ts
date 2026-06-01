import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { randomUUID } from 'crypto';

export default fp(async function requestIdPlugin(app: FastifyInstance) {
  app.addHook('onRequest', (request, _reply, done) => {
    if (!request.id) {
      (request as { id: string }).id =
        (request.headers['x-request-id'] as string) ?? randomUUID();
    }
    done();
  });

  app.addHook('onSend', (_request, reply, _payload, done) => {
    void reply.header('X-Request-Id', _request.id);
    done();
  });
});
