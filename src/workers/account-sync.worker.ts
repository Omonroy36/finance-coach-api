import { Worker } from 'bullmq';
import { getRedis } from '../config/redis';
import { QUEUE_NAMES, getQueue } from '../config/queue';
import type { AccountSyncJobData, TransactionCategorizerJobData, InsightEngineJobData } from '../config/queue';
import { prisma } from '../config/database';
import { decrypt } from '../shared/utils/crypto.util';

export function createAccountSyncWorker() {
  return new Worker<AccountSyncJobData>(
    QUEUE_NAMES.ACCOUNT_SYNC,
    async (job) => {
      const { integrationConnectionId, userId } = job.data;

      const connection = await prisma.integrationConnection.findFirst({
        where: { id: integrationConnectionId, userId, status: 'active', deletedAt: null },
      });
      if (!connection) return;

      const _accessToken = decrypt(connection.encryptedAccessToken);
      const meta = connection.metadata as { syncCursor?: string };

      // TODO: call Plaid /transactions/sync with _accessToken + meta.syncCursor
      // For now, simulate with empty response
      const addedTransactions: Array<{
        transaction_id: string;
        amount: number;
        name: string;
        date: string;
        account_id: string;
      }> = [];

      const categorizerQueue = getQueue(QUEUE_NAMES.TRANSACTION_CATEGORIZE);

      for (const plaidTx of addedTransactions) {
        const tx = await prisma.transaction.upsert({
          where: { id: plaidTx.transaction_id },
          create: {
            id: plaidTx.transaction_id,
            userId,
            amount: plaidTx.amount,
            currency: 'USD',
            merchantName: plaidTx.name,
            transactionDate: new Date(plaidTx.date),
            source: 'plaid',
            rawPayload: plaidTx as unknown as object,
          },
          update: {
            amount: plaidTx.amount,
            merchantName: plaidTx.name,
          },
        });

        await categorizerQueue.add('categorize', {
          transactionId: tx.id,
          rawMerchantName: plaidTx.name,
          userId,
        } satisfies TransactionCategorizerJobData);
      }

      // Update sync cursor in connection metadata
      await prisma.integrationConnection.update({
        where: { id: integrationConnectionId },
        data: { metadata: { ...meta, syncCursor: 'new-cursor', lastSyncedAt: new Date().toISOString() } },
      });

      // Trigger insight analysis after sync
      const insightQueue = getQueue(QUEUE_NAMES.INSIGHT_ENGINE);
      await insightQueue.add('insight', { userId, triggerType: 'scheduled' } satisfies InsightEngineJobData);
    },
    { connection: getRedis(), concurrency: 3 },
  );
}
