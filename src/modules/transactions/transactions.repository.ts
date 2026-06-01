import { prisma } from '../../config/database';
import type { Prisma } from '@prisma/client';
import type { ListTransactionsQuery } from './transactions.schemas';

export class TransactionsRepository {
  async list(userId: string, query: ListTransactionsQuery) {
    const where: Prisma.TransactionWhereInput = {
      userId,
      deletedAt: null,
      ...(query.accountId && { financialAccountId: query.accountId }),
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.dateFrom || query.dateTo
        ? {
            transactionDate: {
              ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
              ...(query.dateTo && { lte: new Date(query.dateTo) }),
            },
          }
        : {}),
      ...(query.amountMin !== undefined || query.amountMax !== undefined
        ? {
            amount: {
              ...(query.amountMin !== undefined && { gte: query.amountMin }),
              ...(query.amountMax !== undefined && { lte: query.amountMax }),
            },
          }
        : {}),
      ...(query.search && {
        OR: [
          { merchantName: { contains: query.search, mode: 'insensitive' } },
          { normalizedMerchant: { contains: query.search, mode: 'insensitive' } },
          { notes: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const take = query.limit + 1;

    if (query.cursor) {
      const { id, createdAt } = JSON.parse(Buffer.from(query.cursor, 'base64url').toString()) as {
        id: string;
        createdAt: string;
      };
      (where as Record<string, unknown>)['OR'] = [
        { transactionDate: { lt: new Date(createdAt) } },
        { transactionDate: new Date(createdAt), id: { lt: id } },
      ];
    }

    return prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: [{ transactionDate: 'desc' }, { id: 'desc' }],
      take,
    });
  }

  async findById(id: string, userId: string) {
    return prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
      include: { category: true, financialAccount: true },
    });
  }

  async create(userId: string, data: {
    financialAccountId?: string;
    amount: number;
    currency: string;
    merchantName?: string;
    categoryId?: string;
    transactionDate: string;
    notes?: string;
    source?: string;
  }) {
    return prisma.transaction.create({
      data: {
        userId,
        amount: data.amount,
        currency: data.currency,
        merchantName: data.merchantName,
        categoryId: data.categoryId,
        financialAccountId: data.financialAccountId,
        transactionDate: new Date(data.transactionDate),
        notes: data.notes,
        source: data.source ?? 'manual',
      },
    });
  }

  async update(id: string, data: Partial<{ categoryId: string; notes: string; merchantName: string; isRecurring: boolean }>) {
    return prisma.transaction.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return prisma.transaction.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async getSummaryByCategory(userId: string, from: Date, to: Date) {
    return prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { userId, deletedAt: null, transactionDate: { gte: from, lte: to }, amount: { gt: 0 } },
      _sum: { amount: true },
      _count: true,
    });
  }

  async findRecurring(userId: string) {
    return prisma.transaction.findMany({
      where: { userId, isRecurring: true, deletedAt: null },
      orderBy: { transactionDate: 'desc' },
      distinct: ['normalizedMerchant'],
    });
  }
}
