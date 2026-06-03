import { Worker } from 'bullmq';
import { redisConnectionOptions } from '../config/redis';
import { QUEUE_NAMES, getQueue } from '../config/queue';
import type { AccountSyncJobData, TransactionCategorizerJobData, InsightEngineJobData } from '../config/queue';
import { prisma } from '../config/database';
import { decrypt } from '../shared/utils/crypto.util';
import { config } from '../config';
import * as fintoc from '../shared/utils/fintoc.client';

export function createAccountSyncWorker() {
  return new Worker<AccountSyncJobData>(
    QUEUE_NAMES.ACCOUNT_SYNC,
    async (job) => {
      const { integrationConnectionId, userId } = job.data;

      // Handle the daily "__all__" cron sentinel
      if (integrationConnectionId === '__all__') {
        const connections = await prisma.integrationConnection.findMany({
          where: { status: 'active', deletedAt: null },
        });
        const queue = getQueue(QUEUE_NAMES.ACCOUNT_SYNC);
        for (const conn of connections) {
          await queue.add('account-sync', {
            integrationConnectionId: conn.id,
            userId: conn.userId,
          } satisfies AccountSyncJobData);
        }
        return;
      }

      const connection = await prisma.integrationConnection.findFirst({
        where: { id: integrationConnectionId, userId, status: 'active', deletedAt: null },
      });
      if (!connection) return;

      const linkToken = decrypt(connection.encryptedAccessToken);
      const meta = connection.metadata as { lastSyncedAt?: string; linkId?: string };

      // Fetch accounts for this link
      const accounts = await fintoc.listAccounts(linkToken);
      const categorizerQueue = getQueue(QUEUE_NAMES.TRANSACTION_CATEGORIZE);

      for (const account of accounts) {
        // Determine the date range: from last sync (or 90 days ago) to now
        const since = meta.lastSyncedAt
          ? new Date(meta.lastSyncedAt).toISOString().split('T')[0]
          : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Paginate through all movements
        let page = 1;
        let movements: fintoc.FintocMovement[];

        do {
          movements = await fintoc.listMovements(linkToken, account.id, {
            since,
            per_page: 100,
            page,
          });

          for (const mov of movements) {
            const tx = await prisma.transaction.upsert({
              where: { id: mov.id },
              create: {
                id: mov.id,
                userId,
                amount: mov.amount,
                currency: mov.currency,
                merchantName: mov.description,
                transactionDate: new Date(mov.transaction_date ?? mov.post_date),
                source: 'fintoc',
                rawPayload: mov,
              },
              update: {
                amount: mov.amount,
                merchantName: mov.description,
              },
            });

            await categorizerQueue.add('categorize', {
              transactionId: tx.id,
              rawMerchantName: mov.description,
              userId,
            } satisfies TransactionCategorizerJobData);
          }

          page++;
        } while (movements.length === 100);
      }

      // Update metadata with last sync time
      await prisma.integrationConnection.update({
        where: { id: integrationConnectionId },
        data: {
          metadata: { ...meta, lastSyncedAt: new Date().toISOString() },
        },
      });

      // Trigger insight analysis after sync
      const insightQueue = getQueue(QUEUE_NAMES.INSIGHT_ENGINE);
      await insightQueue.add('insight', { userId, triggerType: 'scheduled' } satisfies InsightEngineJobData);
    },
    { connection: redisConnectionOptions, prefix: config.REDIS_PREFIX, concurrency: 3 },
  );
}
