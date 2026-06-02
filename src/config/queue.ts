import { Queue } from 'bullmq';
import { redisConnectionOptions } from './redis';

export const QUEUE_NAMES = {
  BUDGET_SNAPSHOT: 'finance-budget-snapshot',
  GOAL_SNAPSHOT: 'finance-goal-snapshot',
  INSIGHT_ENGINE: 'finance-insight-engine',
  RECOMMENDATION: 'finance-recommendation',
  FINANCIAL_SCORE: 'finance-financial-score',
  STREAK_EVALUATOR: 'finance-streak-evaluator',
  CHALLENGE_EVALUATOR: 'finance-challenge-evaluator',
  NOTIFICATION_DISPATCH: 'finance-notification-dispatch',
  CASHFLOW_FORECAST: 'finance-cashflow-forecast',
  TRANSACTION_CATEGORIZE: 'finance-transaction-categorize',
  ACCOUNT_SYNC: 'finance-account-sync',
  DATA_EXPORT: 'finance-data-export',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const queues = new Map<QueueName, Queue>();

export function getQueue(name: QueueName): Queue {
  if (!queues.has(name)) {
    queues.set(
      name,
      new Queue(name, {
        connection: redisConnectionOptions,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 500 },
        },
      }),
    );
  }
  return queues.get(name)!;
}

export async function closeQueues(): Promise<void> {
  for (const queue of queues.values()) {
    await queue.close();
  }
  queues.clear();
}

// ─── Typed job payloads ───────────────────────────────────────────────────────

export interface BudgetSnapshotJobData {
  budgetId: string;
  userId: string;
}

export interface GoalSnapshotJobData {
  goalId: string;
  userId: string;
}

export interface InsightEngineJobData {
  userId: string;
  triggerType: 'transaction' | 'scheduled';
}

export interface RecommendationJobData {
  userId: string;
}

export interface FinancialScoreJobData {
  userId: string;
}

export interface StreakEvaluatorJobData {
  userId: string;
  streakType: string;
}

export interface ChallengeEvaluatorJobData {
  userId: string;
  userChallengeId: string;
}

export interface NotificationDispatchJobData {
  notificationId: string;
}

export interface CashflowForecastJobData {
  userId: string;
  periodsAhead: number;
}

export interface TransactionCategorizerJobData {
  transactionId: string;
  rawMerchantName: string;
  userId: string;
}

export interface AccountSyncJobData {
  integrationConnectionId: string;
  userId: string;
}
