import { prisma } from '../../config/database';

export class GoalsRepository {
  async list(userId: string, status?: string) {
    return prisma.goal.findMany({
      where: { userId, deletedAt: null, ...(status && { status }) },
      include: { snapshots: { orderBy: { calculatedAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, userId: string) {
    return prisma.goal.findFirst({
      where: { id, userId, deletedAt: null },
      include: { snapshots: { orderBy: { calculatedAt: 'desc' }, take: 1 } },
    });
  }

  async create(userId: string, data: { type: string; title: string; targetAmount: number; targetDate?: string }) {
    return prisma.goal.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        targetAmount: data.targetAmount,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      },
    });
  }

  async update(id: string, data: Partial<{ title: string; targetAmount: number; targetDate: Date; status: string; currentAmount: number }>) {
    return prisma.goal.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return prisma.goal.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async addContribution(goalId: string, amount: number, notes?: string, contributedAt?: string) {
    return prisma.$transaction(async (tx) => {
      const contribution = await tx.goalContribution.create({
        data: {
          goalId,
          amount,
          notes,
          contributedAt: contributedAt ? new Date(contributedAt) : new Date(),
        },
      });

      await tx.goal.update({
        where: { id: goalId },
        data: { currentAmount: { increment: amount } },
      });

      return contribution;
    });
  }

  async getContributions(goalId: string, take: number, skip = 0) {
    return prisma.goalContribution.findMany({
      where: { goalId },
      orderBy: { contributedAt: 'desc' },
      take,
      skip,
    });
  }

  async getSnapshots(goalId: string, take: number, skip = 0) {
    return prisma.goalSnapshot.findMany({
      where: { goalId },
      orderBy: { calculatedAt: 'desc' },
      take,
      skip,
    });
  }
}
