import { Worker } from 'bullmq';
import { getRedis } from '../config/redis';
import { QUEUE_NAMES, getQueue } from '../config/queue';
import type { BudgetSnapshotJobData, NotificationDispatchJobData } from '../config/queue';
import { prisma } from '../config/database';
import { getPeriodBounds } from '../shared/utils/date.util';
import Decimal from 'decimal.js';

export function createBudgetSnapshotWorker() {
  return new Worker<BudgetSnapshotJobData>(
    QUEUE_NAMES.BUDGET_SNAPSHOT,
    async (job) => {
      const { budgetId, userId } = job.data;

      const budget = await prisma.budget.findFirst({
        where: { id: budgetId, userId, deletedAt: null },
      });
      if (!budget) return;

      const { start, end } = getPeriodBounds(
        budget.periodType as 'monthly' | 'weekly' | 'custom',
        budget.startDate,
        budget.endDate ?? undefined,
      );

      const result = await prisma.transaction.aggregate({
        where: {
          userId,
          categoryId: budget.categoryId ?? undefined,
          transactionDate: { gte: start, lte: end },
          deletedAt: null,
          amount: { gt: 0 },
        },
        _sum: { amount: true },
      });

      const spent = new Decimal(result._sum.amount?.toString() ?? '0');
      const remaining = new Decimal(budget.amount.toString()).minus(spent);

      await prisma.budgetSnapshot.create({
        data: {
          budgetId,
          spentAmount: spent.toNumber(),
          remainingAmount: remaining.toNumber(),
          calculatedAt: new Date(),
        },
      });

      // Alert when >90% spent
      const pct = spent.dividedBy(budget.amount).times(100);
      if (pct.gte(90)) {
        const notifRepo = await import('../modules/notifications/notifications.repository');
        const repo = new notifRepo.NotificationsRepository();
        const notification = await repo.create({
          userId,
          type: 'budget_alert',
          title: 'Budget Alert',
          body: `You've used ${pct.toFixed(0)}% of your budget.`,
          channel: 'in_app',
          metadata: { relatedEntityId: budgetId, relatedEntityType: 'budget' },
        });

        const queue = getQueue(QUEUE_NAMES.NOTIFICATION_DISPATCH);
        await queue.add('notify', { notificationId: notification.id } satisfies NotificationDispatchJobData);
      }
    },
    { connection: getRedis(), concurrency: 5 },
  );
}
