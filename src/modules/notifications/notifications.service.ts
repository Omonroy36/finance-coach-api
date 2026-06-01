import { NotificationsRepository } from './notifications.repository';
import { NotFoundError } from '../../shared/errors/not-found.error';
import { ForbiddenError } from '../../shared/errors/forbidden.error';

export class NotificationsService {
  private repo = new NotificationsRepository();

  async list(userId: string, status?: string, channel?: string, limit = 20, skip = 0) {
    return this.repo.list(userId, { status, channel, limit, skip });
  }

  async getUnreadCount(userId: string) {
    const count = await this.repo.countUnread(userId);
    return { count };
  }

  async getNotification(userId: string, notificationId: string) {
    const n = await this.repo.findById(notificationId, userId);
    if (!n) throw new NotFoundError('Notification', notificationId);
    return n;
  }

  async markRead(userId: string, notificationId: string) {
    const n = await this.repo.findById(notificationId, userId);
    if (!n) throw new NotFoundError('Notification', notificationId);
    if (n.userId !== userId) throw new ForbiddenError();
    return this.repo.markRead(notificationId);
  }

  async markAllRead(userId: string) {
    await this.repo.markAllRead(userId);
  }

  async delete(userId: string, notificationId: string) {
    const n = await this.repo.findById(notificationId, userId);
    if (!n) throw new NotFoundError('Notification', notificationId);
    if (n.userId !== userId) throw new ForbiddenError();
    await this.repo.delete(notificationId);
  }
}
