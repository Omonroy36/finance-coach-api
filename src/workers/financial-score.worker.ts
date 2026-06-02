import { Worker } from 'bullmq';
import { redisConnectionOptions } from '../config/redis';
import { QUEUE_NAMES } from '../config/queue';
import type { FinancialScoreJobData } from '../config/queue';
import { prisma } from '../config/database';
import Decimal from 'decimal.js';
import { DateTime } from 'luxon';
import { config } from '../config';

const WEIGHTS = {
  budgetAdherence: 0.30,
  savingsRate: 0.25,
  goalProgress: 0.25,
  spendingConsistency: 0.20,
};

export function createFinancialScoreWorker() {
  return new Worker<FinancialScoreJobData>(
    QUEUE_NAMES.FINANCIAL_SCORE,
    async (job) => {
      const { userId } = job.data;
      const now = DateTime.utc();
      const monthStart = now.startOf('month').toJSDate();
      const monthEnd = now.endOf('month').toJSDate();

      // Budget adherence: % of budgets not exceeded
      const [totalBudgets, exceededBudgets] = await Promise.all([
        prisma.budget.count({ where: { userId, isActive: true, deletedAt: null } }),
        prisma.budgetSnapshot.count({
          where: {
            remainingAmount: { lt: 0 },
            calculatedAt: { gte: monthStart },
            budget: { userId, deletedAt: null },
          },
        }),
      ]);
      const budgetAdherence = totalBudgets > 0
        ? Math.max(0, (totalBudgets - exceededBudgets) / totalBudgets)
        : 0.5;

      // Savings rate: savings / income
      const [income, expenses] = await Promise.all([
        prisma.transaction.aggregate({
          where: { userId, deletedAt: null, transactionDate: { gte: monthStart, lte: monthEnd }, amount: { lt: 0 } },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { userId, deletedAt: null, transactionDate: { gte: monthStart, lte: monthEnd }, amount: { gt: 0 } },
          _sum: { amount: true },
        }),
      ]);
      const incomeAbs = Math.abs(income._sum.amount?.toNumber() ?? 0);
      const expensesTotal = expenses._sum.amount?.toNumber() ?? 0;
      const savingsRate = incomeAbs > 0 ? Math.max(0, Math.min(1, (incomeAbs - expensesTotal) / incomeAbs)) : 0;

      // Goal progress: average progress across active goals
      const activeGoals = await prisma.goal.findMany({
        where: { userId, status: 'active', deletedAt: null },
        include: { snapshots: { orderBy: { calculatedAt: 'desc' }, take: 1 } },
      });
      const goalProgress = activeGoals.length > 0
        ? activeGoals.reduce((sum, g) => sum + (g.snapshots[0]?.progressPercent.toNumber() ?? 0), 0) / activeGoals.length / 100
        : 0.5;

      // Spending consistency: penalize high variance (simplified)
      const spendingConsistency = 0.7; // Placeholder — would need 3-month variance calculation

      const rawScore =
        budgetAdherence * WEIGHTS.budgetAdherence +
        savingsRate * WEIGHTS.savingsRate +
        goalProgress * WEIGHTS.goalProgress +
        spendingConsistency * WEIGHTS.spendingConsistency;

      // Scale to 0-850
      const score = Math.round(new Decimal(rawScore).times(850).toNumber());

      await prisma.financialScoreSnapshot.create({
        data: {
          userId,
          score,
          breakdownJson: {
            budgetAdherence: +(budgetAdherence * 100).toFixed(1),
            savingsRate: +(savingsRate * 100).toFixed(1),
            goalProgress: +(goalProgress * 100).toFixed(1),
            spendingConsistency: +(spendingConsistency * 100).toFixed(1),
            weights: WEIGHTS,
          },
          calculatedAt: new Date(),
        },
      });
    },
    { connection: redisConnectionOptions, prefix: config.REDIS_PREFIX, concurrency: 3 },
  );
}
