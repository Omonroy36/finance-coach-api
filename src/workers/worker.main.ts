import 'dotenv/config';
import { closeRedis } from '../config/redis';
import { QUEUE_NAMES, getQueue, closeQueues } from '../config/queue';
import type {
  InsightEngineJobData,
  FinancialScoreJobData,
  CashflowForecastJobData,
} from '../config/queue';
import { prisma } from '../config/database';

// Workers
import { createBudgetSnapshotWorker } from './budget-snapshot.worker';
import { createGoalSnapshotWorker } from './goal-snapshot.worker';
import { createInsightEngineWorker } from './insight-engine.worker';
import { createRecommendationEngineWorker } from './recommendation-engine.worker';
import { createFinancialScoreWorker } from './financial-score.worker';
import { createStreakEvaluatorWorker } from './streak-evaluator.worker';
import { createChallengeEvaluatorWorker } from './challenge-evaluator.worker';
import { createNotificationDispatcherWorker } from './notification-dispatcher.worker';
import { createCashflowForecastWorker } from './cashflow-forecast.worker';
import { createTransactionCategorizerWorker } from './transaction-categorizer.worker';
import { createAccountSyncWorker } from './account-sync.worker';

const workers = [
  createBudgetSnapshotWorker(),
  createGoalSnapshotWorker(),
  createInsightEngineWorker(),
  createRecommendationEngineWorker(),
  createFinancialScoreWorker(),
  createStreakEvaluatorWorker(),
  createChallengeEvaluatorWorker(),
  createNotificationDispatcherWorker(),
  createCashflowForecastWorker(),
  createTransactionCategorizerWorker(),
  createAccountSyncWorker(),
];

workers.forEach((w) => {
  w.on('failed', (job, err) => {
    console.error(`Job ${String(job?.id)} in queue ${w.name} failed:`, err);
  });
});

// ─── Cron-style repeatable jobs ──────────────────────────────────────────────

async function scheduleCronJobs() {
  const insightQueue = getQueue(QUEUE_NAMES.INSIGHT_ENGINE);
  const scoreQueue = getQueue(QUEUE_NAMES.FINANCIAL_SCORE);
  const forecastQueue = getQueue(QUEUE_NAMES.CASHFLOW_FORECAST);
  const accountSyncQueue = getQueue(QUEUE_NAMES.ACCOUNT_SYNC);

  // Daily at 03:00 UTC — insights for all users
  await insightQueue.add(
    'daily-insights',
    { userId: '__all__', triggerType: 'scheduled' } satisfies InsightEngineJobData,
    { repeat: { pattern: '0 3 * * *' }, jobId: 'cron-insights-daily' },
  );

  // Daily at 05:00 UTC — financial score for all users
  await scoreQueue.add(
    'daily-score',
    { userId: '__all__' } satisfies FinancialScoreJobData,
    { repeat: { pattern: '0 5 * * *' }, jobId: 'cron-score-daily' },
  );

  // 1st of each month at 00:30 UTC — cashflow forecasts
  await forecastQueue.add(
    'monthly-forecast',
    { userId: '__all__', periodsAhead: 3 } satisfies CashflowForecastJobData,
    { repeat: { pattern: '30 0 1 * *' }, jobId: 'cron-forecast-monthly' },
  );

  // Daily at 06:00 UTC — account sync for all active connections
  await accountSyncQueue.add(
    'daily-sync',
    { integrationConnectionId: '__all__', userId: '__all__' },
    { repeat: { pattern: '0 6 * * *' }, jobId: 'cron-account-sync-daily' },
  );

  console.log('Cron jobs scheduled.');
}

async function main() {
  console.log('Worker process starting...');
  await scheduleCronJobs();
  console.log(`${workers.length} workers running.`);

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    // Guard against a second signal arriving mid-shutdown (e.g. Cloud Run sends
    // SIGTERM, then SIGKILL after the grace period).
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`Received ${signal}, shutting down workers...`);
    // Close workers first so in-flight jobs finish and no new jobs are picked up,
    // then release the shared Redis connection, queues, and DB pool.
    await Promise.all(workers.map((w) => w.close()));
    await closeQueues();
    await prisma.$disconnect();
    await closeRedis();
    console.log('Worker shutdown complete.');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void main();
