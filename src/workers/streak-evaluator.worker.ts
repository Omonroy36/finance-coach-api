import { Worker } from 'bullmq';
import { getRedis } from '../config/redis';
import { QUEUE_NAMES } from '../config/queue';
import type { StreakEvaluatorJobData } from '../config/queue';
import { prisma } from '../config/database';
import { DateTime } from 'luxon';

export function createStreakEvaluatorWorker() {
  return new Worker<StreakEvaluatorJobData>(
    QUEUE_NAMES.STREAK_EVALUATOR,
    async (job) => {
      const { userId, streakType } = job.data;
      const now = DateTime.utc();

      const existing = await prisma.streak.findUnique({
        where: { userId_type: { userId, type: streakType } },
      });

      if (!existing) {
        await prisma.streak.create({
          data: {
            userId,
            type: streakType,
            currentCount: 1,
            bestCount: 1,
            lastCompletedAt: now.toJSDate(),
          },
        });
        return;
      }

      const lastCompleted = existing.lastCompletedAt
        ? DateTime.fromJSDate(existing.lastCompletedAt, { zone: 'utc' })
        : null;

      if (!lastCompleted) {
        await prisma.streak.update({
          where: { id: existing.id },
          data: { currentCount: 1, bestCount: 1, lastCompletedAt: now.toJSDate() },
        });
        return;
      }

      const daysSinceLast = now.startOf('day').diff(lastCompleted.startOf('day'), 'days').days;

      let newCount: number;
      if (daysSinceLast === 1) {
        // Consecutive day — increment
        newCount = existing.currentCount + 1;
      } else if (daysSinceLast === 0) {
        // Same day — no change
        return;
      } else {
        // Streak broken
        newCount = 1;
      }

      const newBest = Math.max(newCount, existing.bestCount);
      await prisma.streak.update({
        where: { id: existing.id },
        data: { currentCount: newCount, bestCount: newBest, lastCompletedAt: now.toJSDate() },
      });
    },
    { connection: getRedis(), concurrency: 10 },
  );
}
