import { prisma } from '../../config/database';

export class GamificationRepository {
  async getUserXp(userId: string) {
    return prisma.userXP.findUnique({ where: { userId } });
  }

  async getStreaks(userId: string) {
    return prisma.streak.findMany({ where: { userId }, orderBy: { type: 'asc' } });
  }

  async getStreak(userId: string, type: string) {
    return prisma.streak.findUnique({ where: { userId_type: { userId, type } } });
  }

  async getAllAchievements() {
    return prisma.achievement.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async getUserAchievements(userId: string) {
    return prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    });
  }

  async getLeaderboard(limit: number) {
    return prisma.financialScoreSnapshot.findMany({
      distinct: ['userId'],
      orderBy: { score: 'desc' },
      take: limit,
      select: { userId: true, score: true, calculatedAt: true },
    });
  }

  async upsertStreak(userId: string, type: string, data: { currentCount: number; bestCount: number; lastCompletedAt: Date }) {
    return prisma.streak.upsert({
      where: { userId_type: { userId, type } },
      create: { userId, type, ...data },
      update: data,
    });
  }

  async awardXp(userId: string, xp: number) {
    return prisma.userXP.upsert({
      where: { userId },
      create: { userId, totalXp: xp, currentLevel: 1 },
      update: { totalXp: { increment: xp } },
    });
  }
}
