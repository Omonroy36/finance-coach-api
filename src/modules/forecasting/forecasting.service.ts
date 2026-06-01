import { ForecastingRepository } from './forecasting.repository';
import { NotFoundError } from '../../shared/errors/not-found.error';
import { getQueue, QUEUE_NAMES } from '../../config/queue';
import type { CashflowForecastJobData } from '../../config/queue';
import { DateTime } from 'luxon';

export class ForecastingService {
  private repo = new ForecastingRepository();

  async getForecasts(userId: string, months = 3) {
    const periods: string[] = [];
    const now = DateTime.utc();
    for (let i = 0; i < months; i++) {
      periods.push(now.plus({ months: i }).toFormat('yyyy-MM'));
    }
    return this.repo.getForecasts(userId, periods);
  }

  async getForecastByPeriod(userId: string, period: string) {
    const forecast = await this.repo.getForecast(userId, period);
    if (!forecast) throw new NotFoundError('CashflowForecast');
    return forecast;
  }

  async refreshForecasts(userId: string) {
    const queue = getQueue(QUEUE_NAMES.CASHFLOW_FORECAST);
    const job = await queue.add('cashflow-forecast', {
      userId,
      periodsAhead: 3,
    } satisfies CashflowForecastJobData);
    return { jobId: job.id };
  }

  async getGoalProjection(userId: string, goalId: string) {
    const { prisma } = await import('../../config/database');
    const goal = await prisma.goal.findFirst({ where: { id: goalId, userId, deletedAt: null } });
    if (!goal) throw new NotFoundError('Goal', goalId);

    const remaining = goal.targetAmount.toNumber() - goal.currentAmount.toNumber();
    const snapshot = await prisma.goalSnapshot.findFirst({
      where: { goalId },
      orderBy: { calculatedAt: 'desc' },
    });

    return {
      goalId,
      currentAmount: goal.currentAmount,
      targetAmount: goal.targetAmount,
      remaining,
      forecastCompletionDate: snapshot?.forecastCompletionDate ?? null,
      progressPercent: snapshot?.progressPercent ?? 0,
    };
  }

  async getRunway(userId: string) {
    const { prisma } = await import('../../config/database');
    const [latestScore, forecasts] = await Promise.all([
      prisma.financialScoreSnapshot.findFirst({ where: { userId }, orderBy: { calculatedAt: 'desc' } }),
      this.getForecasts(userId, 3),
    ]);

    const avgMonthlySavings = forecasts.reduce((sum, f) => sum + f.projectedSavings.toNumber(), 0) / Math.max(forecasts.length, 1);
    const avgMonthlyExpenses = forecasts.reduce((sum, f) => sum + f.projectedExpenses.toNumber(), 0) / Math.max(forecasts.length, 1);

    return {
      avgMonthlySavings,
      avgMonthlyExpenses,
      runwayMonths: avgMonthlyExpenses > 0 ? +(avgMonthlySavings / avgMonthlyExpenses * 12).toFixed(1) : null,
      financialScore: latestScore?.score ?? null,
    };
  }
}
