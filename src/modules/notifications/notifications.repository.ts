import { prisma } from '../../config/database';

export class NotificationsRepository {
  async list(userId: string, opts: { status?: string; channel?: string; limit: number; skip: number }) {
    return prisma.notification.findMany({
      where: {
        userId,
        ...(opts.status && { status: opts.status }),
        ...(opts.channel && { channel: opts.channel }),
      },
      orderBy: { createdAt: 'desc' },
      take: opts.limit,
      skip: opts.skip,
    });
  }

  async countUnread(userId: string) {
    return prisma.notification.count({
      where: { userId, channel: 'in_app', status: { in: ['pending', 'sent'] } },
    });
  }

  async findById(id: string, userId: string) {
    return prisma.notification.findFirst({ where: { id, userId } });
  }

  async markRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { status: 'read', readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, channel: 'in_app', status: { in: ['pending', 'sent'] } },
      data: { status: 'read', readAt: new Date() },
    });
  }

  async delete(id: string) {
    return prisma.notification.delete({ where: { id } });
  }

  async create(data: {
    userId: string;
    type: string;
    title: string;
    body: string;
    channel: string;
    scheduledFor?: Date;
    metadata?: object;
  }) {
    return prisma.notification.create({
      data: { ...data, metadata: data.metadata ?? {} },
    });
  }
}
