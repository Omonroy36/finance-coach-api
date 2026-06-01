import { prisma } from '../../config/database';

export class RecommendationsRepository {
  async list(userId: string, opts: { status?: string; limit: number; skip: number }) {
    return prisma.recommendation.findMany({
      where: { userId, ...(opts.status && { status: opts.status }) },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: opts.limit,
      skip: opts.skip,
      include: { relatedGoal: true, relatedInsight: true },
    });
  }

  async findById(id: string, userId: string) {
    return prisma.recommendation.findFirst({
      where: { id, userId },
      include: { relatedGoal: true, relatedInsight: true },
    });
  }

  async updateStatus(id: string, status: string) {
    return prisma.recommendation.update({ where: { id }, data: { status } });
  }
}
