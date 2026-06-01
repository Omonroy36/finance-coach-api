import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { getRedis } from '../config/redis';
import { config } from '../config';

export default fp(async function rateLimitPlugin(app: FastifyInstance) {
  await app.register(rateLimit, {
    global: true,
    max: config.RATE_LIMIT_GLOBAL,
    timeWindow: '1 minute',
    redis: getRedis(),
    keyGenerator: (request) => {
      // Use userId from JWT if available, else fall back to IP
      return (request as { userId?: string }).userId ?? request.ip;
    },
    errorResponseBuilder: (_request, context) => ({
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Too many requests. Retry after ${String(context.after)}`,
    }),
  });
});
