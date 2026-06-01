import { prisma } from '../../config/database';
import { DateTime } from 'luxon';

export class ChallengesRepository {
  async listAvailable() {
    return prisma.challenge.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.challenge.findUnique({ where: { id } });
  }

  async listUserChallenges(userId: string, status?: string) {
    return prisma.userChallenge.findMany({
      where: { userId, ...(status && { status }) },
      include: { challenge: true },
      orderBy: { startedAt: 'desc' },
    });
  }

  async findUserChallenge(id: string, userId: string) {
    return prisma.userChallenge.findFirst({ where: { id, userId }, include: { challenge: true } });
  }

  async join(userId: string, challengeId: string, durationDays: number) {
    const now = DateTime.utc();
    return prisma.userChallenge.create({
      data: {
        userId,
        challengeId,
        expiresAt: now.plus({ days: durationDays }).toJSDate(),
        progress: {},
      },
    });
  }

  async abandon(id: string) {
    return prisma.userChallenge.update({ where: { id }, data: { status: 'abandoned' } });
  }

  async getHistory(userId: string, limit: number, skip: number) {
    return prisma.userChallenge.findMany({
      where: { userId, status: { in: ['completed', 'failed', 'abandoned'] } },
      include: { challenge: true },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip,
    });
  }
}
