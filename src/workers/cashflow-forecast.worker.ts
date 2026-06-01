import { Worker } from 'bullmq';
import { getRedis } from '../config/redis';
import { QUEUE_NAMES } from '../config/queue';
import type { CashflowForecastJobData } from '../config/queue';
import { prisma } from '../config/database';
import Decimal from 'decimal.js';
import { DateTime } from 'luxon';

export function createCashflowForecastWorker() {
  return new Worker<CashflowForecastJobData>(
    QUEUE_NAMES.CASHFLOW_FORECAST,
    async (job) => {
      const { userId, periodsAhead } = job.data;

      const now = DateTime.utc();
      const sixMonthsAgo = now.minus({ months: 6 }).startOf('month').toJSDate();

      // Aggregate 6-month transaction history
      const txHistory = await prisma.transaction.findMany({
        where: { userId, deletedAt: null, transactionDate: { gte: sixMonthsAgo } },
        select: { amount: true, transactionDate: true },
      });

      // Separate income (negative amount) from expenses (positive)
      const monthlyIncome = new Map<string, Decimal>();
      const monthlyExpenses = new Map<string, Decimal>();

      for (const tx of txHistory) {
        const key = DateTime.fromJSDate(tx.transactionDate).toFormat('yyyy-MM');
        const amount = new Decimal(tx.amount.toString());

        if (amount.lt(0)) {
          monthlyIncome.set(key, (monthlyIncome.get(key) ?? new Decimal(0)).plus(amount.abs()));
        } else {
          monthlyExpenses.set(key, (monthlyExpenses.get(key) ?? new Decimal(0)).plus(amount));
        }
      }

      const incomeValues = [...monthlyIncome.values()];
      const expenseValues = [...monthlyExpenses.values()];

      const avgIncome = incomeValues.length > 0
        ? incomeValues.reduce((s, v) => s.plus(v), new Decimal(0)).dividedBy(incomeValues.length)
        : new Decimal(0);

      const avgExpenses = expenseValues.length > 0
        ? expenseValues.reduce((s, v) => s.plus(v), new Decimal(0)).dividedBy(expenseValues.length)
        : new Decimal(0);

      const avgSavings = avgIncome.minus(avgExpenses);
      const confidence = Math.min(incomeValues.length / 6, 1); // 0–1 based on data availability

      for (let i = 0; i < periodsAhead; i++) {
        const period = now.plus({ months: i }).toFormat('yyyy-MM');

        await prisma.cashflowForecast.upsert({
          where: { userId_forecastPeriod: { userId, forecastPeriod: period } },
          create: {
            userId,
            forecastPeriod: period,
            projectedIncome: avgIncome.toDecimalPlaces(2).toNumber(),
            projectedExpenses: avgExpenses.toDecimalPlaces(2).toNumber(),
            projectedSavings: avgSavings.toDecimalPlaces(2).toNumber(),
            metadataJson: { confidence, method: 'moving_avg_6m' },
          },
          update: {
            projectedIncome: avgIncome.toDecimalPlaces(2).toNumber(),
            projectedExpenses: avgExpenses.toDecimalPlaces(2).toNumber(),
            projectedSavings: avgSavings.toDecimalPlaces(2).toNumber(),
            metadataJson: { confidence, method: 'moving_avg_6m' },
            calculatedAt: new Date(),
          },
        });
      }
    },
    { connection: getRedis(), concurrency: 3 },
  );
}
