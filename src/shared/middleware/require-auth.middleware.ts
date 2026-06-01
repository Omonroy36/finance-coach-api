import type { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from '../errors/unauthorized.error';

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
    request.userId = request.user.sub;
    request.userEmail = request.user.email;
  } catch {
    const err = new UnauthorizedError('Invalid or expired token');
    void reply.status(err.statusCode).send({ code: err.code, message: err.message });
  }
}
