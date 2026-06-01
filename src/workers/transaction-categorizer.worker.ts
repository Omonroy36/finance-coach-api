import { Worker } from 'bullmq';
import { getRedis } from '../config/redis';
import { QUEUE_NAMES, getQueue } from '../config/queue';
import type { TransactionCategorizerJobData, BudgetSnapshotJobData, InsightEngineJobData } from '../config/queue';
import { prisma } from '../config/database';

export function createTransactionCategorizerWorker() {
  return new Worker<TransactionCategorizerJobData>(
    QUEUE_NAMES.TRANSACTION_CATEGORIZE,
    async (job) => {
      const { transactionId, rawMerchantName, userId } = job.data;

      // 1. Exact match in MerchantMapping
      const exactMatch = await prisma.merchantMapping.findUnique({
        where: { rawMerchantName },
        include: { defaultCategory: true },
      });

      let categoryId: string | null = null;
      let normalizedMerchant: string | null = null;

      if (exactMatch) {
        categoryId = exactMatch.defaultCategoryId ?? null;
        normalizedMerchant = exactMatch.normalizedMerchant;
      } else {
        // 2. Fuzzy match via pg_trgm (word_similarity)
        const fuzzy = await prisma.$queryRaw<{ id: string; normalized_merchant: string; default_category_id: string | null; similarity: number }[]>`
          SELECT id, normalized_merchant, default_category_id,
                 word_similarity(${rawMerchantName}, raw_merchant_name) AS similarity
          FROM merchant_mappings
          WHERE word_similarity(${rawMerchantName}, raw_merchant_name) > 0.4
          ORDER BY similarity DESC
          LIMIT 1
        `;

        if (fuzzy.length > 0 && fuzzy[0]) {
          categoryId = fuzzy[0].default_category_id;
          normalizedMerchant = fuzzy[0].normalized_merchant;
        }
      }

      if (categoryId || normalizedMerchant) {
        await prisma.transaction.update({
          where: { id: transactionId },
          data: {
            ...(categoryId && { categoryId }),
            ...(normalizedMerchant && { normalizedMerchant }),
          },
        });

        // Trigger budget snapshot for affected category
        if (categoryId) {
          const budgets = await prisma.budget.findMany({
            where: { userId, categoryId, isActive: true, deletedAt: null },
          });
          const budgetQueue = getQueue(QUEUE_NAMES.BUDGET_SNAPSHOT);
          for (const budget of budgets) {
            await budgetQueue.add('budget-snapshot', { budgetId: budget.id, userId } satisfies BudgetSnapshotJobData);
          }
        }
      }

      // Always trigger insight analysis after new transaction
      const insightQueue = getQueue(QUEUE_NAMES.INSIGHT_ENGINE);
      await insightQueue.add('insight', { userId, triggerType: 'transaction' } satisfies InsightEngineJobData);
    },
    { connection: getRedis(), concurrency: 10 },
  );
}
