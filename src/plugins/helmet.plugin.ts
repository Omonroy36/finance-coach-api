import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';

export default fp(async function helmetPlugin(app: FastifyInstance) {
  await app.register(helmet, {
    contentSecurityPolicy: false, // managed separately for API
  });
});
