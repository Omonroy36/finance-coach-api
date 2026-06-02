import { Worker } from 'bullmq';
import { redisConnectionOptions } from '../config/redis';
import { QUEUE_NAMES } from '../config/queue';
import type { ChallengeEvaluatorJobData } from '../config/queue';
import { prisma } from '../config/database';
import { DateTime } from 'luxon';
import { config } from '../config';

export function createChallengeEvaluatorWorker() {
  return new Worker<ChallengeEvaluatorJobData>(
    QUEUE_NAMES.CHALLENGE_EVALUATOR,
    async (job) => {
      const { userId, userChallengeId } = job.data;

      const uc = await prisma.userChallenge.findFirst({
        where: { id: userChallengeId, userId, status: 'active' },
        include: { challenge: true },
      });
      if (!uc) return;

      const now = DateTime.utc();

      // Check if expired
      if (now > DateTime.fromJSDate(uc.expiresAt)) {
        await prisma.userChallenge.update({
          where: { id: userChallengeId },
          data: { status: 'failed' },
        });
        return;
      }

      const criteria = uc.challenge.criteriaJson as { metric: string; threshold: number; comparator: string; period: string };

      // Evaluate criteria — simplified example for spending-based challenges
      if (criteria.metric === 'no_dining_out') {
        const diningCategory = await prisma.transactionCategory.findFirst({
          where: { OR: [{ name: { contains: 'dining', mode: 'insensitive' } }, { name: { contains: 'restaurant', mode: 'insensitive' } }] },
        });

        if (diningCategory) {
          const spend = await prisma.transaction.aggregate({
            where: {
              userId,
              categoryId: diningCategory.id,
              transactionDate: { gte: uc.startedAt },
              deletedAt: null,
              amount: { gt: 0 },
            },
            _sum: { amount: true },
          });

          const total = spend._sum.amount?.toNumber() ?? 0;
          const met = criteria.comparator === 'lte' ? total <= criteria.threshold : total >= criteria.threshold;
          const progress = { currentValue: total, targetValue: criteria.threshold, unit: 'USD' };

          if (met) {
            await prisma.userChallenge.update({
              where: { id: userChallengeId },
              data: { status: 'completed', completedAt: now.toJSDate(), progress },
            });
          } else {
            await prisma.userChallenge.update({ where: { id: userChallengeId }, data: { progress } });
          }
        }
      }
    },
    { connection: redisConnectionOptions, prefix: config.REDIS_PREFIX, concurrency: 5 },
  );
}
