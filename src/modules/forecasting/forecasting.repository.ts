import { prisma } from '../../config/database';

export class ForecastingRepository {
  async getForecasts(userId: string, periods: string[]) {
    return prisma.cashflowForecast.findMany({
      where: { userId, forecastPeriod: { in: periods } },
      orderBy: { forecastPeriod: 'asc' },
    });
  }

  async getForecast(userId: string, period: string) {
    return prisma.cashflowForecast.findUnique({
      where: { userId_forecastPeriod: { userId, forecastPeriod: period } },
    });
  }

  async upsertForecast(data: {
    userId: string;
    forecastPeriod: string;
    projectedIncome: number;
    projectedExpenses: number;
    projectedSavings: number;
    metadataJson: object;
  }) {
    return prisma.cashflowForecast.upsert({
      where: { userId_forecastPeriod: { userId: data.userId, forecastPeriod: data.forecastPeriod } },
      create: { ...data, metadataJson: data.metadataJson },
      update: { ...data, metadataJson: data.metadataJson },
    });
  }

  // Returns last N months of transactions aggregated per month
  async getMonthlyHistory(userId: string, monthsBack: number) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - monthsBack);

    return prisma.transaction.groupBy({
      by: ['currency'],
      where: { userId, deletedAt: null, transactionDate: { gte: cutoff }, amount: { gt: 0 } },
      _sum: { amount: true },
    });
  }
}
