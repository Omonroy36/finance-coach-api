import { Worker } from 'bullmq';
import { getRedis } from '../config/redis';
import { QUEUE_NAMES } from '../config/queue';
import type { GoalSnapshotJobData } from '../config/queue';
import { prisma } from '../config/database';
import Decimal from 'decimal.js';
import { DateTime } from 'luxon';

export function createGoalSnapshotWorker() {
  return new Worker<GoalSnapshotJobData>(
    QUEUE_NAMES.GOAL_SNAPSHOT,
    async (job) => {
      const { goalId, userId } = job.data;

      const goal = await prisma.goal.findFirst({ where: { id: goalId, userId, deletedAt: null } });
      if (!goal) return;

      const current = new Decimal(goal.currentAmount.toString());
      const target = new Decimal(goal.targetAmount.toString());

      const progressPercent = target.isZero() ? new Decimal(0) : current.dividedBy(target).times(100);

      // Linear extrapolation for forecast
      let forecastCompletionDate: Date | null = null;

      if (progressPercent.lt(100)) {
        const contributions = await prisma.goalContribution.findMany({
          where: { goalId },
          orderBy: { contributedAt: 'asc' },
        });

        if (contributions.length >= 2) {
          const first = contributions[0]!;
          const last = contributions[contributions.length - 1]!;
          const daysDiff = DateTime.fromJSDate(last.contributedAt).diff(
            DateTime.fromJSDate(first.contributedAt),
            'days',
          ).days;

          if (daysDiff > 0) {
            const totalContributed = contributions.reduce(
              (sum, c) => sum.plus(c.amount.toString()),
              new Decimal(0),
            );
            const dailyRate = totalContributed.dividedBy(daysDiff);
            const remaining = target.minus(current);

            if (dailyRate.gt(0)) {
              const daysNeeded = remaining.dividedBy(dailyRate).ceil().toNumber();
              forecastCompletionDate = DateTime.utc().plus({ days: daysNeeded }).toJSDate();
            }
          }
        }
      }

      await prisma.goalSnapshot.create({
        data: {
          goalId,
          progressPercent: progressPercent.toDecimalPlaces(2).toNumber(),
          forecastCompletionDate,
          calculatedAt: new Date(),
        },
      });

      // Auto-complete goal if 100%
      if (progressPercent.gte(100) && goal.status === 'active') {
        await prisma.goal.update({ where: { id: goalId }, data: { status: 'completed' } });
      }
    },
    { connection: getRedis(), concurrency: 5 },
  );
}
