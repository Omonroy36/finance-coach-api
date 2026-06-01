import { prisma } from '../../config/database';

export class InsightsRepository {
  async list(userId: string, opts: { type?: string; severity?: string; isRead?: boolean; limit: number; skip: number }) {
    return prisma.insight.findMany({
      where: {
        userId,
        ...(opts.type && { type: opts.type }),
        ...(opts.severity && { severity: opts.severity }),
        ...(opts.isRead !== undefined && { isRead: opts.isRead }),
      },
      orderBy: { createdAt: 'desc' },
      take: opts.limit,
      skip: opts.skip,
    });
  }

  async findById(id: string, userId: string) {
    return prisma.insight.findFirst({ where: { id, userId } });
  }

  async markRead(id: string) {
    return prisma.insight.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead(userId: string) {
    return prisma.insight.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }

  async delete(id: string) {
    return prisma.insight.delete({ where: { id } });
  }

  async create(data: {
    userId: string;
    type: string;
    title: string;
    description: string;
    severity: string;
    metadataJson: object;
    expiresAt?: Date;
  }) {
    return prisma.insight.create({ data: { ...data, metadataJson: data.metadataJson } });
  }
}
