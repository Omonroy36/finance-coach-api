import { prisma } from '../../config/database';

export class BudgetsRepository {
  async listActive(userId: string) {
    return prisma.budget.findMany({
      where: { userId, isActive: true, deletedAt: null },
      include: {
        category: true,
        snapshots: { orderBy: { calculatedAt: 'desc' }, take: 1 },
      },
    });
  }

  async findById(id: string, userId: string) {
    return prisma.budget.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        category: true,
        snapshots: { orderBy: { calculatedAt: 'desc' }, take: 1 },
      },
    });
  }

  async create(userId: string, data: {
    categoryId?: string;
    amount: number;
    periodType: string;
    startDate: string;
    endDate?: string;
  }) {
    return prisma.budget.create({
      data: {
        userId,
        categoryId: data.categoryId,
        amount: data.amount,
        periodType: data.periodType,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }

  async update(id: string, data: Partial<{ amount: number; periodType: string; startDate: Date; endDate: Date; isActive: boolean }>) {
    return prisma.budget.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return prisma.budget.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }

  async getSnapshots(budgetId: string, take: number, skip = 0) {
    return prisma.budgetSnapshot.findMany({
      where: { budgetId },
      orderBy: { calculatedAt: 'desc' },
      take,
      skip,
    });
  }

  async createSnapshot(budgetId: string, spentAmount: number, remainingAmount: number) {
    return prisma.budgetSnapshot.create({
      data: { budgetId, spentAmount, remainingAmount, calculatedAt: new Date() },
    });
  }
}
