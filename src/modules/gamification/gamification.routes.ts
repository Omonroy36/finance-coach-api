import type { FastifyInstance } from 'fastify';
import { GamificationService } from './gamification.service';
import { requireAuth } from '../../shared/middleware/require-auth.middleware';

export async function gamificationRoutes(app: FastifyInstance) {
  const svc = new GamificationService();

  app.addHook('preHandler', requireAuth);

  app.get('/xp', async (request) => svc.getXp(request.userId));

  app.get('/streaks', async (request) => svc.getStreaks(request.userId));

  app.get('/streaks/:type', async (request) => {
    const { type } = request.params as { type: string };
    return svc.getStreak(request.userId, type);
  });

  app.get('/achievements', async (request) => svc.getAchievements(request.userId));

  app.get('/achievements/unlocked', async (request) => svc.getUnlockedAchievements(request.userId));

  app.get('/leaderboard', async (request) => {
    const { limit } = request.query as { limit?: string };
    return svc.getLeaderboard(Math.min(Number(limit ?? 10), 50));
  });
}
