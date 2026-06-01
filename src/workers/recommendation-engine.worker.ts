import { Worker } from 'bullmq';
import { getRedis } from '../config/redis';
import { QUEUE_NAMES } from '../config/queue';
import type { RecommendationJobData } from '../config/queue';
import { prisma } from '../config/database';

export function createRecommendationEngineWorker() {
  return new Worker<RecommendationJobData>(
    QUEUE_NAMES.RECOMMENDATION,
    async (job) => {
      const { userId } = job.data;

      const [criticalInsights, goals] = await Promise.all([
        prisma.insight.findMany({
          where: { userId, severity: { in: ['warning', 'critical'] }, isRead: false },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        prisma.goal.findMany({ where: { userId, status: 'active', deletedAt: null } }),
      ]);

      // Create recommendations from unread critical insights
      for (const insight of criticalInsights) {
        const existing = await prisma.recommendation.findFirst({
          where: { userId, relatedInsightId: insight.id, status: { in: ['pending', 'accepted'] } },
        });
        if (existing) continue;

        await prisma.recommendation.create({
          data: {
            userId,
            relatedInsightId: insight.id,
            title: `Address: ${insight.title}`,
            description: `Based on our analysis: ${insight.description} Consider adjusting your spending habits.`,
            priority: insight.severity === 'critical' ? 90 : 60,
            status: 'pending',
          },
        });
      }

      // Create recommendations for at-risk goals
      for (const goal of goals) {
        if (!goal.targetDate) continue;

        const snapshot = await prisma.goalSnapshot.findFirst({
          where: { goalId: goal.id },
          orderBy: { calculatedAt: 'desc' },
        });

        if (snapshot && snapshot.progressPercent.toNumber() < 25) {
          const existing = await prisma.recommendation.findFirst({
            where: { userId, relatedGoalId: goal.id, status: { in: ['pending', 'accepted'] } },
          });
          if (!existing) {
            await prisma.recommendation.create({
              data: {
                userId,
                relatedGoalId: goal.id,
                title: `Boost progress on: ${goal.title}`,
                description: `Your goal "${goal.title}" is only ${snapshot.progressPercent.toFixed(0)}% complete. Increase contributions to stay on track.`,
                priority: 70,
                status: 'pending',
              },
            });
          }
        }
      }
    },
    { connection: getRedis(), concurrency: 3 },
  );
}
