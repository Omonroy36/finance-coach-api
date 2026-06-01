import type { FastifyInstance, FastifyError } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors/app.error';

export default fp(async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | AppError | ZodError | Error, request, reply) => {
    const requestId = request.id;
    const isProd = process.env['NODE_ENV'] === 'production';

    if (error instanceof AppError) {
      app.log.warn({ requestId, code: error.code, err: error }, error.message);
      return reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      });
    }

    if (error instanceof ZodError) {
      app.log.debug({ requestId, err: error }, 'Validation error');
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.flatten().fieldErrors,
      });
    }

    // Prisma unique constraint
    if ('code' in error && error.code === 'P2002') {
      return reply.status(409).send({
        code: 'CONFLICT',
        message: 'Resource already exists',
      });
    }

    // Prisma not found
    if ('code' in error && error.code === 'P2025') {
      return reply.status(404).send({
        code: 'NOT_FOUND',
        message: 'Resource not found',
      });
    }

    // Fastify validation errors (JSON schema)
    if ('validation' in error && error.validation) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.validation,
      });
    }

    app.log.error({ requestId, err: error }, 'Unhandled error');

    return reply.status(500).send({
      code: 'INTERNAL_ERROR',
      message: isProd ? 'An internal error occurred' : (error.message ?? 'Unknown error'),
      requestId,
    });
  });
});
