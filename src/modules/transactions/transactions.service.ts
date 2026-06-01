import { TransactionsRepository } from './transactions.repository';
import { NotFoundError } from '../../shared/errors/not-found.error';
import { buildCursorPage } from '../../shared/utils/pagination.util';
import { getPeriodBounds } from '../../shared/utils/date.util';
import { getQueue, QUEUE_NAMES } from '../../config/queue';
import type { TransactionCategorizerJobData, BudgetSnapshotJobData } from '../../config/queue';
import type { CreateTransactionInput, UpdateTransactionInput, ListTransactionsQuery } from './transactions.schemas';

export class TransactionsService {
  private repo = new TransactionsRepository();

  async list(userId: string, query: ListTransactionsQuery) {
    const items = await this.repo.list(userId, query);
    return buildCursorPage(
      items.map((t) => ({ ...t, createdAt: t.transactionDate })),
      query.limit,
    );
  }

  async getTransaction(userId: string, transactionId: string) {
    const tx = await this.repo.findById(transactionId, userId);
    if (!tx) throw new NotFoundError('Transaction', transactionId);
    return tx;
  }

  async createTransaction(userId: string, input: CreateTransactionInput) {
    const tx = await this.repo.create(userId, input);

    // Trigger background categorization if no category
    if (!input.categoryId && input.merchantName) {
      const queue = getQueue(QUEUE_NAMES.TRANSACTION_CATEGORIZE);
      await queue.add('categorize', {
        transactionId: tx.id,
        rawMerchantName: input.merchantName,
        userId,
      } satisfies TransactionCategorizerJobData);
    } else if (input.categoryId) {
      // Update budget snapshot immediately
      await this.triggerBudgetSnapshot(userId, input.categoryId);
    }

    return tx;
  }

  async updateTransaction(userId: string, transactionId: string, input: UpdateTransactionInput) {
    const tx = await this.repo.findById(transactionId, userId);
    if (!tx) throw new NotFoundError('Transaction', transactionId);

    const updated = await this.repo.update(transactionId, input);

    if (input.categoryId) {
      await this.triggerBudgetSnapshot(userId, input.categoryId);
    }

    return updated;
  }

  async deleteTransaction(userId: string, transactionId: string) {
    const tx = await this.repo.findById(transactionId, userId);
    if (!tx) throw new NotFoundError('Transaction', transactionId);
    await this.repo.softDelete(transactionId);
  }

  async getSummary(userId: string, period: 'week' | 'month' | 'quarter' | 'year') {
    const periodType = period === 'week' ? 'weekly' : 'monthly';
    const { start, end } = getPeriodBounds(periodType);
    return this.repo.getSummaryByCategory(userId, start, end);
  }

  async getRecurring(userId: string) {
    return this.repo.findRecurring(userId);
  }

  private async triggerBudgetSnapshot(userId: string, categoryId: string) {
    // Find active budget for this category
    const { prisma } = await import('../../config/database');
    const budgets = await prisma.budget.findMany({
      where: { userId, categoryId, isActive: true, deletedAt: null },
    });

    const queue = getQueue(QUEUE_NAMES.BUDGET_SNAPSHOT);
    for (const budget of budgets) {
      await queue.add('budget-snapshot', {
        budgetId: budget.id,
        userId,
      } satisfies BudgetSnapshotJobData);
    }
  }
}
