import type { FastifyInstance } from 'fastify';
import { AuthService } from './auth.service';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schemas';
import { requireAuth } from '../../shared/middleware/require-auth.middleware';

export async function authRoutes(app: FastifyInstance) {
  const svc = new AuthService(app);

  app.post('/register', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const result = await svc.register(body);
    return reply.status(201).send(result);
  });

  app.post('/login', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const result = await svc.login(body);
    return reply.send(result);
  });

  app.post('/refresh', async (request, reply) => {
    const { refreshToken } = refreshTokenSchema.parse(request.body);
    const tokens = await svc.refresh(refreshToken);
    return reply.send(tokens);
  });

  app.post('/logout', { preHandler: requireAuth }, async (request, reply) => {
    const { refreshToken } = refreshTokenSchema.parse(request.body);
    await svc.logout(refreshToken);
    return reply.status(204).send();
  });

  app.post('/logout-all', { preHandler: requireAuth }, async (request, reply) => {
    await svc.logoutAll(request.userId);
    return reply.status(204).send();
  });

  app.post('/forgot-password', { config: { rateLimit: { max: 3, timeWindow: '15 minutes' } } }, async (request, reply) => {
    forgotPasswordSchema.parse(request.body);
    // TODO: integrate email service (Resend) and store reset token
    return reply.send({ message: 'If that email exists, a reset link has been sent.' });
  });

  app.post('/reset-password', async (request, reply) => {
    resetPasswordSchema.parse(request.body);
    // TODO: validate reset token and update password
    return reply.send({ message: 'Password reset successfully.' });
  });

  app.get('/sessions', { preHandler: requireAuth }, async (request) => {
    const sessions = await svc.listSessions(request.userId);
    return sessions.map((s) => ({
      id: s.id,
      deviceInfo: s.deviceInfo,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));
  });

  app.delete('/sessions/:sessionId', { preHandler: requireAuth }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    await svc.revokeSession(request.userId, sessionId);
    return reply.status(204).send();
  });
}
