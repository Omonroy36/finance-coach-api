import { Worker } from 'bullmq';
import { redisConnectionOptions } from '../config/redis';
import { QUEUE_NAMES, getQueue } from '../config/queue';
import type { InsightEngineJobData, RecommendationJobData } from '../config/queue';
import { prisma } from '../config/database';
import Decimal from 'decimal.js';
import { DateTime } from 'luxon';
import { config } from '../config';

export function createInsightEngineWorker() {
  return new Worker<InsightEngineJobData>(
    QUEUE_NAMES.INSIGHT_ENGINE,
    async (job) => {
      const { userId } = job.data;
      const now = DateTime.utc();
      const thisMonthStart = now.startOf('month').toJSDate();
      const thisMonthEnd = now.endOf('month').toJSDate();
      const lastMonthStart = now.minus({ months: 1 }).startOf('month').toJSDate();
      const lastMonthEnd = now.minus({ months: 1 }).endOf('month').toJSDate();

      // Rule 1: SpendingSpike — current month vs last 3-month average
      const [currentSpend, prev3MonthSpend] = await Promise.all([
        prisma.transaction.aggregate({
          where: { userId, deletedAt: null, transactionDate: { gte: thisMonthStart, lte: thisMonthEnd }, amount: { gt: 0 } },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: {
            userId,
            deletedAt: null,
            transactionDate: { gte: now.minus({ months: 3 }).startOf('month').toJSDate(), lt: thisMonthStart },
            amount: { gt: 0 },
          },
          _sum: { amount: true },
        }),
      ]);

      const currentTotal = new Decimal(currentSpend._sum.amount?.toString() ?? '0');
      const prev3Avg = new Decimal(prev3MonthSpend._sum.amount?.toString() ?? '0').dividedBy(3);

      if (prev3Avg.gt(0) && currentTotal.dividedBy(prev3Avg).gt(1.5)) {
        const changePercent = currentTotal.minus(prev3Avg).dividedBy(prev3Avg).times(100).toFixed(0);
        await prisma.insight.create({
          data: {
            userId,
            type: 'spending_spike',
            title: 'Spending Spike Detected',
            description: `Your spending this month is ${changePercent}% above your 3-month average.`,
            severity: 'warning',
            metadataJson: { changePercent, comparedPeriod: '3-month average' },
            expiresAt: now.endOf('month').toJSDate(),
          },
        });
      }

      // Rule 2: Budget Breach
      const breachedBudgets = await prisma.budgetSnapshot.findMany({
        where: {
          calculatedAt: { gte: lastMonthStart },
          remainingAmount: { lt: 0 },
          budget: { userId, deletedAt: null },
        },
        include: { budget: { include: { category: true } } },
        distinct: ['budgetId'],
      });

      for (const snap of breachedBudgets) {
        const existing = await prisma.insight.findFirst({
          where: {
            userId,
            type: 'budget_breach',
            metadataJson: { path: ['affectedBudgetId'], equals: snap.budgetId },
            createdAt: { gte: thisMonthStart },
          },
        });
        if (!existing) {
          await prisma.insight.create({
            data: {
              userId,
              type: 'budget_breach',
              title: 'Budget Exceeded',
              description: `You exceeded your ${snap.budget.category?.name ?? 'budget'} budget.`,
              severity: 'critical',
              metadataJson: { affectedBudgetId: snap.budgetId },
            },
          });
        }
      }

      // Enqueue recommendation engine
      const recQueue = getQueue(QUEUE_NAMES.RECOMMENDATION);
      await recQueue.add('recommend', { userId } satisfies RecommendationJobData);
    },
    { connection: redisConnectionOptions, prefix: config.REDIS_PREFIX, concurrency: 3 },
  );
}
