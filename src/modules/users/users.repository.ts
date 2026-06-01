import { prisma } from '../../config/database';

export class UsersRepository {
  async findById(userId: string) {
    return prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { profile: true, userXp: true },
    });
  }

  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      preferredCurrency?: string;
      locale?: string;
      avatarUrl?: string;
    },
  ) {
    return prisma.userProfile.update({
      where: { userId },
      data,
    });
  }

  async softDelete(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });
  }

  async getLatestScore(userId: string) {
    return prisma.financialScoreSnapshot.findFirst({
      where: { userId },
      orderBy: { calculatedAt: 'desc' },
    });
  }

  async getScoreHistory(userId: string, take: number, skip = 0) {
    return prisma.financialScoreSnapshot.findMany({
      where: { userId },
      orderBy: { calculatedAt: 'desc' },
      take,
      skip,
    });
  }
}
