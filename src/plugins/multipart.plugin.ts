import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import multipart from '@fastify/multipart';

export default fp(async function multipartPlugin(app: FastifyInstance) {
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5 MB
      files: 1,
    },
  });
});
