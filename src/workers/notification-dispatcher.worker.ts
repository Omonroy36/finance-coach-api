import { Worker } from 'bullmq';
import { getRedis } from '../config/redis';
import { QUEUE_NAMES } from '../config/queue';
import type { NotificationDispatchJobData } from '../config/queue';
import { prisma } from '../config/database';

export function createNotificationDispatcherWorker() {
  return new Worker<NotificationDispatchJobData>(
    QUEUE_NAMES.NOTIFICATION_DISPATCH,
    async (job) => {
      const { notificationId } = job.data;

      const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
      if (!notification || notification.status !== 'pending') return;

      try {
        switch (notification.channel) {
          case 'in_app':
            // In-app: just mark as sent; client polls or uses WebSocket
            await prisma.notification.update({
              where: { id: notificationId },
              data: { status: 'sent', sentAt: new Date() },
            });
            break;

          case 'push':
            // TODO: integrate Firebase FCM / APNs
            // const fcm = getFcmClient();
            // await fcm.send({ token: userDeviceToken, notification: { title, body } });
            await prisma.notification.update({
              where: { id: notificationId },
              data: { status: 'sent', sentAt: new Date() },
            });
            break;

          case 'email':
            // TODO: integrate Resend API
            // await resend.emails.send({ from, to, subject: title, html: body });
            await prisma.notification.update({
              where: { id: notificationId },
              data: { status: 'sent', sentAt: new Date() },
            });
            break;

          default:
            throw new Error(`Unknown notification channel: ${notification.channel}`);
        }
      } catch (err) {
        await prisma.notification.update({
          where: { id: notificationId },
          data: { status: 'failed' },
        });
        throw err;
      }
    },
    { connection: getRedis(), concurrency: 10 },
  );
}
